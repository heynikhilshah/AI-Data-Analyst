"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Settings,
  Trash2,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Lightbulb,
  Database,
  PanelLeftClose,
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
  onToggleCollapse?: () => void;
}

const SAMPLE_PROMPTS = [
  { text: "Top 5 best-selling artists by total revenue", bg: "bg-[#3f7e68] text-[#e5fb84] hover:bg-[#346b58]" },
  { text: "Monthly sales trends across 2022 to 2025 in a line chart", bg: "bg-[#fdfb9f] text-slate-900 hover:bg-[#f1ef8c]" },
  { text: "Revenue breakdown by music genre in a chart", bg: "bg-[#cdc4fb] text-slate-900 hover:bg-[#bcb2f7]" },
  { text: "Top 10 customers by total spend with their country", bg: "bg-[#f6d2e6] text-slate-900 hover:bg-[#ecc0d9]" },
  { text: "Most popular media types by number of tracks", bg: "bg-[#9996f2] text-slate-900 hover:bg-[#8683ec]" },
];

export function ChatInterface({
  onPinItem,
  activePinnedId,
  onOpenSettings,
  apiKey,
  modelName,
  selectedPrompt,
  onClearSelectedPrompt,
  onToggleCollapse,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
              if (event.finalState?.chartConfig && !currentChartConfig) {
                currentChartConfig = event.finalState.chartConfig;
              }
              if (event.finalState?.explanation && !currentContent) {
                currentContent = event.finalState.explanation;
              }
            } else if (event.type === "error") {
              currentContent = `⚠️ **Error:** ${event.error}`;
            }

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
    <div className="flex flex-col h-full bg-white rounded-[32px] overflow-hidden">
      {/* Top Header with Sticker Pill Branding */}
      <header className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          {/* Black Sticker Pill Badge */}
          <div className="bg-[#0e1017] text-[#f5fd8f] px-3.5 py-1.5 rounded-xl font-black text-xs tracking-tight shadow-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#f5fd8f]" />
            <span>AI Data Analyst</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline font-mono">Chinook SQLite</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={handleClearChat}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-gray-100 transition-colors"
            title="Settings & Connections"
          >
            <Settings className="w-4 h-4" />
          </button>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-gray-100 transition-colors ml-0.5"
              title="Collapse Chat to expand dashboard canvas"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* API Key Warning banner if missing */}
      {!apiKey && (
        <div
          onClick={onOpenSettings}
          className="px-4 py-2 bg-[#fdfb9f] text-slate-900 text-xs flex items-center justify-between cursor-pointer hover:brightness-95 transition-all font-semibold"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
            <span>Google Gemini API Key not set. Click to configure.</span>
          </div>
          <ArrowRight className="w-3 h-3" />
        </div>
      )}

      {/* Message Feed */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-center p-2 text-slate-600 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0e1017] text-[#f5fd8f] flex items-center justify-center shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div className="max-w-sm">
              <h3 className="text-base font-black text-slate-900 mb-1 tracking-tight">
                Ask Any Data Question
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Query Chinook database sales, artists, tracks, and invoices with natural language. Visualizations automatically update on the right.
              </p>
            </div>

            {/* Quick Suggestion Pills matching the reference colors */}
            <div className="w-full max-w-sm pt-2 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left flex items-center gap-1.5 mb-1.5">
                <Lightbulb className="w-3 h-3 text-amber-500" /> Suggested Queries
              </div>
              {SAMPLE_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(prompt.text)}
                  className={`w-full text-left p-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-between group shadow-2xs ${prompt.bg}`}
                >
                  <span className="truncate">{prompt.text}</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity ml-2 flex-shrink-0" />
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
                  <div className="w-8 h-8 rounded-xl bg-[#0e1017] text-[#f5fd8f] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl ${
                    isUser
                      ? "bg-[#0e1017] text-[#f5fd8f] px-4 py-2.5 text-xs font-semibold shadow-xs"
                      : "bg-slate-50 border border-gray-100 p-4 text-xs text-slate-800 shadow-[0_2px_8px_rgb(0,0,0,0.02)]"
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

                      {/* Executive Narrative / Explanation */}
                      {message.content && (
                        <div className="mt-2.5 pt-2 border-t border-gray-100 text-slate-700 leading-relaxed text-xs space-y-1.5 whitespace-pre-wrap">
                          {message.content}
                        </div>
                      )}

                      {/* Streaming Indicator */}
                      {message.isStreaming && !message.content && (
                        <div className="flex items-center gap-2 text-indigo-600 font-medium py-1 text-xs">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
                          <span>Synthesizing SQL and visualizations...</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area (with high-contrast dark pill styling) */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-end gap-2 bg-slate-100 border border-slate-200/80 rounded-2xl p-2 focus-within:bg-white focus-within:border-slate-800 transition-all shadow-2xs"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about sales, top artists, revenue trends..."
            rows={1}
            className="flex-1 bg-transparent border-0 resize-none px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none max-h-32 min-h-[38px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="p-2.5 rounded-xl bg-[#e5fb84] hover:bg-[#d8f065] disabled:opacity-40 text-slate-950 font-black transition-all shadow-xs flex-shrink-0"
            title="Send Message"
          >
            {isStreaming ? (
              <Loader2 className="w-4 h-4 animate-spin text-black" />
            ) : (
              <Send className="w-4 h-4 text-black" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
