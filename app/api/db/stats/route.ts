import { NextResponse } from "next/server";
import { getDbStats, getChinookSchema } from "@/lib/db/chinook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  // 1. Try Python FastAPI backend
  try {
    const pythonRes = await fetch(`${PYTHON_BACKEND_URL}/api/db/stats`, {
      signal: AbortSignal.timeout(2000),
    });
    if (pythonRes.ok) {
      const data = await pythonRes.json();
      return NextResponse.json({ ...data, source: "python-fastapi" });
    }
  } catch {
    // Continue to fallback
  }

  // 2. Fallback to native SQLite
  try {
    const stats = getDbStats();
    const schema = getChinookSchema();
    return NextResponse.json({
      success: true,
      stats,
      schema,
      source: "embedded-sqlite",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to retrieve database stats",
      },
      { status: 500 }
    );
  }
}
