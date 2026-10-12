import { NextRequest } from "next/server";
import { createDataAnalystGraph } from "@/lib/agents/graph";
import { HumanMessage } from "@langchain/core/messages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://127.0.0.1:8000";

function normalizeModelName(raw?: string): string {
  if (!raw) return "gemini-3.8-flash";
  if (raw.includes("pro")) return "gemini-3.8-pro";
  if (raw.includes("1.5") || raw.includes("2.0") || raw.includes("2.5") || raw.includes("flash")) return "gemini-3.8-flash";
  return raw;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const effectiveModel = normalizeModelName(body.modelName);
    const sanitizedBody = {
      ...body,
      modelName: effectiveModel,
    };

    // 1. Check if the Python FastAPI LangGraph backend is running via /health
    let isPythonRunning = false;
    try {
      const healthCheck = await fetch(`${PYTHON_BACKEND_URL}/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (healthCheck.ok) {
        isPythonRunning = true;
      }
    } catch {
      isPythonRunning = false;
    }

    if (isPythonRunning) {
      try {
        const pythonResponse = await fetch(`${PYTHON_BACKEND_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sanitizedBody),
          signal: AbortSignal.timeout(120000), // Generous 2-minute timeout for multi-agent LLM reasoning
        });

        if (pythonResponse.ok && pythonResponse.body) {
          const encoder = new TextEncoder();
          const reader = pythonResponse.body.getReader();

          // Safe stream wrapper to prevent 'failed to pipe response' unhandled rejections
          const safeStream = new ReadableStream({
            async start(controller) {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
                controller.close();
              } catch (streamErr: any) {
                console.warn("Python SSE stream interrupted:", streamErr?.message);
                controller.enqueue(
                  encoder.encode(
                    `data: ${JSON.stringify({
                      type: "error",
                      error: streamErr?.message || "Streaming connection was interrupted.",
                    })}\n\n`
                  )
                );
                controller.close();
              }
            },
            cancel() {
              reader.cancel().catch(() => {});
            },
          });

          return new Response(safeStream, {
            headers: {
              "Content-Type": "text/event-stream; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
              "X-Backend-Source": "python-fastapi",
            },
          });
        }
      } catch (err: any) {
        console.warn("Python backend streaming error, falling back to embedded runner:", err?.message);
      }
    }

    // 2. Fallback to native LangGraph runner
    const { messages, userQuery, apiKey } = sanitizedBody;
    const modelName = effectiveModel;

    let query = userQuery;
    if (!query && Array.isArray(messages) && messages.length > 0) {
      const last = messages[messages.length - 1];
      query = last.content || last.text || "";
    }

    if (!query || typeof query !== "string" || !query.trim()) {
      return new Response(JSON.stringify({ error: "Missing query or messages." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const effectiveApiKey = apiKey || process.env.GOOGLE_API_KEY;
    if (!effectiveApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Google Gemini API Key is required. Please set GOOGLE_API_KEY in .env.local or enter it in Settings.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: Record<string, any>) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          const app = createDataAnalystGraph({
            apiKey: effectiveApiKey,
            modelName: modelName || "gemini-3.8-flash",
          });

          sendEvent({
            type: "step",
            step: {
              node: "supervisor",
              label: "Analyzing Request Intent",
              status: "running",
              timestamp: Date.now(),
            },
          });

          const finalState = await app.invoke({
            userQuery: query,
            messages: [new HumanMessage(query)],
            sqlRetryCount: 0,
            steps: [],
          });

          if (finalState.steps && Array.isArray(finalState.steps)) {
            for (const step of finalState.steps) {
              sendEvent({ type: "step", step });
            }
          }

          if (finalState.sqlQuery) {
            sendEvent({
              type: "sql_executed",
              sql: finalState.sqlQuery,
              sqlError: finalState.sqlError,
              rowCount: finalState.queryResults?.length || 0,
              executionTimeMs: finalState.executionTimeMs || 0,
              rows: finalState.queryResults || [],
              columns: finalState.columns || [],
            });
          }

          if (finalState.chartConfig) {
            sendEvent({
              type: "chart_generated",
              chartConfig: finalState.chartConfig,
            });
          }

          if (finalState.explanation) {
            const explanation = finalState.explanation;
            const words = explanation.split(" ");
            let chunk = "";
            for (let i = 0; i < words.length; i++) {
              chunk += (i === 0 ? "" : " ") + words[i];
              if ((i + 1) % 4 === 0 || i === words.length - 1) {
                sendEvent({
                  type: "text_delta",
                  delta: chunk,
                });
                chunk = "";
              }
            }
          }

          sendEvent({
            type: "finish",
            finalState: {
              intent: finalState.intent,
              sqlQuery: finalState.sqlQuery,
              sqlError: finalState.sqlError,
              rowCount: finalState.queryResults?.length || 0,
              columns: finalState.columns,
              executionTimeMs: finalState.executionTimeMs,
              chartConfig: finalState.chartConfig,
              explanation: finalState.explanation,
            },
          });

          controller.close();
        } catch (err: any) {
          sendEvent({
            type: "error",
            error: err?.message || "An unexpected error occurred during execution.",
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Backend-Source": "embedded-langgraph",
      },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Failed to process chat request." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
