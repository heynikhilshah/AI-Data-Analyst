"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Key,
  Database,
  Cpu,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { DbStats } from "@/lib/db/chinook";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
  modelName: string;
  onSelectModel: (model: string) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
  modelName,
  onSelectModel,
}: SettingsModalProps) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const [loadingDb, setLoadingDb] = useState(false);

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey]);

  const fetchDbStats = async () => {
    setLoadingDb(true);
    try {
      const res = await fetch("/api/db/stats");
      const data = await res.json();
      if (data.success) {
        setDbStats(data.stats);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDbStats();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputKey.trim());
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-gray-100 bg-white p-6 md:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.1)] space-y-6 text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-100/80 text-indigo-600 shadow-xs">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">Settings & Connections</h3>
              <p className="text-xs text-slate-500">Configure LLM keys and inspect local SQLite database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-gray-100/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Google Gemini API Key */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-indigo-500" />
              Google Gemini API Key
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
            >
              Get API Key <ExternalLink className="w-3 h-3" />
            </a>
          </label>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 text-xs bg-gray-50 border border-gray-200/80 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-mono transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Alternatively set <code className="text-slate-600 font-mono bg-gray-100 px-1 py-0.5 rounded">GOOGLE_API_KEY</code> in <code className="text-slate-600 font-mono bg-gray-100 px-1 py-0.5 rounded">.env.local</code>.
          </p>
        </div>

        {/* Section 2: Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            Gemini Model
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onSelectModel("gemini-3.8-flash")}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                modelName === "gemini-3.8-flash"
                  ? "bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-500/20 text-indigo-900"
                  : "bg-gray-50/70 border-gray-100 text-slate-600 hover:bg-gray-100/60"
              }`}
            >
              <div className="font-semibold text-xs text-slate-900">gemini-3.8-flash</div>
              <div className="text-[10px] text-slate-500 mt-1 leading-snug">Fast, cost-efficient & reliable (Recommended)</div>
            </button>

            <button
              type="button"
              onClick={() => onSelectModel("gemini-3.8-pro")}
              className={`p-3.5 rounded-2xl border text-left transition-all ${
                modelName === "gemini-3.8-pro"
                  ? "bg-indigo-50/70 border-indigo-200 ring-1 ring-indigo-500/20 text-indigo-900"
                  : "bg-gray-50/70 border-gray-100 text-slate-600 hover:bg-gray-100/60"
              }`}
            >
              <div className="font-semibold text-xs text-slate-900">gemini-3.8-pro</div>
              <div className="text-[10px] text-slate-500 mt-1 leading-snug">Deep reasoning for complex multi-table SQL</div>
            </button>
          </div>
        </div>

        {/* Section 3: Database Status */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-teal-500" />
              Chinook SQLite Database
            </label>
            <button
              onClick={fetchDbStats}
              disabled={loadingDb}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors"
              title="Refresh DB stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? "animate-spin text-teal-600" : ""}`} />
            </button>
          </div>

          {dbStats?.connected ? (
            <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-gray-100 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-teal-600 font-semibold text-xs">
                  <span className="w-2 h-2 rounded-full bg-teal-500" />
                  Connected to chinook.db
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  {dbStats.totalTables} tables • {dbStats.totalRows} rows
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {dbStats.tables.map((t) => (
                  <span
                    key={t.name}
                    className="px-2 py-0.5 rounded-lg bg-white border border-gray-200/60 text-[10px] font-mono text-slate-700 shadow-2xs"
                  >
                    {t.name} ({t.rowCount})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
              <span>Database not found. Please run <code className="text-rose-900 font-semibold">npm run setup:db</code>.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-2xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-gray-100/70 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-sm hover:shadow-indigo-500/25"
          >
            {savedSuccess ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Saved!</span>
              </>
            ) : (
              <span>Save Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
