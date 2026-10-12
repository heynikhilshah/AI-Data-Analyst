import os
import json
import asyncio
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from backend.db.chinook import get_db_stats, get_chinook_schema
from backend.agent.graph import create_analyst_graph

app = FastAPI(
    title="InsightPulse BI - Python Multi-Agent Backend",
    version="1.0.0",
    description="LangGraph Python & Gemini powered BI analyst for Chinook SQLite"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    userQuery: Optional[str] = None
    messages: Optional[List[Dict[str, Any]]] = None
    apiKey: Optional[str] = None
    modelName: Optional[str] = "gemini-3.8-flash"

@app.get("/health")
def health_check():
    return {"status": "ok", "backend": "python-fastapi", "langgraph": True}

@app.get("/api/db/stats")
def db_stats():
    stats = get_db_stats()
    schema = get_chinook_schema()
    return {
        "success": True,
        "stats": stats,
        "schema": schema,
    }

@app.post("/api/chat")
async def chat_endpoint(req: ChatRequest):
    query = req.userQuery
    if not query and req.messages:
        last = req.messages[-1]
        query = last.get("content") or last.get("text")

    if not query or not query.strip():
        raise HTTPException(status_code=400, detail="Missing userQuery in request body.")

    api_key = req.apiKey or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=401,
            detail="Google Gemini API Key is required. Please set GOOGLE_API_KEY in .env or enter it in Settings."
        )

    raw_model_name = req.modelName or "gemini-3.8-flash"
    if "pro" in raw_model_name:
        model_name = "gemini-3.8-pro"
    elif "1.5" in raw_model_name or "2.0" in raw_model_name or "2.5" in raw_model_name or "flash" in raw_model_name:
        model_name = "gemini-3.8-flash"
    else:
        model_name = raw_model_name

    async def event_generator():
        def format_sse(data: Dict[str, Any]) -> str:
            return f"data: {json.dumps(data)}\n\n"

        try:
            # Emit starting supervisor step
            yield format_sse({
                "type": "step",
                "step": {
                    "node": "supervisor",
                    "label": "Analyzing Request Intent",
                    "status": "running",
                    "timestamp": 0,
                }
            })

            # Create and invoke LangGraph StateGraph
            graph = create_analyst_graph(api_key=api_key, model_name=model_name)

            initial_state = {
                "user_query": query,
                "messages": [],
                "sql_retry_count": 0,
                "steps": [],
            }

            # Run in thread pool to avoid blocking the event loop
            final_state = await asyncio.to_thread(graph.invoke, initial_state)

            # Stream steps
            for step in final_state.get("steps", []):
                yield format_sse({"type": "step", "step": step})

            # Stream SQL execution result
            if final_state.get("sql_query"):
                yield format_sse({
                    "type": "sql_executed",
                    "sql": final_state["sql_query"],
                    "sqlError": final_state.get("sql_error"),
                    "rowCount": len(final_state.get("query_results") or []),
                    "executionTimeMs": final_state.get("execution_time_ms", 0),
                    "rows": final_state.get("query_results") or [],
                    "columns": final_state.get("columns") or [],
                })

            # Stream Chart configuration
            if final_state.get("chart_config"):
                yield format_sse({
                    "type": "chart_generated",
                    "chartConfig": final_state["chart_config"]
                })

            # Stream narrative explanation
            if final_state.get("explanation"):
                words = final_state["explanation"].split(" ")
                chunk = []
                for i, word in enumerate(words):
                    chunk.append(word)
                    if (i + 1) % 4 == 0 or i == len(words) - 1:
                        yield format_sse({
                            "type": "text_delta",
                            "delta": " ".join(chunk) + " "
                        })
                        chunk = []
                        await asyncio.sleep(0.01)

            # Finish event
            yield format_sse({
                "type": "finish",
                "finalState": {
                    "intent": final_state.get("intent"),
                    "sqlQuery": final_state.get("sql_query"),
                    "sqlError": final_state.get("sql_error"),
                    "rowCount": len(final_state.get("query_results") or []),
                    "columns": final_state.get("columns"),
                    "executionTimeMs": final_state.get("execution_time_ms"),
                    "chartConfig": final_state.get("chart_config"),
                    "explanation": final_state.get("explanation"),
                }
            })

        except Exception as e:
            yield format_sse({
                "type": "error",
                "error": str(e)
            })

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

if __name__ == "__main__":
    import uvicorn
    # reload=False prevents macOS multiprocessing spawn from triggering architecture mismatch
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=False)
