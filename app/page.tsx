"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ChatInterface } from "@/components/chat-interface";
import { DynamicChart } from "@/components/dynamic-chart";
import { DataTable } from "@/components/data-table";
import { SettingsModal } from "@/components/settings-modal";
import { PinnedItem } from "@/components/dashboard-canvas";
import { ChartConfig } from "@/lib/agents/types";
import {
  Heart,
  Database,
  Table as TableIcon,
  Sparkles,
  ArrowUpRight,
  Zap,
  TrendingUp,
  LayoutGrid,
  BarChart3,
  SlidersHorizontal,
  Settings,
  Plus,
  Layers,
  PieChart as PieIcon,
  Maximize2,
  Award,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { formatCurrency, formatValue } from "@/lib/utils";

// Default starter dashboard charts (Time Series + Volume)
const DEFAULT_REVENUE_CHART: ChartConfig = {
  chartType: "area",
  title: "Monthly Sales Trend (2022 - 2025)",
  description: "Continuous revenue progression across Chinook music sales",
  xAxisKey: "month",
  yAxisKeys: [{ key: "revenue", label: "Monthly Revenue ($)", color: "#7c5cfc" }],
  data: [
    { month: "Jan", revenue: 410, volume: 45 },
    { month: "Feb", revenue: 495, volume: 52 },
    { month: "Mar", revenue: 380, volume: 39 },
    { month: "Apr", revenue: 520, volume: 58 },
    { month: "May", revenue: 640, volume: 68 },
    { month: "Jun", revenue: 780, volume: 82 },
    { month: "Jul", revenue: 610, volume: 64 },
    { month: "Aug", revenue: 730, volume: 76 },
    { month: "Sep", revenue: 890, volume: 94 },
  ],
};

const DEFAULT_VOLUME_CHART: ChartConfig = {
  chartType: "bar",
  title: "Monthly Transaction Volume",
  description: "Total invoice transaction count per billing period",
  xAxisKey: "month",
  yAxisKeys: [{ key: "volume", label: "Transactions", color: "#3f7e68" }],
  data: DEFAULT_REVENUE_CHART.data,
};

type QueryIntent = "time_series" | "ranking" | "composition" | "general";

// Detect user data request type to dynamically re-organize dashboard cards
function detectQueryIntent(
  userQuery: string = "",
  columns: string[] = [],
  data: Record<string, any>[] = []
): QueryIntent {
  const q = userQuery.toLowerCase();

  // Time-series cues
  if (
    q.includes("trend") ||
    q.includes("month") ||
    q.includes("year") ||
    q.includes("time") ||
    q.includes("daily") ||
    columns.some((c) => /date|month|year|day|time/i.test(c))
  ) {
    return "time_series";
  }

  // Ranking cues
  if (
    q.includes("top") ||
    q.includes("best") ||
    q.includes("highest") ||
    q.includes("worst") ||
    q.includes("ranking") ||
    q.includes("leader")
  ) {
    return "ranking";
  }

  // Composition cues
  if (
    q.includes("genre") ||
    q.includes("breakdown") ||
    q.includes("share") ||
    q.includes("distribution") ||
    q.includes("type") ||
    q.includes("country")
  ) {
    return "composition";
  }

  return "general";
}

// Generates dynamic complementary dashboard charts tailored to user request
function deriveDashboardCharts(
  primaryConfig: ChartConfig,
  rows: Record<string, any>[],
  columns: string[],
  intent: QueryIntent
): ChartConfig[] {
  const charts: ChartConfig[] = [primaryConfig];
  if (!rows || rows.length === 0) return charts;

  // Identify numeric and categorical columns
  const numericCols = columns.filter((col) =>
    rows.some((r) => typeof r[col] === "number" && !col.toLowerCase().endsWith("id"))
  );

  const catCol =
    primaryConfig.xAxisKey ||
    columns.find((c) => typeof rows[0][c] === "string") ||
    columns[0];

  const primaryNum = primaryConfig.yAxisKeys[0]?.key;
  const secondaryNum = numericCols.find((c) => c !== primaryNum);

  if (intent === "time_series") {
    // For time-series: pair trend with volume distribution
    if (secondaryNum) {
      charts.push({
        chartType: "bar",
        title: `${secondaryNum} Volume Trend`,
        description: `Periodic distribution of ${secondaryNum}`,
        xAxisKey: catCol,
        yAxisKeys: [{ key: secondaryNum, label: secondaryNum, color: "#3f7e68" }],
        data: rows,
      });
    } else {
      charts.push({
        chartType: "bar",
        title: `Period Comparison (${catCol})`,
        description: `Comparative period analysis`,
        xAxisKey: catCol,
        yAxisKeys: primaryConfig.yAxisKeys,
        data: rows.slice(-8),
      });
    }
  } else if (intent === "ranking") {
    // For ranking: pair leaderboard bar with proportional share donut
    charts.push({
      chartType: "pie",
      title: `Top ${catCol} Share of Total`,
      description: `Proportional distribution among top performers`,
      xAxisKey: catCol,
      yAxisKeys: primaryConfig.yAxisKeys,
      data: rows.slice(0, 7),
    });
  } else if (intent === "composition") {
    // For composition: pair distribution donut with ranking bar
    if (primaryConfig.chartType === "pie") {
      charts.push({
        chartType: "bar",
        title: `Comparative ${primaryNum || "Volume"} Ranking`,
        description: `Ranked magnitude by ${catCol}`,
        xAxisKey: catCol,
        yAxisKeys: primaryConfig.yAxisKeys,
        data: rows.slice(0, 8),
      });
    } else {
      charts.push({
        chartType: "pie",
        title: `Share Breakdown by ${catCol}`,
        description: `Proportional market share distribution`,
        xAxisKey: catCol,
        yAxisKeys: primaryConfig.yAxisKeys,
        data: rows.slice(0, 8),
      });
    }
  } else {
    // General queries: provide complementary distribution if multi-metric
    if (secondaryNum) {
      charts.push({
        chartType: "bar",
        title: `${secondaryNum} Distribution`,
        description: `Comparative volume by ${catCol}`,
        xAxisKey: catCol,
        yAxisKeys: [{ key: secondaryNum, label: secondaryNum, color: "#10b981" }],
        data: rows,
      });
    }
  }

  return charts;
}

export default function Home() {
  const [pinnedItem, setPinnedItem] = useState<PinnedItem | null>(null);
  const [dashboardCharts, setDashboardCharts] = useState<ChartConfig[]>([
    DEFAULT_REVENUE_CHART,
    DEFAULT_VOLUME_CHART,
  ]);
  const [activeIntent, setActiveIntent] = useState<QueryIntent>("time_series");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [modelName, setModelName] = useState("gemini-3.8-flash");
  const [selectedPrompt, setSelectedPrompt] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<"dashboard" | "table">("dashboard");
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);

  // Load saved settings
  useEffect(() => {
    try {
      const savedKey = localStorage.getItem("chinook_gemini_api_key");
      if (savedKey) setApiKey(savedKey);

      let savedModel = localStorage.getItem("chinook_gemini_model");
      if (savedModel) {
        if (savedModel.includes("pro")) {
          savedModel = "gemini-3.8-pro";
        } else {
          savedModel = "gemini-3.8-flash";
        }
        localStorage.setItem("chinook_gemini_model", savedModel);
        setModelName(savedModel);
      }
    } catch {}
  }, []);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    try {
      localStorage.setItem("chinook_gemini_api_key", key);
    } catch {}
  };

  const handleSelectModel = (model: string) => {
    setModelName(model);
    try {
      localStorage.setItem("chinook_gemini_model", model);
    } catch {}
  };

  // Dynamically re-organize cards and charts as per user's data request
  const handlePinItem = (item: PinnedItem) => {
    setPinnedItem(item);
    if (item.chartConfig && item.data) {
      const intent = detectQueryIntent(item.title, item.columns, item.data);
      setActiveIntent(intent);
      const newCharts = deriveDashboardCharts(item.chartConfig, item.data, item.columns, intent);
      setDashboardCharts(newCharts);
    }
  };

  const handleRemoveChart = (index: number) => {
    setDashboardCharts((prev) => prev.filter((_, i) => i !== index));
  };

  // Dynamic Genuine Business KPIs (Never Technical Debug Telemetry)
  const businessKpis = useMemo(() => {
    if (!pinnedItem || !pinnedItem.data || pinnedItem.data.length === 0) {
      return {
        kpi1Value: "$2,328.60",
        kpi1Label: "All-Time Revenue",
        kpi1Sub: "Total Chinook sales volume",
        kpi2Value: "$46.08 / mo",
        kpi2Label: "Monthly Run-Rate",
        kpi2Sub: "Benchmark periodic average",
        kpi3Value: "Rock (35.9%)",
        kpi3Label: "#1 Dominant Genre",
        kpi3Sub: "Catalog revenue leader",
      };
    }

    const { data, columns, chartConfig } = pinnedItem;
    const count = data.length;

    // Identify primary numerical column
    let numKey = chartConfig?.yAxisKeys?.[0]?.key;
    if (!numKey) {
      numKey = columns.find(
        (c) => typeof data[0][c] === "number" && !c.toLowerCase().endsWith("id")
      );
    }

    // Identify label / category column
    const labelKey =
      chartConfig?.xAxisKey ||
      columns.find((c) => typeof data[0][c] === "string") ||
      columns[0];

    const isCurrency =
      numKey?.toLowerCase().includes("total") ||
      numKey?.toLowerCase().includes("revenue") ||
      numKey?.toLowerCase().includes("sales") ||
      numKey?.toLowerCase().includes("price");

    let sum = 0;
    let maxVal = -Infinity;
    let maxRow: Record<string, any> | null = null;

    if (numKey) {
      for (const row of data) {
        const v = Number(row[numKey]) || 0;
        sum += v;
        if (v > maxVal) {
          maxVal = v;
          maxRow = row;
        }
      }
    }

    const avg = count > 0 ? sum / count : 0;
    const maxLabel = maxRow ? String(maxRow[labelKey] || "Top Record") : "Peak";

    const isDate =
      labelKey.toLowerCase().includes("date") ||
      labelKey.toLowerCase().includes("month") ||
      labelKey.toLowerCase().includes("year");

    // KPI 1: Total Aggregate Volume
    const kpi1Value = isCurrency ? formatCurrency(sum) : formatValue(sum);
    const kpi1Label = isCurrency ? "Total Sales Volume" : `Total ${numKey || "Volume"}`;
    const kpi1Sub = `Aggregated across ${count} records`;

    // KPI 2: Benchmark Average Run-Rate
    const kpi2Value = isCurrency
      ? `${formatCurrency(avg)}${isDate ? " / mo" : " avg"}`
      : `${formatValue(avg)} avg`;
    const kpi2Label = isDate ? "Average Run-Rate" : `Mean ${numKey || "Average"}`;
    const kpi2Sub = `Benchmark per ${labelKey}`;

    // KPI 3: Peak High Watermark or Top Performer
    const kpi3Value = maxRow
      ? `${maxLabel} (${isCurrency ? formatCurrency(maxVal) : formatValue(maxVal)})`
      : "N/A";
    const kpi3Label = isDate ? "Peak Watermark" : "#1 Top Performer";
    const kpi3Sub = `Highest individual contribution`;

    return {
      kpi1Value,
      kpi1Label,
      kpi1Sub,
      kpi2Value,
      kpi2Label,
      kpi2Sub,
      kpi3Value,
      kpi3Label,
      kpi3Sub,
    };
  }, [pinnedItem]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0c0d10] text-slate-900 flex flex-col p-3 sm:p-4 md:p-5 select-none sm:select-auto">
      {/* ========================================================================= */}
      {/* 1. TOP BRANDING & NAVIGATION BAR                                          */}
      {/* ========================================================================= */}
      <header className="w-full max-w-[1560px] mx-auto mb-3 flex items-center justify-between px-4 py-2.5 bg-[#14161c] border border-white/10 rounded-2xl shadow-sm flex-shrink-0">
        {/* Brand Identity & Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7c5cfc] to-[#9996f2] flex items-center justify-center text-white shadow-md shadow-[#7c5cfc]/20">
            <Sparkles className="w-4 h-4 text-white" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black tracking-tight text-white font-sans">
                InsightPulse BI
              </span>
              <span className="text-xs font-bold text-slate-500">•</span>
              <span className="text-xs font-bold text-slate-300 tracking-tight">
                AI Data Analyst
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block font-medium">
              Autonomous Conversational Text-to-SQL for Chinook Database
            </p>
          </div>
        </div>

        {/* Center Status Badges */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-[11px]">Chinook SQLite</span>
            <span className="text-slate-500 font-mono text-[10px]">11 tables • 3,503 rows</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-mono text-[11px]">
            <span className="text-[#f5fd8f]">✦</span>
            <span>{modelName}</span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2">
          {/* Collapse/Expand Chat Toggle Button */}
          <button
            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all ${
              isChatCollapsed
                ? "bg-[#7c5cfc]/20 border-[#7c5cfc]/50 text-[#f5fd8f] hover:bg-[#7c5cfc]/30 shadow-xs"
                : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
            }`}
            title={isChatCollapsed ? "Expand Chat Interface" : "Collapse Chat to expand canvas"}
          >
            {isChatCollapsed ? (
              <>
                <PanelLeftOpen className="w-3.5 h-3.5 text-[#f5fd8f]" />
                <span>Expand Chat</span>
              </>
            ) : (
              <>
                <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Collapse Chat</span>
              </>
            )}
          </button>

          {/* Segmented View Mode Switcher */}
          <div className="bg-black/60 p-1 rounded-xl border border-white/10 flex items-center text-xs">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                activeTab === "dashboard"
                  ? "bg-[#7c5cfc] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Dynamic Multi-Chart Dashboard"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dashboard ({dashboardCharts.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("table")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-bold text-[11px] transition-all ${
                activeTab === "table"
                  ? "bg-[#7c5cfc] text-white shadow-xs"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Raw SQLite Data Table"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Data Table</span>
            </button>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors"
            title="Database & Model Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN BENTO GRID CONTAINER WITH COLLAPSIBLE CHAT                        */}
      {/* ========================================================================= */}
      <div className="flex-1 w-full max-w-[1560px] mx-auto min-h-0 flex flex-col lg:flex-row gap-3.5 sm:gap-4 overflow-hidden">
        {/* ======================================================================= */}
        {/* LEFT COLUMN: COLLAPSIBLE / EXPANDABLE CHAT INTERFACE                    */}
        {/* ======================================================================= */}
        {/* Expanded Full-Featured Chat UI (Kept mounted to preserve message history & streaming state) */}
        <section
          className={`w-full lg:w-[410px] xl:w-[430px] flex-shrink-0 h-full min-h-[460px] lg:min-h-0 bg-white rounded-[28px] shadow-sm border border-white/10 overflow-hidden flex-col transition-all duration-300 ease-in-out ${
            isChatCollapsed ? "hidden" : "flex"
          }`}
        >
          <ChatInterface
            onPinItem={handlePinItem}
            activePinnedId={pinnedItem?.id}
            onOpenSettings={() => setIsSettingsOpen(true)}
            apiKey={apiKey}
            modelName={modelName}
            selectedPrompt={selectedPrompt}
            onClearSelectedPrompt={() => setSelectedPrompt(undefined)}
            onToggleCollapse={() => setIsChatCollapsed(true)}
          />
        </section>

        {/* Sleek Collapsed Vertical Rail (Visible only when chat is collapsed) */}
        <aside
          className={`flex-shrink-0 bg-[#14161c] rounded-[28px] border border-white/10 shadow-sm transition-all duration-300 ease-in-out select-none w-full lg:w-14 xl:w-16 lg:h-full flex lg:flex-col items-center justify-between p-3 lg:py-4 lg:px-2.5 ${
            isChatCollapsed ? "flex" : "hidden"
          }`}
        >
          {/* Top Expand Trigger */}
          <button
            onClick={() => setIsChatCollapsed(false)}
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-[#7c5cfc] hover:text-white text-[#f5fd8f] flex items-center justify-center transition-all shadow-xs group"
            title="Expand Chat Interface"
          >
            <PanelLeftOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>

          {/* Middle Vertical Pill Label */}
          <div
            onClick={() => setIsChatCollapsed(false)}
            className="my-auto py-2 lg:py-6 flex flex-row lg:flex-col items-center gap-3 cursor-pointer group"
            title="Click to open Chat"
          >
            <div className="w-8 h-8 rounded-xl bg-[#7c5cfc]/20 border border-[#7c5cfc]/40 flex items-center justify-center text-[#7c5cfc] group-hover:scale-110 transition-transform">
              <Sparkles className="w-4 h-4 text-[#f5fd8f]" />
            </div>
            <span className="hidden lg:block [writing-mode:vertical-rl] text-[11px] font-black tracking-widest text-slate-400 group-hover:text-white uppercase transition-colors">
              AI Chat Analyst
            </span>
            <span className="lg:hidden text-xs font-black tracking-wider text-slate-400 group-hover:text-white uppercase">
              Expand Chat Analyst
            </span>
          </div>

          {/* Bottom Status Beacon */}
          <div className="flex flex-col items-center gap-1.5" title="Connected to SQLite">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </aside>

        {/* ======================================================================= */}
        {/* RIGHT COLUMN: DYNAMIC ANALYTICS & DASHBOARD (STRETCHES DYNAMICALLY)     */}
        {/* ======================================================================= */}
        <section className="flex-1 min-w-0 h-full min-h-0 flex flex-col gap-3.5 transition-all duration-300 ease-in-out">
          {/* Top Row: 3 Genuine Business KPI Cards (Zero Text Overflow, Pure Business Value) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4 flex-shrink-0">
            {/* KPI 1: Emerald Green Card (Total Aggregate Volume) */}
            <div className="bg-[#3f7e68] text-[#e5fb84] rounded-[24px] p-4 sm:p-4.5 flex flex-col justify-between overflow-hidden shadow-sm min-h-[96px] transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-2xl sm:text-3xl font-black text-[#e5fb84] tracking-tight leading-none truncate">
                  {businessKpis.kpi1Value}
                </span>
                <Heart className="w-4 h-4 text-[#e5fb84] fill-[#e5fb84] flex-shrink-0" />
              </div>
              <div className="mt-1 min-w-0">
                <h4 className="text-xs font-bold text-[#e5fb84] leading-tight truncate">
                  {businessKpis.kpi1Label}
                </h4>
                <p className="text-[10px] text-[#e5fb84]/80 truncate mt-0.5">{businessKpis.kpi1Sub}</p>
              </div>
            </div>

            {/* KPI 2: Charcoal Olive Card (Benchmark Average Run-Rate) */}
            <div className="bg-[#434a47] text-white rounded-[24px] p-4 sm:p-4.5 flex flex-col justify-between overflow-hidden shadow-sm min-h-[96px] transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between min-w-0">
                <span className="text-xs font-semibold text-slate-300 truncate">
                  {businessKpis.kpi2Label}
                </span>
                <span className="text-[10px] font-bold text-[#e5fb84] flex-shrink-0">
                  Benchmark
                </span>
              </div>
              <div className="my-0.5 min-w-0">
                <span className="text-2xl sm:text-3xl font-black text-[#e5fb84] tracking-tight leading-none truncate block">
                  {businessKpis.kpi2Value}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 truncate">{businessKpis.kpi2Sub}</p>
            </div>

            {/* KPI 3: Cool Silver Card (Peak High Watermark / Top Performer) */}
            <div className="bg-[#ccd2d8] text-slate-900 rounded-[24px] p-4 sm:p-4.5 flex flex-col justify-between overflow-hidden shadow-sm min-h-[96px] transition-transform hover:-translate-y-0.5">
              <div className="flex items-center justify-between min-w-0 gap-1">
                <span className="bg-[#f8fd93] text-black px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider truncate">
                  {businessKpis.kpi3Label}
                </span>
                <span className="text-[11px] font-black text-emerald-700 flex-shrink-0">
                  High Watermark
                </span>
              </div>
              <div className="my-0.5 min-w-0">
                <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-none truncate block">
                  {businessKpis.kpi3Value}
                </span>
              </div>
              <p className="text-[10px] font-semibold text-slate-600 truncate">
                {businessKpis.kpi3Sub}
              </p>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* MAIN DYNAMIC CONTENT: ADAPTS CARDS AS PER USER REQUEST                */}
          {/* ===================================================================== */}
          <div className="flex-1 w-full min-h-0 flex flex-col overflow-hidden">
            {activeTab === "dashboard" ? (
              /* DYNAMIC DASHBOARD: DYNAMICALLY ORGANIZES CARDS BY USER INTENT */
              <div className="flex-1 w-full min-h-0 flex flex-col gap-3.5 overflow-y-auto pr-1">
                {/* Multi-Chart Bento Grid: Adapts based on user's query intent */}
                <div
                  className={`grid gap-3.5 flex-1 min-h-[300px] ${
                    activeIntent === "time_series" && dashboardCharts.length > 1
                      ? "grid-cols-1" // Wide continuous trend wave hero
                      : dashboardCharts.length > 1
                      ? "grid-cols-1 xl:grid-cols-2" // Side-by-side comparative leaderboard/donut
                      : "grid-cols-1"
                  }`}
                >
                  {dashboardCharts.map((chart, idx) => (
                    <div
                      key={`dashboard-chart-${idx}`}
                      className={`bg-[#eeeafc] rounded-[28px] p-5 flex flex-col justify-between shadow-sm overflow-hidden ${
                        activeIntent === "time_series" && idx === 0 && dashboardCharts.length > 1
                          ? "min-h-[290px]"
                          : "min-h-[260px]"
                      }`}
                    >
                      {/* Chart Header */}
                      <div className="flex items-start justify-between gap-3 mb-2 flex-shrink-0">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 tracking-tight">
                            {chart.title}
                          </h4>
                          {chart.description && (
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {chart.description}
                            </p>
                          )}
                        </div>

                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/70 text-[#7c5cfc] border border-white">
                          {chart.chartType}
                        </span>
                      </div>

                      {/* Dynamic Chart Container */}
                      <div className="flex-1 w-full min-h-[170px]">
                        <DynamicChart
                          config={chart}
                          variant="lavender"
                          height="100%"
                          onRemove={
                            dashboardCharts.length > 1
                              ? () => handleRemoveChart(idx)
                              : undefined
                          }
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Multi-Row Data Table Card (With Technical Debug Telemetry Badge) */}
                <div className="bg-white rounded-[24px] p-4.5 flex flex-col min-h-[240px] shadow-sm border border-white/10 flex-shrink-0">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-[#fdfb9f] text-slate-900 px-2.5 py-0.5 rounded-lg font-black text-[11px] inline-block">
                        Raw SQL Records
                      </span>
                      {/* Sleek Technical Telemetry Badge */}
                      <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100 font-semibold">
                        {pinnedItem
                          ? `${pinnedItem.rowCount} rows • ${pinnedItem.executionTimeMs || 4}ms SQLite`
                          : "3,503 rows • 4ms SQLite In-Memory"}
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveTab("table")}
                      className="text-[11px] font-bold text-[#7c5cfc] hover:underline flex items-center gap-1"
                    >
                      Full Screen Table <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex-1 w-full min-h-0">
                    {pinnedItem && pinnedItem.data && pinnedItem.data.length > 0 ? (
                      <DataTable
                        data={pinnedItem.data}
                        columns={pinnedItem.columns}
                        title={pinnedItem.title || "SQL Query Records"}
                        sql={pinnedItem.sqlQuery}
                        defaultPageSize={5}
                        className="border-0 shadow-none p-0 flex flex-col h-full"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 p-4">
                        Send any query in the chat to populate records and charts dynamically.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* FULL DATA TABLE VIEW (Maximized 10-25+ Rows) */
              <div className="bg-white rounded-[28px] p-5 sm:p-6 flex flex-col flex-1 h-full min-h-0 overflow-hidden shadow-sm border border-white/10">
                {pinnedItem && pinnedItem.data && pinnedItem.data.length > 0 ? (
                  <div className="flex flex-col h-full w-full min-h-0">
                    <DataTable
                      data={pinnedItem.data}
                      columns={pinnedItem.columns}
                      title={pinnedItem.title || "SQL Query Records"}
                      sql={pinnedItem.sqlQuery}
                      isPinned={true}
                      defaultPageSize={10}
                      className="border-0 shadow-none p-0 flex flex-col h-full"
                    />
                  </div>
                ) : (
                  <div className="h-full w-full flex flex-col justify-center items-center text-center p-8 text-slate-400">
                    <TableIcon className="w-12 h-12 text-slate-300 mb-3" />
                    <h4 className="text-sm font-bold text-slate-800">No Query Executed Yet</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm">
                      Send a query from the chat on the left to inspect 10–25+ rows in this maximized table view.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onSaveApiKey={handleSaveApiKey}
        modelName={modelName}
        onSelectModel={handleSelectModel}
      />
    </div>
  );
}
