"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Settings,
  Trash2,
  Database,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { AgentStep, ChartConfig } from "@/lib/agents/types";
import { DynamicChart } from "./dynamic-chart";
import { DataTable } from "./data-table";
import { SqlInspector } from "./sql-inspector";
import { AgentSteps } from "./agent-steps";
import { PinnedItem } from "./dashboard-canvas";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  steps?: AgentStep[];
  sqlQuery?: string;
  sqlError?: string;
  sqlRetryCount?: number;
  rowCount?: number;
  executionTimeMs?: number;
  rows?: Record<string, any>[];
  columns?: string[];
  chartConfig?: ChartConfig;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  onPinItem: (item: PinnedItem) => void;
  activePinnedId?: string;
  onOpenSettings: () => void;
  apiKey: string;
  modelName: string;
  selectedPrompt?: string;
  onClearSelectedPrompt?: () => void;
}

const SAMPLE_PROMPTS = [
  "Top 5 best-selling artists by total revenue",
  "Monthly sales trends across 2022 to 2025 in a line chart",
  "Revenue breakdown by music genre in a chart",
  "Top 10 customers by total spend with their country",
  "Most popular media types by number of tracks",
];

export function ChatInterface({
  onPinItem,
  activePinnedId,
  onOpenSettings,
  apiKey,
  modelName,
  selectedPrompt,
  onClearSelectedPrompt,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle starter prompt selected from canvas
  useEffect(() => {
    if (selectedPrompt && !isStreaming) {
      sendMessage(selectedPrompt);
      onClearSelectedPrompt?.();
    }
  }, [selectedPrompt, isStreaming]);

  const sendMessage = async (queryText?: string) => {
    const text = (queryText || input).trim();
    if (!text || isStreaming) return;

    setInput("");

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    const newMessages: ChatMessage[] = [
      ...messages,
      {
        id: userMessageId,
        role: "user",
        content: text,
      },
      {
        id: assistantMessageId,
        role: "assistant",
        content: "",
        steps: [
          {
            node: "supervisor",
            label: "Analyzing Request Intent",
            status: "running",
            timestamp: Date.now(),
          },
        ],
        isStreaming: true,
      },
    ];

    setMessages(newMessages);
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userQuery: text,
          apiKey,
          modelName,
          messages: newMessages.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to communicate with analyst agent.");
      }

      if (!response.body) {
        throw new Error("No response body received from server.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      let currentSteps: AgentStep[] = [];
      let currentSql: string | undefined;
      let currentSqlError: string | undefined;
      let currentRows: Record<string, any>[] | undefined;
      let currentCols: string[] | undefined;
      let currentRowCount = 0;
      let currentExecTime = 0;
      let currentChartConfig: ChartConfig | undefined;
      let currentContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.replace("data: ", "").trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === "step") {
              const step = event.step as AgentStep;
              const existingIdx = currentSteps.findIndex((s) => s.node === step.node);
              if (existingIdx >= 0) {
                currentSteps[existingIdx] = step;
              } else {
                currentSteps.push(step);
              }
            } else if (event.type === "sql_executed") {
              currentSql = event.sql;
              currentSqlError = event.sqlError;
              currentRows = event.rows;
              currentCols = event.columns;
              currentRowCount = event.rowCount;
              currentExecTime = event.executionTimeMs;
            } else if (event.type === "chart_generated") {
              currentChartConfig = event.chartConfig;

              // Automatically pin new chart to the Dashboard Canvas!
              if (event.chartConfig && currentRows) {
                onPinItem({
                  id: assistantMessageId,
                  title: event.chartConfig.title,
                  chartConfig: event.chartConfig,
                  data: currentRows,
                  columns: currentCols || [],
                  sqlQuery: currentSql,
                  rowCount: currentRowCount,
                  executionTimeMs: currentExecTime,
                  timestamp: Date.now(),
                });
              }
            } else if (event.type === "text_delta") {
              currentContent += event.delta;
            } else if (event.type === "finish") {
              // Final state received
              if (event.finalState?.chartConfig && !currentChartConfig) {
                currentChartConfig = event.finalState.chartConfig;
              }
              if (event.finalState?.explanation && !currentContent) {
                currentContent = event.finalState.explanation;
              }
            } else if (event.type === "error") {
              currentContent = `⚠️ **Error:** ${event.error}`;
            }

            // Update UI state
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      content: currentContent,
                      steps: [...currentSteps],
                      sqlQuery: currentSql,
                      sqlError: currentSqlError,
                      rows: currentRows,
                      columns: currentCols,
                      rowCount: currentRowCount,
                      executionTimeMs: currentExecTime,
                      chartConfig: currentChartConfig,
                    }
                  : msg
              )
            );
          } catch (e) {
            console.error("Error parsing SSE event:", e);
          }
        }
      }

      // Mark streaming completed
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                isStreaming: false,
              }
            : msg
        )
      );

      // If we got rows but no chart, pin the table!
      if (currentRows && currentRows.length > 0 && !currentChartConfig) {
        onPinItem({
          id: assistantMessageId,
          title: `Query Results (${currentRows.length} rows)`,
          data: currentRows,
          columns: currentCols || [],
          sqlQuery: currentSql,
          rowCount: currentRowCount,
          executionTimeMs: currentExecTime,
          timestamp: Date.now(),
        });
      }
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `⚠️ **Execution Error:** ${err.message || "Failed to process request."}`,
                isStreaming: false,
              }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 tracking-tight">
              InsightPulse BI
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Chinook DB • SQLite</span>
              <span className="text-slate-600">•</span>
              <span className="font-mono text-slate-400">{modelName}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-900 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
            title="Settings & Connections"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* API Key Warning banner if missing */}
      {!apiKey && (
        <div
          onClick={onOpenSettings}
          className="px-4 py-2 bg-amber-950/40 border-b border-amber-900/60 text-amber-300 text-xs flex items-center justify-between cursor-pointer hover:bg-amber-950/60 transition-colors"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Google Gemini API Key is not set. Click here to configure.</span>
          </div>
          <ArrowRight className="w-3 h-3 text-amber-400" />
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-6 text-slate-400 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-blue-400">
              <Bot className="w-6 h-6" />
            </div>
            <div className="max-w-sm">
              <h3 className="text-base font-semibold text-slate-200 mb-1">
                AI Data Analyst Ready
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ask any question about Chinook music sales, customer demographics, top tracks, or monthly revenue.
              </p>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="w-full max-w-md pt-2 space-y-1.5">
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider text-left flex items-center gap-1 mb-2">
                <Lightbulb className="w-3 h-3 text-amber-400" /> Suggested Queries
              </div>
              {SAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(prompt)}
                  className="w-full text-left p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900 hover:border-blue-500/40 text-xs text-slate-300 hover:text-white transition-all flex items-center justify-between group"
                >
                  <span className="truncate">{prompt}</span>
                  <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 text-blue-400 transition-opacity ml-2 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl ${
                    isUser
                      ? "bg-blue-600 text-white px-4 py-2.5 text-xs shadow-sm"
                      : "bg-slate-900/60 border border-slate-800/80 p-4 text-xs text-slate-200 shadow-sm"
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  ) : (
                    <div className="space-y-3">
                      {/* LangGraph Node Pipeline Stepper */}
                      {message.steps && message.steps.length > 0 && (
                        <AgentSteps
                          steps={message.steps}
                          isStreaming={message.isStreaming}
                        />
                      )}

                      {/* Executed SQL Inspector */}
                      {message.sqlQuery && (
                        <SqlInspector
                          sql={message.sqlQuery}
                          rowCount={message.rowCount}
                          executionTimeMs={message.executionTimeMs}
                          retryCount={message.sqlRetryCount}
                          sqlError={message.sqlError}
                        />
                      )}

                      {/* Generative UI: DynamicChart Component */}
                      {message.chartConfig && (
                        <DynamicChart
                          config={message.chartConfig}
                          isPinned={activePinnedId === message.id}
                          onPin={() =>
                            onPinItem({
                              id: message.id,
                              title: message.chartConfig!.title,
                              chartConfig: message.chartConfig,
                              data: message.rows || [],
                              columns: message.columns || [],
                              sqlQuery: message.sqlQuery,
                              rowCount: message.rowCount || 0,
                              executionTimeMs: message.executionTimeMs,
                              timestamp: Date.now(),
                            })
                          }
                        />
                      )}

                      {/* Generative UI: DataTable Component */}
                      {message.rows && message.rows.length > 0 && (
                        <DataTable
                          data={message.rows}
                          columns={message.columns}
                          sql={message.sqlQuery}
                          isPinned={activePinnedId === message.id}
                          onPin={() =>
                            onPinItem({
                              id: message.id,
                              title: `Query Results (${message.rows!.length} rows)`,
                              data: message.rows!,
                              columns: message.columns || [],
                              sqlQuery: message.sqlQuery,
                              rowCount: message.rowCount || 0,
                              executionTimeMs: message.executionTimeMs,
                              timestamp: Date.now(),
                            })
                          }
                        />
                      )}

                      {/* Executive Narrative / Explanation */}
                      {message.content && (
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 text-slate-200 leading-relaxed text-xs space-y-1.5 whitespace-pre-wrap">
                          {message.content}
                        </div>
                      )}

                      {/* Streaming Indicator */}
                      {message.isStreaming && !message.content && (
                        <div className="flex items-center gap-2 text-slate-400 py-1 text-xs">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                          <span>Generating analysis and charts...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-end gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1.5 focus-within:border-blue-500/80 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about the Chinook database (e.g. Top 5 artists by revenue)..."
            rows={1}
            className="flex-1 bg-transparent border-0 resize-none px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none max-h-32 min-h-[36px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all flex-shrink-0"
            title="Send Message"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
