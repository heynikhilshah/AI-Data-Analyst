"use client";

import React, { useState } from "react";
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
import { ChartConfig, ChartType } from "@/lib/agents/types";
import { formatValue } from "@/lib/utils";
import {
  Pin,
  BarChart3,
  LineChart as LineIcon,
  PieChart as PieIcon,
  AreaChart as AreaIcon,
  X,
} from "lucide-react";

interface DynamicChartProps {
  config: ChartConfig;
  onPin?: () => void;
  onRemove?: () => void;
  isPinned?: boolean;
  className?: string;
  height?: number | string;
  variant?: "default" | "lavender";
  allowTypeSwitch?: boolean;
}

const DEFAULT_COLORS = [
  "#7c5cfc", // luminous purple
  "#3f7e68", // sage forest
  "#f59e0b", // warm amber
  "#f43f5e", // crisp coral
  "#06b6d4", // cyan
  "#9996f2", // periwinkle
  "#8b5cf6", // violet
  "#10b981", // emerald
];

// Custom Tooltip component
const CustomTooltip = ({ active, payload, label, variant }: any) => {
  if (active && payload && payload.length) {
    const first = payload[0];
    return (
      <div className="bg-[#1e2238] text-white px-3.5 py-2 rounded-xl shadow-2xl text-xs font-bold border border-white/10 flex items-center gap-2.5 z-50">
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: first.color || first.fill || "#7c5cfc" }}
        />
        <div className="flex flex-col">
          {label && <span className="text-[10px] text-slate-300 font-medium">{label}</span>}
          <span className="font-mono text-sm text-white">
            {formatValue(first.value)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function DynamicChart({
  config,
  onPin,
  onRemove,
  isPinned = false,
  className = "",
  height = "100%",
  variant = "lavender",
  allowTypeSwitch = true,
}: DynamicChartProps) {
  const [activeType, setActiveType] = useState<ChartType>(config.chartType || "bar");
  const { title, description, xAxisKey, yAxisKeys, data } = config;

  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-sm text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800 flex items-center justify-center h-full">
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
  const pieData = data.slice(0, 8).map((item, idx) => ({
    name: String(item[xAxisKey] || `Item ${idx + 1}`),
    value: Number(item[series[0]?.key || Object.keys(item)[1]]) || 0,
    color: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }));

  const isLavender = variant === "lavender";

  // Calculate smart X-axis interval to prevent text collisions
  const tickInterval = data.length > 10 ? Math.ceil(data.length / 7) - 1 : 0;

  // Smart date / string formatter for XAxis
  const formatXAxisTick = (val: any) => {
    if (!val) return "";
    const str = String(val);
    if (/^\d{4}-\d{2}/.test(str)) {
      const parts = str.split("-");
      const year = parts[0].slice(2);
      const monthNum = parseInt(parts[1], 10);
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[monthNum - 1]} '${year}`;
    }
    return str.length > 12 ? `${str.slice(0, 10)}…` : str;
  };

  return (
    <div
      className={`w-full h-full flex flex-col ${
        isLavender
          ? "bg-transparent p-0 border-0 shadow-none"
          : "rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)]"
      } ${className}`}
    >
      {/* Chart Top Controls: Type Switcher & Action Badges */}
      {allowTypeSwitch && (
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-black/5 flex-shrink-0">
          {/* Chart Type Selector Pills */}
          <div className="flex items-center gap-1 bg-black/5 p-0.5 rounded-xl text-[10px]">
            <button
              onClick={() => setActiveType("bar")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all ${
                activeType === "bar"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Bar Chart"
            >
              <BarChart3 className="w-3 h-3 text-[#7c5cfc]" />
              <span>Bar</span>
            </button>
            <button
              onClick={() => setActiveType("line")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all ${
                activeType === "line"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Line Chart"
            >
              <LineIcon className="w-3 h-3 text-[#3f7e68]" />
              <span>Line</span>
            </button>
            <button
              onClick={() => setActiveType("area")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all ${
                activeType === "area"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Area Wave Chart"
            >
              <AreaIcon className="w-3 h-3 text-[#7c5cfc]" />
              <span>Area</span>
            </button>
            <button
              onClick={() => setActiveType("pie")}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg font-bold transition-all ${
                activeType === "pie"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
              title="Donut / Pie Chart"
            >
              <PieIcon className="w-3 h-3 text-[#f43f5e]" />
              <span>Pie</span>
            </button>
          </div>

          <div className="flex items-center gap-1">
            {onPin && (
              <button
                onClick={onPin}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  isPinned
                    ? "bg-[#7c5cfc] text-white"
                    : "bg-black/5 hover:bg-black/10 text-slate-700"
                }`}
                title="Pin to Dashboard"
              >
                <Pin className={`w-3 h-3 ${isPinned ? "rotate-45" : ""}`} />
                <span>{isPinned ? "Pinned" : "Pin"}</span>
              </button>
            )}

            {onRemove && (
              <button
                onClick={onRemove}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                title="Remove chart"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Responsive Chart Container */}
      <div className="flex-1 w-full min-h-[140px]" style={{ height: typeof height === "number" ? height : "100%" }}>
        <ResponsiveContainer width="100%" height="100%">
          {activeType === "bar" ? (
            /* Bar Chart */
            <BarChart data={data} margin={{ top: 10, right: 15, left: 0, bottom: 10 }}>
              {!isLavender && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={11}
                fontWeight={500}
                tickLine={false}
                axisLine={false}
                dy={6}
                interval={tickInterval}
                minTickGap={20}
                tickFormatter={formatXAxisTick}
              />
              {!isLavender && <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} dx={-5} />}
              <Tooltip content={<CustomTooltip variant={variant} />} />
              {series.map((s, idx) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  fill={s.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          ) : activeType === "line" ? (
            /* Line Chart */
            <LineChart data={data} margin={{ top: 12, right: 15, left: 4, bottom: 8 }}>
              {!isLavender && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={11}
                fontWeight={500}
                tickLine={false}
                axisLine={false}
                dy={6}
                interval={tickInterval}
                minTickGap={24}
                tickFormatter={formatXAxisTick}
              />
              {!isLavender && <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} dx={-5} />}
              <Tooltip content={<CustomTooltip variant={variant} />} />
              {series.map((s, idx) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color || "#7c5cfc"}
                  strokeWidth={3}
                  dot={{ r: 3, fill: s.color || "#7c5cfc" }}
                  activeDot={{ r: 6, stroke: "#7c5cfc", strokeWidth: 3, fill: "#ffffff" }}
                />
              ))}
            </LineChart>
          ) : activeType === "area" ? (
            /* Area Chart */
            <AreaChart data={data} margin={{ top: 12, right: 15, left: 4, bottom: 8 }}>
              <defs>
                <linearGradient id="chartWaveGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7c5cfc" stopOpacity={0.45} />
                  <stop offset="60%" stopColor="#7c5cfc" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#7c5cfc" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              {!isLavender && <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />}
              <XAxis
                dataKey={xAxisKey}
                stroke="#64748b"
                fontSize={11}
                fontWeight={500}
                tickLine={false}
                axisLine={false}
                dy={6}
                interval={tickInterval}
                minTickGap={24}
                tickFormatter={formatXAxisTick}
              />
              {!isLavender && <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} dx={-5} />}
              <Tooltip content={<CustomTooltip variant={variant} />} />
              {series.map((s) => (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color || "#7c5cfc"}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#chartWaveGrad)"
                  activeDot={{
                    r: 6,
                    stroke: "#7c5cfc",
                    strokeWidth: 3,
                    fill: "#ffffff",
                  }}
                />
              ))}
            </AreaChart>
          ) : (
            /* Pie / Donut Chart */
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Tooltip content={<CustomTooltip variant={variant} />} />
              <Legend
                layout="horizontal"
                verticalAlign="bottom"
                wrapperStyle={{ paddingTop: "6px", fontSize: "11px", color: "#64748b" }}
              />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="46%"
                innerRadius={42}
                outerRadius={75}
                paddingAngle={3}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke="#ffffff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
