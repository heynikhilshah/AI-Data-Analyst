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
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
      case "sql_agent":
        return <Database className="w-3.5 h-3.5 text-blue-400" />;
      case "viz_agent":
        return <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "synthesizer":
      default:
        return <MessageSquareText className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="w-full my-2.5 p-3 rounded-lg border border-slate-800/80 bg-slate-900/50 text-xs">
      <div className="text-[11px] font-medium text-slate-400 mb-2 flex items-center justify-between">
        <span className="uppercase tracking-wider">LangGraph Execution Pipeline</span>
        {isStreaming && (
          <span className="flex items-center gap-1.5 text-blue-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing</span>
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 p-1.5 rounded bg-slate-950/60 border border-slate-800/40 text-[11px]"
          >
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-slate-900 border border-slate-800">
                {getNodeIcon(step.node)}
              </div>
              <span className="font-medium text-slate-200">{step.label}</span>
              {step.detail && (
                <span className="text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                  • {step.detail}
                </span>
              )}
            </div>

            <div className="flex items-center">
              {step.status === "running" && (
                <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
              )}
              {step.status === "completed" && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
              {step.status === "error" && (
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
