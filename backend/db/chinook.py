import os
import sqlite3
import time
from typing import Dict, Any, List, Optional

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "chinook.db"))

def get_connection() -> sqlite3.Connection:
    if not os.path.exists(DB_PATH):
        raise FileNotFoundError(f"Chinook database not found at {DB_PATH}. Please run 'npm run setup:db'.")
    conn = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn

def execute_query(sql: str) -> Dict[str, Any]:
    """
    Executes a read-only SQLite query against the local chinook.db file.
    Enforces security constraints preventing destructive statements.
    """
    start_time = time.time()
    clean_sql = sql.strip().rstrip(";")

    # Forbidden mutating statements
    forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "CREATE", "TRUNCATE", "ATTACH", "DETACH", "PRAGMA"]
    upper_sql = clean_sql.upper()
    for word in forbidden:
        if f" {word} " in f" {upper_sql} " or upper_sql.startswith(f"{word} "):
            return {
                "success": False,
                "error": f"Security restriction: {word} statements are not permitted.",
                "sql": clean_sql,
                "execution_time_ms": int((time.time() - start_time) * 1000)
            }

    if not (upper_sql.startswith("SELECT") or upper_sql.startswith("WITH")):
        return {
            "success": False,
            "error": "Query must start with SELECT or WITH.",
            "sql": clean_sql,
            "execution_time_ms": int((time.time() - start_time) * 1000)
        }

    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(clean_sql)
        rows_raw = cursor.fetchall()
        execution_time_ms = int((time.time() - start_time) * 1000)

        # Convert sqlite3.Row to dict
        rows = [dict(row) for row in rows_raw]
        columns = [col[0] for col in cursor.description] if cursor.description else []
        conn.close()

        return {
            "success": True,
            "rows": rows,
            "columns": columns,
            "row_count": len(rows),
            "execution_time_ms": execution_time_ms,
            "sql": clean_sql
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "sql": clean_sql,
            "execution_time_ms": int((time.time() - start_time) * 1000)
        }

def get_chinook_schema() -> str:
    """
    Generates structured schema context for all tables in the Chinook database.
    """
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    tables = [row["name"] for row in cursor.fetchall()]

    schema_text = "### CHINOOK DATABASE SCHEMA (SQLite):\n\n"

    for table in tables:
        cursor.execute(f"PRAGMA table_info('{table}')")
        cols = cursor.fetchall()

        cursor.execute(f"PRAGMA foreign_key_list('{table}')")
        fks = cursor.fetchall()

        cursor.execute(f"SELECT * FROM '{table}' LIMIT 1")
        sample = cursor.fetchone()

        schema_text += f"Table: {table}\nColumns:\n"
        for col in cols:
            pk_str = " [PRIMARY KEY]" if col["pk"] else ""
            schema_text += f"  - {col['name']} ({col['type'] or 'ANY'}){pk_str}\n"

        if fks:
            schema_text += "Foreign Keys:\n"
            for fk in fks:
                schema_text += f"  - {fk['from']} -> {fk['table']}({fk['to']})\n"

        if sample:
            schema_text += f"Sample Row: {dict(sample)}\n"
        schema_text += "\n"

    conn.close()
    return schema_text

def get_db_stats() -> Dict[str, Any]:
    """
    Returns summary statistics for Settings and Canvas info.
    """
    try:
        conn = get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
        tables = [row["name"] for row in cursor.fetchall()]

        total_rows = 0
        table_summaries = []

        for t in tables:
            cursor.execute(f"SELECT count(*) as c FROM '{t}'")
            count = cursor.fetchone()["c"]
            total_rows += count

            cursor.execute(f"PRAGMA table_info('{t}')")
            cols = [c["name"] for c in cursor.fetchall()]

            table_summaries.append({
                "name": t,
                "rowCount": count,
                "columns": cols
            })

        conn.close()
        return {
            "connected": True,
            "totalTables": len(table_summaries),
            "totalRows": total_rows,
            "tables": table_summaries,
            "dbPath": DB_PATH
        }
    except Exception as e:
        return {
            "connected": False,
            "totalTables": 0,
            "totalRows": 0,
            "tables": [],
            "error": str(e),
            "dbPath": DB_PATH
        }

if __name__ == "__main__":
    stats = get_db_stats()
    print("DB Stats:", stats)
    res = execute_query("SELECT Name, ArtistId FROM Artist LIMIT 3")
    print("Query Test:", res)
