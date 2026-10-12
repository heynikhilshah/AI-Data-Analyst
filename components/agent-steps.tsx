"use client";

import React from "react";
import { AgentStep } from "@/lib/agents/types";
import { CheckCircle2, Loader2, AlertCircle, Sparkles, Database, BarChart2, MessageSquareText } from "lucide-react";

interface AgentStepsProps {
  steps: AgentStep[];
  isStreaming?: boolean;
}

export function AgentSteps({ steps = [], isStreaming = false }: AgentStepsProps) {
  if (!steps.length) return null;

  const getNodeIcon = (node: string) => {
    switch (node) {
      case "supervisor":
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
      case "sql_agent":
        return <Database className="w-3.5 h-3.5 text-teal-500" />;
      case "viz_agent":
        return <BarChart2 className="w-3.5 h-3.5 text-rose-500" />;
      case "synthesizer":
      default:
        return <MessageSquareText className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="w-full my-2.5 p-3 rounded-2xl border border-gray-100 bg-white/90 shadow-[0_2px_8px_rgb(0,0,0,0.02)] text-xs">
      <div className="text-[10px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
        <span className="uppercase tracking-wider">LangGraph Execution Pipeline</span>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing</span>
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 p-1.5 px-2.5 rounded-xl bg-gray-50/80 border border-gray-100 text-[11px]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1 rounded-lg bg-white border border-gray-100 shadow-xs flex-shrink-0">
                {getNodeIcon(step.node)}
              </div>
              <span className="font-semibold text-slate-800 truncate">{step.label}</span>
              {step.detail && (
                <span className="text-slate-400 truncate max-w-[180px] sm:max-w-xs text-[10px]">
                  • {step.detail}
                </span>
              )}
            </div>

            <div className="flex items-center flex-shrink-0">
              {step.status === "running" && (
                <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
              )}
              {step.status === "completed" && (
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
              )}
              {step.status === "error" && (
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
