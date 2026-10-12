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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6 text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Settings & Connections</h3>
              <p className="text-xs text-slate-400">Configure LLM keys and inspect local SQLite database</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Google Gemini API Key */}
        <div className="space-y-2.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              Google Gemini API Key
            </span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
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
              className="w-full pl-3 pr-10 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Alternatively set <code className="text-slate-400">GOOGLE_API_KEY</code> in <code className="text-slate-400">.env.local</code>.
          </p>
        </div>

        {/* Section 2: Model Selection */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            Gemini Model
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSelectModel("gemini-3.8-flash")}
              className={`p-3 rounded-xl border text-left transition-all ${
                modelName === "gemini-3.8-flash"
                  ? "bg-blue-600/20 border-blue-500/50 text-white"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="font-semibold text-xs text-slate-200">gemini-3.8-flash</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Fast, cost-efficient & reliable (Recommended)</div>
            </button>

            <button
              type="button"
              onClick={() => onSelectModel("gemini-3.8-pro")}
              className={`p-3 rounded-xl border text-left transition-all ${
                modelName === "gemini-3.8-pro"
                  ? "bg-blue-600/20 border-blue-500/50 text-white"
                  : "bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              <div className="font-semibold text-xs text-slate-200">gemini-3.8-pro</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Deep reasoning for complex multi-table SQL</div>
            </button>
          </div>
        </div>

        {/* Section 3: Database Status */}
        <div className="space-y-2 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              Chinook SQLite Database
            </label>
            <button
              onClick={fetchDbStats}
              disabled={loadingDb}
              className="text-slate-400 hover:text-slate-200 p-1 rounded transition-colors"
              title="Refresh DB stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDb ? "animate-spin" : ""}`} />
            </button>
          </div>

          {dbStats?.connected ? (
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Connected to chinook.db
                </span>
                <span className="text-[11px] text-slate-500">
                  {dbStats.totalTables} tables • {dbStats.totalRows} rows
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                {dbStats.tables.map((t) => (
                  <span
                    key={t.name}
                    className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                  >
                    {t.name} ({t.rowCount})
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-red-950/20 border border-red-900/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>Database not found. Please run <code className="text-red-200">npm run setup:db</code>.</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-600/20"
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
