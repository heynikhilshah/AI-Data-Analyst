"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { ChartConfig } from "@/lib/agents/types";
import { formatValue } from "@/lib/utils";
import { Pin, BarChart3, LineChart as LineIcon, PieChart as PieIcon, AreaChart as AreaIcon } from "lucide-react";

interface DynamicChartProps {
  config: ChartConfig;
  onPin?: () => void;
  isPinned?: boolean;
  className?: string;
  height?: number;
}

const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#8b5cf6", // purple
  "#f59e0b", // amber
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#14b8a6", // teal
];

// Custom Tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700/80 p-3 rounded-lg shadow-xl backdrop-blur-md text-xs">
        {label && <p className="font-semibold text-slate-200 mb-1.5 border-b border-slate-800 pb-1">{label}</p>}
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color || entry.fill }}
                />
                <span>{entry.name || entry.dataKey}:</span>
              </span>
              <span className="font-mono font-medium text-slate-100">
                {formatValue(entry.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function DynamicChart({
  config,
  onPin,
  isPinned = false,
  className = "",
  height = 320,
}: DynamicChartProps) {
  const { chartType, title, description, xAxisKey, yAxisKeys, data } = config;

  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-400 bg-slate-900/50 rounded-lg border border-slate-800">
        No data available for visualization.
      </div>
    );
  }

  // Ensure series colors
  const series = (yAxisKeys || []).map((s, i) => ({
    ...s,
    color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
  }));

  // Pie chart data formatting
  const pieData = data.map((item, idx) => ({
    name: String(item[xAxisKey] || `Item ${idx + 1}`),
    value: Number(item[series[0]?.key || Object.keys(item)[1]]) || 0,
    color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }));

  const getChartIcon = () => {
    switch (chartType) {
      case "line":
        return <LineIcon className="w-4 h-4 text-emerald-400" />;
      case "area":
        return <AreaIcon className="w-4 h-4 text-purple-400" />;
      case "pie":
        return <PieIcon className="w-4 h-4 text-amber-400" />;
      case "bar":
      default:
        return <BarChart3 className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className={`w-full rounded-xl border border-slate-800/90 bg-slate-950/80 p-4 shadow-md backdrop-blur-sm ${className}`}>
      {/* Chart Header */}
      <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            {getChartIcon()}
            <h4 className="text-sm font-semibold text-slate-100 tracking-tight">
              {title || "Data Visualization"}
            </h4>
          </div>
          {description && (
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {onPin && (
          <button
            onClick={onPin}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg transition-all ${
              isPinned
                ? "bg-blue-600/30 text-blue-300 border border-blue-500/40"
                : "bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
            title="Pin to Dashboard Canvas"
          >
            <Pin className={`w-3.5 h-3.5 ${isPinned ? "rotate-45 text-blue-400" : ""}`} />
            <span>{isPinned ? "Pinned to Canvas" : "Pin to Canvas"}</span>
          </button>
        )}
      </div>

      {/* Chart Container */}
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "line" ? (
            <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                dy={8}
              />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} dx={-5} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "12px", fontSize: "11px", color: "#94a3b8" }}
              />
              {series.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: s.color }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <defs>
                {series.map((s) => (
                  <linearGradient key={`grad-${s.key}`} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={s.color} stopOpacity={0.4} />
                    <stop offset="95%" stopColor={s.color} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                dy={8}
              />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} dx={-5} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "12px", fontSize: "11px", color: "#94a3b8" }}
              />
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill={`url(#grad-${s.key})`}
                />
              ))}
            </AreaChart>
          ) : chartType === "pie" ? (
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: "12px", fontSize: "11px", color: "#94a3b8" }}
              />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={3}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="#0f172a"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          ) : (
            // Default: Bar Chart
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.6} />
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={11}
                tickLine={false}
                dy={8}
              />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} dx={-5} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "12px", fontSize: "11px", color: "#94a3b8" }}
              />
              {series.map((s) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={55}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
