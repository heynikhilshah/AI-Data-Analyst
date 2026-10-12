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
    <div className="w-full my-2.5 rounded-2xl border border-gray-100 bg-white overflow-hidden text-xs font-mono shadow-[0_2px_8px_rgb(0,0,0,0.02)]">
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50/80 cursor-pointer select-none hover:bg-gray-100/60 transition-colors border-b border-gray-100"
      >
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-indigo-500" />
          <span className="font-semibold text-slate-800 text-[11px]">SQLite Query</span>
          {retryCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Self-Corrected ({retryCount} {retryCount === 1 ? "retry" : "retries"})
            </span>
          )}
          {sqlError && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Error
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          {rowCount !== undefined && (
            <span className="flex items-center gap-1 text-slate-500">
              <Hash className="w-3 h-3 text-slate-400" />
              <span>{rowCount} rows</span>
            </span>
          )}
          {executionTimeMs !== undefined && (
            <span className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3 text-slate-400" />
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
        <div className="p-3 bg-white space-y-2">
          {sqlError && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-sans">
              <span className="font-semibold">Error:</span> {sqlError}
            </div>
          )}
          <div className="relative">
            <pre className="p-3 bg-slate-900 rounded-xl border border-slate-800 overflow-x-auto text-emerald-400 leading-relaxed text-[11px]">
              <code>{sql}</code>
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1 text-[10px]"
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
