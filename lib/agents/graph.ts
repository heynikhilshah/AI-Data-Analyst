import { Annotation, StateGraph, END } from "@langchain/langgraph";
import { BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {
  SUPERVISOR_PROMPT,
  SQL_AGENT_PROMPT,
  SQL_FIX_PROMPT,
  VIZ_AGENT_PROMPT,
  SYNTHESIZER_PROMPT,
} from "./prompts";
import { AgentStep, ChartConfig, IntentType } from "./types";
import { executeQuery, getChinookSchema } from "../db/chinook";

export const AgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  userQuery: Annotation<string>({
    reducer: (_, y) => y,
    default: () => "",
  }),
  intent: Annotation<IntentType | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  sqlQuery: Annotation<string | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  sqlError: Annotation<string | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  sqlRetryCount: Annotation<number>({
    reducer: (_, y) => y,
    default: () => 0,
  }),
  queryResults: Annotation<Record<string, any>[] | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  columns: Annotation<string[] | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  executionTimeMs: Annotation<number | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  chartConfig: Annotation<ChartConfig | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  explanation: Annotation<string | undefined>({
    reducer: (_, y) => y,
    default: () => undefined,
  }),
  steps: Annotation<AgentStep[]>({
    reducer: (x, y) => [...x, ...y],
    default: () => [],
  }),
});

export type AgentStateType = typeof AgentStateAnnotation.State;

export interface GraphOptions {
  apiKey?: string;
  modelName?: string;
}

/**
 * Utility to extract clean SQL from LLM string output
 */
function cleanSqlString(raw: string): string {
  let cleaned = raw.trim();
  // Strip ```sql and ``` blocks
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:sql)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }
  // Strip trailing semicolons
  return cleaned.replace(/;+$/, "").trim();
}

/**
 * Creates and compiles the LangGraph StateGraph instance.
 */
