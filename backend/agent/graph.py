import re
import json
import time
from typing import Dict, Any, Optional

from langgraph.graph import StateGraph, END
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from backend.agent.state import AgentState
from backend.agent.prompts import (
    SUPERVISOR_PROMPT,
    get_sql_agent_prompt,
    get_sql_fix_prompt,
    VIZ_AGENT_PROMPT,
    SYNTHESIZER_PROMPT,
)
from backend.db.chinook import execute_query, get_chinook_schema

def clean_sql(raw_sql: str) -> str:
    """Extracts raw SQL from markdown code blocks or surrounding text."""
    cleaned = raw_sql.strip()
    match = re.search(r"```(?:sql)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()
    return cleaned.rstrip(";").strip()

def create_analyst_graph(api_key: Optional[str] = None, model_name: str = "gemini-3.8-flash"):
    """
    Constructs and compiles the LangGraph StateGraph in Python.
    """
    if not api_key:
        import os
        api_key = os.getenv("GOOGLE_API_KEY")

    if not api_key:
        raise ValueError("Missing GOOGLE_API_KEY. Please provide an API key in Settings or .env.")

    # Sanitize and migrate deprecated models
    if not model_name:
        model_name = "gemini-3.8-flash"
    elif "pro" in model_name:
        model_name = "gemini-3.8-pro"
    elif "1.5" in model_name or "2.0" in model_name or "2.5" in model_name or "flash" in model_name:
        model_name = "gemini-3.8-flash"

    llm = ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.1,
        max_retries=2,
    )

    schema_text = get_chinook_schema()

    # 1. SUPERVISOR NODE
    def supervisor_node(state: AgentState) -> Dict[str, Any]:
        user_query = state.get("user_query", "")
        step = {
            "node": "supervisor",
            "label": "Analyzing Request Intent",
            "status": "running",
            "timestamp": time.time(),
        }

        try:
            response = llm.invoke([
                SystemMessage(content=SUPERVISOR_PROMPT),
                HumanMessage(content=user_query),
            ])
            content = str(response.content)

            parsed_intent = "query_and_viz"
            match = re.search(r"\{[\s\S]*\}", content)
            if match:
                try:
                    data = json.loads(match.group(0))
                    if data.get("intent") in ["query_and_viz", "query_only", "conversational"]:
                        parsed_intent = data["intent"]
                except Exception:
                    pass

            step["status"] = "completed"
            step["detail"] = f"Classified as {parsed_intent.replace('_', ' ')}"
            return {
                "intent": parsed_intent,
                "steps": [step],
            }
        except Exception as e:
            step["status"] = "error"
            step["detail"] = str(e)
            return {
                "intent": "conversational",
                "steps": [step],
            }

    # 2. SQL AGENT NODE (with Self-Correction)
    def sql_agent_node(state: AgentState) -> Dict[str, Any]:
        user_query = state.get("user_query", "")
        sql_error = state.get("sql_error")
        retry_count = state.get("sql_retry_count", 0)
        is_retry = bool(sql_error and retry_count > 0)

        step = {
            "node": "sql_agent",
            "label": f"Retrying SQL Query (Attempt {retry_count + 1})" if is_retry else "Generating & Executing SQL",
            "status": "running",
            "timestamp": time.time(),
        }

        sql = ""
        try:
            if is_retry and state.get("sql_query") and sql_error:
                response = llm.invoke([
                    SystemMessage(content=get_sql_fix_prompt(schema_text, state["sql_query"], sql_error)),
                    HumanMessage(content=f"Fix SQL query for: {user_query}"),
                ])
                sql = clean_sql(str(response.content))
            else:
                response = llm.invoke([
                    SystemMessage(content=get_sql_agent_prompt(schema_text)),
                    HumanMessage(content=user_query),
                ])
                sql = clean_sql(str(response.content))

            # Execute locally via Python sqlite3
            result = execute_query(sql)

            if not result["success"]:
                step["status"] = "error"
                step["detail"] = f"SQLite Error: {result.get('error')}"
                return {
                    "sql_query": sql,
                    "sql_error": result.get("error"),
                    "sql_retry_count": retry_count + 1,
                    "steps": [step],
                }

            # Success
            step["status"] = "completed"
            step["detail"] = f"Retrieved {result['row_count']} rows in {result['execution_time_ms']}ms"
            return {
                "sql_query": sql,
                "sql_error": None,
                "query_results": result["rows"],
                "columns": result["columns"],
                "execution_time_ms": result["execution_time_ms"],
                "steps": [step],
            }
        except Exception as e:
            step["status"] = "error"
            step["detail"] = str(e)
            return {
                "sql_query": sql or state.get("sql_query"),
                "sql_error": str(e),
                "sql_retry_count": retry_count + 1,
                "steps": [step],
            }

    # Conditional Router for SQL Agent
    def sql_route_condition(state: AgentState) -> str:
        if state.get("sql_error"):
            if state.get("sql_retry_count", 0) < 2:
                return "sql_agent"  # Self-correction loop!
            return "synthesizer"   # Retries exhausted

        if state.get("intent") == "query_and_viz" and state.get("query_results"):
            return "viz_agent"

        return "synthesizer"

    # 3. VISUALIZATION AGENT NODE
    def viz_agent_node(state: AgentState) -> Dict[str, Any]:
        step = {
            "node": "viz_agent",
            "label": "Configuring Recharts Visualization",
            "status": "running",
            "timestamp": time.time(),
        }

        query_results = state.get("query_results") or []
        if not query_results:
            step["status"] = "completed"
            step["detail"] = "No data rows to visualize"
            return {"steps": [step]}

        try:
            sample_rows = query_results[:5]
            prompt_input = (
                f"User Query: \"{state.get('user_query')}\"\n"
                f"SQL Query: {state.get('sql_query')}\n"
                f"Columns: {state.get('columns')}\n"
                f"Sample Rows (up to 5):\n{json.dumps(sample_rows, indent=2)}"
            )

            response = llm.invoke([
                SystemMessage(content=VIZ_AGENT_PROMPT),
                HumanMessage(content=prompt_input),
            ])

            match = re.search(r"\{[\s\S]*\}", str(response.content))
            if not match:
                raise ValueError("Could not parse JSON chart configuration from LLM")

            parsed = json.loads(match.group(0))
            colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"]

            valid_keys = state.get("columns") or []
            x_axis = parsed.get("xAxisKey") if parsed.get("xAxisKey") in valid_keys else (valid_keys[0] if valid_keys else "label")

            y_axis_keys = []
            if isinstance(parsed.get("yAxisKeys"), list):
                for i, item in enumerate(parsed["yAxisKeys"]):
                    key = item.get("key") if item.get("key") in valid_keys else (valid_keys[1] if len(valid_keys) > 1 else valid_keys[0])
                    y_axis_keys.append({
                        "key": key,
                        "label": item.get("label", key),
                        "color": item.get("color", colors[i % len(colors)])
                    })
            else:
                fallback_key = valid_keys[1] if len(valid_keys) > 1 else valid_keys[0]
                y_axis_keys = [{"key": fallback_key, "label": fallback_key, "color": colors[0]}]

            chart_config = {
                "chartType": parsed.get("chartType") if parsed.get("chartType") in ["bar", "line", "area", "pie"] else "bar",
                "title": parsed.get("title", "Data Visualization"),
                "description": parsed.get("description", ""),
                "xAxisKey": x_axis,
                "yAxisKeys": y_axis_keys,
                "data": query_results,
            }

            step["status"] = "completed"
            step["detail"] = f"{chart_config['chartType'].upper()} chart configured ({x_axis} vs {', '.join([k['label'] for k in y_axis_keys])})"
            return {
                "chart_config": chart_config,
                "steps": [step],
            }
        except Exception as e:
            step["status"] = "error"
            step["detail"] = str(e)
            return {"steps": [step]}

    # 4. SYNTHESIZER NODE
    def synthesizer_node(state: AgentState) -> Dict[str, Any]:
        step = {
            "node": "synthesizer",
            "label": "Synthesizing Executive Insights",
            "status": "running",
            "timestamp": time.time(),
        }

        user_query = state.get("user_query", "")

        try:
            if state.get("intent") == "conversational":
                response = llm.invoke([
                    SystemMessage(content="You are a helpful AI Data Analyst assistant for Chinook BI. Answer politely, helpfully, and clearly."),
                    HumanMessage(content=user_query),
                ])
                step["status"] = "completed"
                step["detail"] = "Conversational response generated"
                return {
                    "explanation": str(response.content),
                    "steps": [step],
                }

            if state.get("sql_error"):
                step["status"] = "completed"
                step["detail"] = "Formulated error guidance"
                return {
                    "explanation": (
                        f"I was unable to complete the query after {state.get('sql_retry_count', 1)} attempt(s).\n\n"
                        f"**Database Error:** `{state.get('sql_error')}`\n\n"
                        f"**Attempted SQL:**\n```sql\n{state.get('sql_query')}\n```\n\n"
                        f"*Suggestion:* Try rephrasing your request or asking about specific tables such as **Artist**, **Track**, **Genre**, **Customer**, or **Invoice**."
                    ),
                    "steps": [step],
                }

            query_results = state.get("query_results") or []
            row_summary = f"Result Count: {len(query_results)} records\nSample Data: {json.dumps(query_results[:10])}"
            viz_summary = f"Chart: {state.get('chart_config', {}).get('chartType', 'None')}"

            prompt = (
                f"User Query: \"{user_query}\"\n"
                f"SQL Query Executed: {state.get('sql_query')}\n"
                f"Execution Time: {state.get('execution_time_ms')}ms\n"
                f"Summary:\n{row_summary}\n"
                f"Visualization:\n{viz_summary}"
            )

            response = llm.invoke([
                SystemMessage(content=SYNTHESIZER_PROMPT),
                HumanMessage(content=prompt),
            ])

            step["status"] = "completed"
            step["detail"] = "Executive narrative generated"
            return {
                "explanation": str(response.content),
                "steps": [step],
            }
        except Exception as e:
            step["status"] = "error"
            step["detail"] = str(e)
            return {
                "explanation": f"Here are the results for your query. Found {len(state.get('query_results') or [])} records.",
                "steps": [step],
            }

    # Graph Assembly
    workflow = StateGraph(AgentState)
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("sql_agent", sql_agent_node)
    workflow.add_node("viz_agent", viz_agent_node)
    workflow.add_node("synthesizer", synthesizer_node)

    workflow.set_entry_point("supervisor")

    workflow.add_conditional_edges(
        "supervisor",
        lambda state: "synthesizer" if state.get("intent") == "conversational" else "sql_agent",
    )

    workflow.add_conditional_edges("sql_agent", sql_route_condition)
    workflow.add_edge("viz_agent", "synthesizer")
    workflow.add_edge("synthesizer", END)

    return workflow.compile()
