import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.resolve(process.cwd(), "chinook.db");

// Singleton connection cache
let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`Chinook database not found at ${dbPath}. Please run 'npm run setup:db'.`);
    }
    dbInstance = new Database(dbPath, {
      readonly: true,
      fileMustExist: true,
    });
    dbInstance.pragma("foreign_keys = ON");
  }
  return dbInstance;
}

export interface QueryExecutionResult {
  success: boolean;
  rows?: Record<string, any>[];
  columns?: string[];
  rowCount?: number;
  executionTimeMs?: number;
  error?: string;
  sql: string;
}

/**
 * Execute a read-only SQL query against the Chinook SQLite database.
 * Disallows destructive or mutating queries (DROP, DELETE, UPDATE, INSERT, ALTER).
 */
export async function executeQuery(sql: string): Promise<QueryExecutionResult> {
  const startTime = Date.now();
  const trimmed = sql.trim().replace(/^;+|;+$/g, "").trim();

  // Validate read-only query
  const forbiddenPatterns = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|ATTACH|DETACH|PRAGMA|REINDEX|VACUUM)\b/i;
  if (forbiddenPatterns.test(trimmed)) {
    return {
      success: false,
      error: "Security restriction: Only read-only SELECT queries are allowed.",
      sql: trimmed,
      executionTimeMs: Date.now() - startTime,
    };
  }

  // Must begin with SELECT or WITH
  if (!/^(SELECT|WITH)\b/i.test(trimmed)) {
    return {
      success: false,
      error: "Query must begin with SELECT or WITH.",
      sql: trimmed,
      executionTimeMs: Date.now() - startTime,
    };
  }

  try {
    const db = getDb();
    const statement = db.prepare(trimmed);
    const rows = statement.all() as Record<string, any>[];
    const executionTimeMs = Date.now() - startTime;

    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      success: true,
      rows,
      columns,
      rowCount: rows.length,
      executionTimeMs,
      sql: trimmed,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Unknown database error during execution.",
      sql: trimmed,
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Returns formatted schema prompt text for all tables in the Chinook database.
 */
export function getChinookSchema(): string {
  const db = getDb();
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    .all() as { name: string }[];

  let schemaText = "### CHINOOK DATABASE SCHEMA (SQLite):\n\n";

  for (const table of tables) {
    const columns = db.prepare(`PRAGMA table_info("${table.name}")`).all() as {
      name: string;
      type: string;
      pk: number;
      notnull: number;
    }[];

    const foreignKeys = db.prepare(`PRAGMA foreign_key_list("${table.name}")`).all() as {
      from: string;
      table: string;
      to: string;
    }[];

    const sampleRow = db.prepare(`SELECT * FROM "${table.name}" LIMIT 1`).get();

    schemaText += `Table: ${table.name}\n`;
    schemaText += `Columns:\n`;
    for (const col of columns) {
      const isPk = col.pk ? " [PRIMARY KEY]" : "";
      schemaText += `  - ${col.name} (${col.type || "ANY"})${isPk}\n`;
    }

    if (foreignKeys.length > 0) {
      schemaText += `Foreign Keys:\n`;
      for (const fk of foreignKeys) {
        schemaText += `  - ${fk.from} -> ${fk.table}(${fk.to})\n`;
      }
    }

    if (sampleRow) {
      schemaText += `Sample Row: ${JSON.stringify(sampleRow)}\n`;
    }
    schemaText += "\n";
  }

  return schemaText;
}

export interface TableSummary {
  name: string;
  rowCount: number;
  columns: string[];
}

export interface DbStats {
  connected: boolean;
  totalTables: number;
  totalRows: number;
  tables: TableSummary[];
  dbPath: string;
}

/**
 * Returns summary statistics of the database for the Settings modal & UI inspection.
 */
export function getDbStats(): DbStats {
  try {
    const db = getDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { name: string }[];

    let totalRows = 0;
    const summaries: TableSummary[] = [];

    for (const t of tables) {
      const countRes = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get() as { c: number };
      const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all() as { name: string }[];
      totalRows += countRes.c;
      summaries.push({
        name: t.name,
        rowCount: countRes.c,
        columns: cols.map((c) => c.name),
      });
    }

    return {
      connected: true,
      totalTables: summaries.length,
      totalRows,
      tables: summaries,
      dbPath,
    };
  } catch (err: any) {
    return {
      connected: false,
      totalTables: 0,
      totalRows: 0,
      tables: [],
      dbPath,
    };
  }
}