export function createDataAnalystGraph(options: GraphOptions = {}) {
  const apiKey = options.apiKey || process.env.GOOGLE_API_KEY;
  let modelName = options.modelName || "gemini-3.8-flash";

  // Automatically migrate deprecated 1.5/2.0/2.5 models to supported 3.8 models
  if (modelName.includes("pro")) {
    modelName = "gemini-3.8-pro";
  } else if (
    modelName.includes("1.5") ||
    modelName.includes("2.0") ||
    modelName.includes("2.5") ||
    modelName.includes("flash")
  ) {
    modelName = "gemini-3.8-flash";
  }

  if (!apiKey) {
    throw new Error(
      "Missing Google Gemini API Key. Please provide GOOGLE_API_KEY in .env.local or via Settings."
    );
  }

  const llm = new ChatGoogleGenerativeAI({
    apiKey,
    model: modelName,
    temperature: 0.1,
    maxRetries: 2,
  });

  const schemaText = getChinookSchema();

  // 1. SUPERVISOR NODE
  const supervisorNode = async (state: AgentStateType) => {
    const step: AgentStep = {
      node: "supervisor",
      label: "Analyzing Request Intent",
      status: "running",
      timestamp: Date.now(),
    };

    try {
      const response = await llm.invoke([
        new SystemMessage(SUPERVISOR_PROMPT),
        new HumanMessage(state.userQuery),
      ]);

      const content = String(response.content);
      let parsedIntent: IntentType = "query_and_viz";

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (["query_and_viz", "query_only", "conversational"].includes(parsed.intent)) {
            parsedIntent = parsed.intent;
          }
        }
      } catch {
        // Fallback heuristic
        if (state.userQuery.toLowerCase().includes("chart") || state.userQuery.toLowerCase().includes("top") || state.userQuery.toLowerCase().includes("revenue")) {
          parsedIntent = "query_and_viz";
        } else {
          parsedIntent = "query_only";
        }
      }

      step.status = "completed";
      step.detail = `Classified as ${parsedIntent.replace(/_/g, " ")}`;

      return {
        intent: parsedIntent,
        steps: [step],
      };
    } catch (err: any) {
      step.status = "error";
      step.detail = err?.message || "Failed supervisor analysis";
      return {
        intent: "conversational" as IntentType,
        steps: [step],
      };
    }
  };

  // 2. SQL AGENT NODE with Self-Correction
  const sqlAgentNode = async (state: AgentStateType) => {
    const isRetry = Boolean(state.sqlError && state.sqlRetryCount > 0);
    const step: AgentStep = {
      node: "sql_agent",
      label: isRetry ? `Retrying SQL Query (Attempt ${state.sqlRetryCount + 1})` : "Generating & Executing SQL",
      status: "running",
      timestamp: Date.now(),
    };

    let sql = "";
    try {
      if (isRetry && state.sqlQuery && state.sqlError) {
        // Feed error back to LLM for self-correction
        const response = await llm.invoke([
          new SystemMessage(SQL_FIX_PROMPT(schemaText, state.sqlQuery, state.sqlError)),
          new HumanMessage(`Please fix the SQL for: "${state.userQuery}"`),
        ]);
        sql = cleanSqlString(String(response.content));
      } else {
        const response = await llm.invoke([
          new SystemMessage(SQL_AGENT_PROMPT(schemaText)),
          new HumanMessage(state.userQuery),
        ]);
        sql = cleanSqlString(String(response.content));
      }

      // Execute query locally on Chinook SQLite DB
      const result = await executeQuery(sql);

      if (!result.success) {
        step.status = "error";
        step.detail = `SQLite Error: ${result.error}`;
        return {
          sqlQuery: sql,
          sqlError: result.error,
          sqlRetryCount: state.sqlRetryCount + 1,
          steps: [step],
        };
      }

      // Query succeeded!
      step.status = "completed";
      step.detail = `Retrieved ${result.rowCount} rows in ${result.executionTimeMs}ms`;

      return {
        sqlQuery: sql,
        sqlError: undefined,
        queryResults: result.rows,
        columns: result.columns,
        executionTimeMs: result.executionTimeMs,
        steps: [step],
      };
    } catch (err: any) {
      step.status = "error";
      step.detail = err?.message || "SQL generation failed";
      return {
        sqlQuery: sql || state.sqlQuery,
        sqlError: err?.message || "Unknown error during SQL stage",
        sqlRetryCount: state.sqlRetryCount + 1,
        steps: [step],
      };
    }
  };

  // 3. VISUALIZATION AGENT NODE
  const vizAgentNode = async (state: AgentStateType) => {
    const step: AgentStep = {
      node: "viz_agent",
      label: "Configuring Recharts Visualization",
      status: "running",
      timestamp: Date.now(),
    };

    if (!state.queryResults || state.queryResults.length === 0) {
      step.status = "completed";
      step.detail = "No data rows to visualize";
      return { steps: [step] };
    }

    try {
      const sampleRows = state.queryResults.slice(0, 5);
      const promptText = `User Query: "${state.userQuery}"
SQL Query: ${state.sqlQuery}
Columns: ${JSON.stringify(state.columns)}
Sample Rows (up to 5):
${JSON.stringify(sampleRows, null, 2)}`;

      const response = await llm.invoke([
        new SystemMessage(VIZ_AGENT_PROMPT),
        new HumanMessage(promptText),
      ]);

      const content = String(response.content);
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Invalid visualization JSON output from LLM");
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Color palette for charts
      const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#06b6d4"];

      const validKeys = state.columns || [];
      const xAxisKey = validKeys.includes(parsed.xAxisKey)
        ? parsed.xAxisKey
        : validKeys[0] || "label";

      const yAxisKeys = Array.isArray(parsed.yAxisKeys)
        ? parsed.yAxisKeys.map((s: any, i: number) => ({
            key: validKeys.includes(s.key) ? s.key : validKeys[1] || validKeys[0],
            label: s.label || s.key,
            color: s.color || colors[i % colors.length],
          }))
        : [
            {
              key: validKeys[1] || validKeys[0],
              label: validKeys[1] || "Value",
              color: colors[0],
            },
          ];

      const chartConfig: ChartConfig = {
        chartType: ["bar", "line", "area", "pie"].includes(parsed.chartType)
          ? parsed.chartType
          : "bar",
        title: parsed.title || "Data Analysis Overview",
        description: parsed.description || "",
        xAxisKey,
        yAxisKeys,
        data: state.queryResults,
      };

      step.status = "completed";
      step.detail = `${chartConfig.chartType.toUpperCase()} chart configured (${xAxisKey} vs ${yAxisKeys.map((k: { label: string }) => k.label).join(", ")})`;

      return {
        chartConfig,
        steps: [step],
      };
    } catch (err: any) {
      step.status = "error";
      step.detail = `Viz error: ${err?.message}`;
      return {
        steps: [step],
      };
    }
  };

  // 4. SYNTHESIZER NODE
  const synthesizerNode = async (state: AgentStateType) => {
    const step: AgentStep = {
      node: "synthesizer",
      label: "Synthesizing Executive Insights",
      status: "running",
      timestamp: Date.now(),
    };

    try {
      if (state.intent === "conversational") {
        const response = await llm.invoke([
          new SystemMessage(
            "You are a helpful AI Data Analyst assistant for Chinook Music Store BI Dashboard. Answer clearly and informatively."
          ),
          new HumanMessage(state.userQuery),
        ]);
        step.status = "completed";
        step.detail = "Conversational response generated";
        return {
          explanation: String(response.content),
          steps: [step],
        };
      }

      if (state.sqlError) {
        step.status = "completed";
        step.detail = "Formulated error guidance";
        return {
          explanation: `I was unable to complete the query after ${state.sqlRetryCount} attempt(s).\n\n**Database Error:** \`${state.sqlError}\`\n\n**Attempted SQL:**\n\`\`\`sql\n${state.sqlQuery}\n\`\`\`\n\n*Suggestion:* Try rephrasing your request or asking about specific tables such as **Artist**, **Track**, **Genre**, **Customer**, or **Invoice**.`,
          steps: [step],
        };
      }

      const rowSummary = state.queryResults
        ? `Result Count: ${state.queryResults.length} records\nData: ${JSON.stringify(state.queryResults.slice(0, 10))}`
        : "No records found.";

      const vizSummary = state.chartConfig
        ? `Chart Type: ${state.chartConfig.chartType}, Title: ${state.chartConfig.title}`
        : "No chart generated.";

      const prompt = `User Query: "${state.userQuery}"
SQL Query Executed: ${state.sqlQuery}
Execution Time: ${state.executionTimeMs}ms
Summary:
${rowSummary}
Visualization:
${vizSummary}`;

      const response = await llm.invoke([
        new SystemMessage(SYNTHESIZER_PROMPT),
        new HumanMessage(prompt),
      ]);

      step.status = "completed";
      step.detail = "Executive narrative generated";

      return {
        explanation: String(response.content),
        steps: [step],
      };
    } catch (err: any) {
      step.status = "error";
      step.detail = err?.message || "Synthesis failed";
      return {
        explanation: `Here are the results for your query. Found ${state.queryResults?.length || 0} records.`,
        steps: [step],
      };
    }
  };

  // StateGraph definition
  const workflow = new StateGraph(AgentStateAnnotation)
    .addNode("supervisor", supervisorNode)
    .addNode("sql_agent", sqlAgentNode)
    .addNode("viz_agent", vizAgentNode)
    .addNode("synthesizer", synthesizerNode)

    // Flow start: Supervisor
    .addEdge("__start__", "supervisor")

    // Conditional routing from Supervisor
    .addConditionalEdges("supervisor", (state) => {
      if (state.intent === "conversational") {
        return "synthesizer";
      }
      return "sql_agent";
    })

    // Conditional routing from SQL Agent: check error retry loop vs success
    .addConditionalEdges("sql_agent", (state) => {
      // If error and we haven't reached max retries (2 retries), loop back to SQL Agent!
      if (state.sqlError) {
        if (state.sqlRetryCount < 2) {
          return "sql_agent";
        }
        return "synthesizer"; // Max retries exceeded, explain error gracefully
      }

      // Query succeeded: should we visualize?
      if (state.intent === "query_and_viz" && state.queryResults && state.queryResults.length > 0) {
        return "viz_agent";
      }

      return "synthesizer";
    })

    // Edge from Viz Agent to Synthesizer
    .addEdge("viz_agent", "synthesizer")

    // Edge from Synthesizer to END
    .addEdge("synthesizer", END);

  return workflow.compile();
}
