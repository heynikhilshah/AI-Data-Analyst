"use client";

import React, { useState, useMemo } from "react";
import { ChartConfig } from "@/lib/agents/types";
import { DynamicChart } from "./dynamic-chart";
import { DataTable } from "./data-table";
import {
  BarChart3,
  Table as TableIcon,
  Code2,
  TrendingUp,
  Hash,
  Sparkles,
  Layers,
  Database,
  Music,
  DollarSign,
  Maximize2,
  Minimize2,
  Copy,
  Check,
} from "lucide-react";
import { formatCurrency, formatValue } from "@/lib/utils";

export interface PinnedItem {
  id: string;
  title: string;
  chartConfig?: ChartConfig;
  data: Record<string, any>[];
  columns: string[];
  sqlQuery?: string;
  rowCount: number;
  executionTimeMs?: number;
  timestamp: number;
}

interface DashboardCanvasProps {
  pinnedItem: PinnedItem | null;
  onSelectPrompt?: (prompt: string) => void;
  className?: string;
}

export function DashboardCanvas({
  pinnedItem,
  onSelectPrompt,
  className = "",
}: DashboardCanvasProps) {
  const [activeTab, setActiveTab] = useState<"chart" | "table" | "sql">("chart");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  // Compute KPI Cards dynamically from the pinned data
  const kpiStats = useMemo(() => {
    if (!pinnedItem || !pinnedItem.data || pinnedItem.data.length === 0) {
      return null;
    }

    const { data, columns, chartConfig } = pinnedItem;
    const count = data.length;

    // Detect numeric column
    let numericKey = chartConfig?.yAxisKeys?.[0]?.key;
    if (!numericKey) {
      numericKey = columns.find(
        (c) => typeof data[0][c] === "number" && !c.toLowerCase().endsWith("id")
      );
    }

    let sum = 0;
    let avg = 0;
    let maxRow: Record<string, any> | null = null;
    let maxVal = -Infinity;

    if (numericKey) {
      for (const row of data) {
        const val = Number(row[numericKey]) || 0;
        sum += val;
        if (val > maxVal) {
          maxVal = val;
          maxRow = row;
        }
      }
      avg = count > 0 ? sum / count : 0;
    }

    // Detect label key
    const labelKey = chartConfig?.xAxisKey || columns[0] || "Name";
    const topItemLabel = maxRow ? String(maxRow[labelKey] || "Top Item") : null;

    const isRevenue =
      numericKey?.toLowerCase().includes("total") ||
      numericKey?.toLowerCase().includes("sales") ||
      numericKey?.toLowerCase().includes("revenue") ||
      numericKey?.toLowerCase().includes("price");

    return {
      numericKey,
      labelKey,
      count,
      sum: isRevenue ? formatCurrency(sum) : formatValue(sum),
      avg: isRevenue ? formatCurrency(avg) : formatValue(avg),
      topItemLabel,
      topItemVal: isRevenue ? formatCurrency(maxVal) : formatValue(maxVal),
      isRevenue,
    };
  }, [pinnedItem]);

  const handleCopySql = () => {
    if (pinnedItem?.sqlQuery) {
      navigator.clipboard.writeText(pinnedItem.sqlQuery);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  // If no item is pinned yet, show an interactive starter canvas
  if (!pinnedItem) {
    return (
      <div
        className={`h-full flex flex-col justify-between p-6 bg-slate-950/60 border-l border-slate-800/80 overflow-y-auto ${className}`}
      >
        <div className="max-w-xl mx-auto my-auto text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/20 text-white">
            <Sparkles className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-bold text-slate-100 tracking-tight mb-2">
            AI Dashboard Canvas
          </h3>
          <p className="text-sm text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
            Query the Chinook database using natural language. Generated Recharts visualizations and data tables will automatically pin here.
          </p>

          {/* Quick Starter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
            <div
              onClick={() =>
                onSelectPrompt?.("What are the top 5 best-selling artists by total revenue?")
              }
              className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-blue-500/50 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2 mb-1.5 text-blue-400">
                <Music className="w-4 h-4" />
                <span className="text-xs font-semibold">Artist Revenue</span>
              </div>
              <p className="text-xs text-slate-300 font-medium group-hover:text-white">
                "Top 5 best-selling artists by total revenue"
              </p>
            </div>

            <div
              onClick={() =>
                onSelectPrompt?.("Show monthly sales trends across 2022 to 2025 in a line chart")
              }
              className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-emerald-500/50 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2 mb-1.5 text-emerald-400">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold">Revenue Trends</span>
              </div>
              <p className="text-xs text-slate-300 font-medium group-hover:text-white">
                "Monthly sales trends over time"
              </p>
            </div>

            <div
              onClick={() =>
                onSelectPrompt?.("Show revenue breakdown by music genre in a chart")
              }
              className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-purple-500/50 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2 mb-1.5 text-purple-400">
                <Layers className="w-4 h-4" />
                <span className="text-xs font-semibold">Genre Distribution</span>
              </div>
              <p className="text-xs text-slate-300 font-medium group-hover:text-white">
                "Revenue breakdown by music genre"
              </p>
            </div>

            <div
              onClick={() =>
                onSelectPrompt?.("Top 10 customers by total spend with their country")
              }
              className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 hover:border-amber-500/50 cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-2 mb-1.5 text-amber-400">
                <DollarSign className="w-4 h-4" />
                <span className="text-xs font-semibold">VIP Customers</span>
              </div>
              <p className="text-xs text-slate-300 font-medium group-hover:text-white">
                "Top 10 customers by total spend"
              </p>
            </div>
          </div>
        </div>

        {/* Database Footer Status */}
        <div className="pt-4 border-t border-slate-800/60 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span>Connected to local <strong>chinook.db</strong> (11 Tables • SQLite)</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-full flex flex-col bg-slate-950/70 border-l border-slate-800/80 overflow-y-auto ${
        isFullscreen ? "fixed inset-0 z-50 bg-slate-950 p-6" : "p-5"
      } ${className}`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Active Dashboard
            </span>
            <span className="text-xs text-slate-400">
              {new Date(pinnedItem.timestamp).toLocaleTimeString()}
            </span>
          </div>
          <h2 className="text-lg font-bold text-slate-100 tracking-tight mt-1">
            {pinnedItem.title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Tabs */}
          <div className="flex items-center p-1 rounded-lg bg-slate-900 border border-slate-800 text-xs">
            {pinnedItem.chartConfig && (
              <button
                onClick={() => setActiveTab("chart")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === "chart"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Chart</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === "table"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>

            {pinnedItem.sqlQuery && (
              <button
                onClick={() => setActiveTab("sql")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition-all ${
                  activeTab === "sql"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>SQL</span>
              </button>
            )}
          </div>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      {kpiStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
              Total Records
            </span>
            <div className="flex items-baseline gap-1.5">
              <Hash className="w-4 h-4 text-slate-500" />
              <span className="text-xl font-bold text-slate-100 font-mono">
                {kpiStats.count}
              </span>
            </div>
          </div>

          {kpiStats.numericKey && (
            <>
              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Metric Sum ({kpiStats.numericKey})
                </span>
                <span className="text-xl font-bold text-blue-400 font-mono">
                  {kpiStats.sum}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">
                  Average / Row
                </span>
                <span className="text-xl font-bold text-emerald-400 font-mono">
                  {kpiStats.avg}
                </span>
              </div>

              {kpiStats.topItemLabel && (
                <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-sm">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1 truncate">
                    Top ({kpiStats.topItemLabel})
                  </span>
                  <span className="text-xl font-bold text-purple-400 font-mono">
                    {kpiStats.topItemVal}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Main Viewport Content */}
      <div className="flex-1 min-h-[420px]">
        {activeTab === "chart" && pinnedItem.chartConfig && (
          <DynamicChart
            config={pinnedItem.chartConfig}
            height={isFullscreen ? 560 : 420}
          />
        )}

        {activeTab === "table" && (
          <DataTable
            data={pinnedItem.data}
            columns={pinnedItem.columns}
            title={pinnedItem.title}
            defaultPageSize={10}
          />
        )}

        {activeTab === "sql" && pinnedItem.sqlQuery && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/80 text-xs font-mono space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Executed SQLite Query</span>
              <button
                onClick={handleCopySql}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-xs"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 overflow-x-auto leading-relaxed text-sm">
              <code>{pinnedItem.sqlQuery}</code>
            </pre>
            <div className="flex items-center gap-4 text-slate-400 pt-2 text-xs">
              <span>Rows Returned: <strong>{pinnedItem.rowCount}</strong></span>
              {pinnedItem.executionTimeMs !== undefined && (
                <span>Execution Time: <strong>{pinnedItem.executionTimeMs}ms</strong></span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
