/**
 * Stdio MCP bridge for local coding agents (Cursor, Claude Desktop, Antigravity).
 *
 * Environment variables:
 *   BUG_TRACKER_URL     e.g. http://localhost:3000
 *   BUG_TRACKER_API_KEY Project API key (btk_...)
 *
 * Usage:
 *   npx tsx scripts/mcp-server.ts
 */
import readline from "node:readline";

const baseUrl = (process.env.BUG_TRACKER_URL || "http://localhost:3000").replace(/\/+$/, "");
const apiKey = process.env.BUG_TRACKER_API_KEY?.trim() || "";

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", async (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;

  try {
    const res = await fetch(`${baseUrl}/api/mcp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: trimmed,
    });

    if (res.status === 204) return;
    const text = await res.text();
    if (text.trim()) {
      process.stdout.write(`${text.trim()}\n`);
    }
  } catch (error) {
    let id: unknown = null;
    try {
      id = (JSON.parse(trimmed) as { id?: unknown }).id ?? null;
    } catch {
      // ignore
    }
    const errPayload = {
      jsonrpc: "2.0",
      id,
      error: {
        code: -32000,
        message: error instanceof Error ? error.message : "Failed to reach Bug Tracking MCP endpoint",
      },
    };
    process.stdout.write(`${JSON.stringify(errPayload)}\n`);
  }
});
