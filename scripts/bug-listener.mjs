#!/usr/bin/env node
/**
 * FleetONE Bug Listener — Slack Socket Mode daemon
 * -------------------------------------------------
 * Maintains a persistent WebSocket connection to Slack.
 * When ONE Bug Bot posts a new individual bug in #one-bug,
 * this process immediately invokes the bug-fixer agent.
 *
 * Runs on VPS via PM2 — no polling, no GitHub Actions needed.
 *
 * Required env vars (set in /etc/environment or pm2 ecosystem):
 *   SLACK_APP_TOKEN    — xapp-... (App-Level Token, connections:write scope)
 *   SLACK_BOT_TOKEN    — xoxb-... (Bot Token)
 *   ANTHROPIC_API_KEY  — Anthropic API key
 *   GITHUB_REPO        — NCGHoldings/FleetONE
 *   REPO_ROOT          — /var/www/fleetone/FleetONE
 */

import { execSync, spawnSync } from "child_process";
import { createRequire } from "module";

const REPO_ROOT   = process.env.REPO_ROOT   || "/var/www/fleetone/FleetONE";
const BUG_BOT_ID  = process.env.BUG_BOT_USER_ID || "U0B2ZP9PGM7";
const CHANNEL_ID  = process.env.SLACK_CHANNEL_ID || "C0B2XT7EN90";

// ── Bootstrap deps ────────────────────────────────────────────────────────────
console.log("📦 Installing deps…");
execSync(
  "npm install --no-save --legacy-peer-deps @slack/socket-mode @slack/web-api @anthropic-ai/sdk",
  { stdio: "inherit", cwd: REPO_ROOT }
);

const { SocketModeClient }  = (await import("@slack/socket-mode")).default
  ?? (await import("@slack/socket-mode"));
const { WebClient }         = (await import("@slack/web-api"));
const { default: Anthropic } = (await import("@anthropic-ai/sdk"));

// ── State: prevent duplicate runs for the same bug ───────────────────────────
const processing = new Set();

// ── Is this an individual bug post (not a queue summary)? ────────────────────
function isNewBug(event) {
  const text = event.text ?? "";
  return (
    event.type    === "message"    &&
    event.user    === BUG_BOT_ID   &&
    event.channel === CHANNEL_ID   &&
    !event.thread_ts               && // not a reply
    text.includes("Bug #")         &&
    text.includes("Severity")      &&
    !text.includes("Bug Queue")
  );
}

// ── Extract bug ID from message text ─────────────────────────────────────────
function extractBugId(text) {
  return text.match(/Bug #([a-f0-9]+)/)?.[1] ?? null;
}

// ── Run the bug-fixer script for a specific bug ───────────────────────────────
async function runFixer(event) {
  const bugId = extractBugId(event.text ?? "");
  if (!bugId) return;
  if (processing.has(bugId)) {
    console.log(`⏭  Bug #${bugId} already being processed, skipping.`);
    return;
  }

  processing.add(bugId);
  console.log(`\n🐛 New bug detected: #${bugId} — running fixer…`);

  try {
    // Run the existing bug-fixer script (inherits all env vars)
    execSync("node scripts/bug-fixer.mjs", {
      cwd:      REPO_ROOT,
      stdio:    "inherit",
      timeout:  20 * 60 * 1000, // 20 min max per bug
      env: {
        ...process.env,
        // Pull only the latest bug — fixer will skip already-handled ones
      },
    });
    console.log(`✅ Fixer completed for bug #${bugId}`);
  } catch (err) {
    console.error(`❌ Fixer error for bug #${bugId}:`, err.message);
  } finally {
    processing.delete(bugId);
  }
}

// ── Start Socket Mode listener ────────────────────────────────────────────────
console.log("🔌 Connecting to Slack via Socket Mode…");

const socketClient = new SocketModeClient({
  appToken: process.env.SLACK_APP_TOKEN,
});

socketClient.on("message", async ({ event, ack }) => {
  await ack(); // always ack immediately
  if (isNewBug(event)) {
    runFixer(event).catch(console.error); // fire-and-forget (ack already sent)
  }
});

socketClient.on("error", (err) => {
  console.error("Slack Socket Mode error:", err);
});

socketClient.on("disconnect", () => {
  console.warn("⚠️  Socket Mode disconnected — will auto-reconnect.");
});

socketClient.on("connecting", () => console.log("Connecting to Slack…"));
socketClient.on("connected",  () => console.log("✅ Connected to Slack. Listening for bugs…"));

await socketClient.start();

// Keep alive
process.on("SIGTERM", () => {
  console.log("SIGTERM received — shutting down.");
  socketClient.disconnect().then(() => process.exit(0));
});
