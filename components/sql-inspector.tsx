"use client";

import React, { useState } from "react";
import { Check, Copy, Database, Clock, Hash, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

interface SqlInspectorProps {
  sql: string;
  rowCount?: number;
  executionTimeMs?: number;
  retryCount?: number;
  sqlError?: string;
  defaultOpen?: boolean;
}

export function SqlInspector({
  sql,
  rowCount,
  executionTimeMs,
  retryCount = 0,
  sqlError,
  defaultOpen = false,
}: SqlInspectorProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full my-3 rounded-lg border border-slate-800 bg-slate-950/80 text-slate-200 overflow-hidden text-xs font-mono shadow-sm">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900/90 cursor-pointer select-none hover:bg-slate-900 transition-colors border-b border-slate-800/60"
      >
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-slate-300">SQLite Query</span>
          {retryCount > 0 && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
              Self-Corrected ({retryCount} {retryCount === 1 ? "retry" : "retries"})
            </span>
          )}
          {sqlError && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-950 text-red-400 border border-red-800 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Error
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {rowCount !== undefined && (
            <span className="flex items-center gap-1 text-slate-400">
              <Hash className="w-3 h-3 text-slate-500" />
              <span>{rowCount} rows</span>
            </span>
          )}
          {executionTimeMs !== undefined && (
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{executionTimeMs}ms</span>
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="p-3 bg-slate-950/95 space-y-2">
          {sqlError && (
            <div className="p-2 rounded bg-red-950/40 border border-red-900/60 text-red-300 text-xs font-sans">
              <span className="font-semibold">Error:</span> {sqlError}
            </div>
          )}
          <div className="relative">
            <pre className="p-3 bg-slate-900/70 rounded border border-slate-800/80 overflow-x-auto text-emerald-400 leading-relaxed text-[11px]">
              <code>{sql}</code>
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[10px]"
              title="Copy SQL"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
