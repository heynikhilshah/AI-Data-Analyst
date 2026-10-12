import { BaseMessage } from "@langchain/core/messages";

export type IntentType = "query_and_viz" | "query_only" | "conversational";

export type ChartType = "bar" | "line" | "area" | "pie";

export interface ChartSeries {
  key: string;
  label: string;
  color?: string;
}

export interface ChartConfig {
  chartType: ChartType;
  title: string;
  description?: string;
  xAxisKey: string;
  yAxisKeys: ChartSeries[];
  data: Record<string, any>[];
  totalMetric?: {
    label: string;
    value: string | number;
  };
}

export interface AgentStep {
  node: "supervisor" | "sql_agent" | "viz_agent" | "synthesizer";
  label: string;
  status: "pending" | "running" | "completed" | "error";
  detail?: string;
  timestamp: number;
}

export interface AgentState {
  messages: BaseMessage[];
  userQuery: string;
  intent?: IntentType;
  sqlQuery?: string;
  sqlError?: string;
  sqlRetryCount: number;
  queryResults?: Record<string, any>[];
  columns?: string[];
  executionTimeMs?: number;
  chartConfig?: ChartConfig;
  explanation?: string;
  steps: AgentStep[];
}
