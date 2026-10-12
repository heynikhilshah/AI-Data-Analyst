"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Search,
  Pin,
  Table as TableIcon,
} from "lucide-react";
import { formatValue } from "@/lib/utils";

interface DataTableProps {
  data: Record<string, any>[];
  columns?: string[];
  title?: string;
  sql?: string;
  onPin?: () => void;
  isPinned?: boolean;
  className?: string;
  defaultPageSize?: number;
}

export function DataTable({
  data = [],
  columns: propColumns,
  title = "Query Result Table",
  sql,
  onPin,
  isPinned = false,
  className = "",
  defaultPageSize = 5,
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Derive columns
  const columns = useMemo(() => {
    if (propColumns && propColumns.length > 0) return propColumns;
    if (data.length > 0) return Object.keys(data[0]);
    return [];
  }, [data, propColumns]);

  // Filtered rows
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((row) =>
      columns.some((col) => {
        const val = row[col];
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [data, columns, searchTerm]);

  // Sorted rows
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      return sortDirection === "asc"
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (col: string) => {
    if (sortColumn === col) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortColumn(null);
        setSortDirection("asc");
      }
    } else {
      setSortColumn(col);
      setSortDirection("asc");
    }
  };

  const handleExportCsv = () => {
    if (!data.length) return;
    const headers = columns.join(",");
    const rows = sortedData.map((row) =>
      columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `chinook_query_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!data || data.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/80 rounded-2xl border border-gray-100">
        No records returned from this query.
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-2xl border border-gray-100 bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.03)] text-xs flex flex-col ${className}`}
    >
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-2.5 border-b border-gray-100/80">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-teal-500" />
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/60">
            {data.length} {data.length === 1 ? "row" : "rows"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search rows..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 pr-2.5 py-1 text-xs bg-gray-50 border border-gray-200/60 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors w-32 md:w-44"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-gray-50 hover:bg-gray-100 text-slate-600 rounded-xl border border-gray-200/60 transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Pin Button */}
          {onPin && (
            <button
              onClick={onPin}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-xl transition-all ${
                isPinned
                  ? "bg-indigo-50 text-indigo-600 border border-indigo-200"
                  : "bg-gray-50 hover:bg-gray-100 text-slate-600 border border-gray-200/60"
              }`}
              title="Pin to Dashboard Canvas"
            >
              <Pin className={`w-3.5 h-3.5 ${isPinned ? "rotate-45 text-indigo-600" : ""}`} />
              <span className="hidden sm:inline">{isPinned ? "Pinned" : "Pin"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-auto rounded-xl border border-gray-100 bg-white flex-1 min-h-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-100 text-slate-500 text-[11px] font-semibold">
              {columns.map((col) => {
                const isSorted = sortColumn === col;
                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-3.5 py-2.5 cursor-pointer select-none hover:bg-gray-100/60 transition-colors whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      {isSorted ? (
                        sortDirection === "asc" ? (
                          <ArrowUp className="w-3 h-3 text-indigo-600" />
                        ) : (
                          <ArrowDown className="w-3 h-3 text-indigo-600" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 hover:text-slate-600" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-slate-800">
            {paginatedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-slate-400 italic text-xs"
                >
                  No matching records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-slate-50/70 transition-colors font-mono text-[11px]"
                >
                  {columns.map((col) => (
                    <td key={col} className="px-3.5 py-2 whitespace-nowrap">
                      {formatValue(row[col])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-2 text-slate-500 text-xs">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-gray-50 border border-gray-200/60 rounded-lg px-2 py-0.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="text-slate-400 ml-2">
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-40 text-slate-600 border border-gray-200/60 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs font-medium text-slate-700">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-lg bg-gray-50 hover:bg-gray-100 disabled:opacity-40 text-slate-600 border border-gray-200/60 transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
