#!/usr/bin/env node
/**
 * FleetONE Slack Bug Fixer
 * ========================
 * Reads #one-bug (C0B2XT7EN90), finds unresolved bug threads,
 * runs a Claude agent to fix the code, opens a GitHub PR,
 * and replies to the Slack thread with the PR link.
 *
 * Required env vars:
 *   SLACK_BOT_TOKEN     – Slack bot token with channels:history, chat:write
 *   ANTHROPIC_API_KEY   – Anthropic API key
 *   GITHUB_TOKEN        – GitHub PAT or Actions token (for gh cli / PR creation)
 *   GITHUB_REPO         – e.g. "NCGHoldings/FleetONE"
 *   REPO_ROOT           – Absolute path to the repo (defaults to cwd)
 */

import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";

// ── 1. Bootstrap deps ────────────────────────────────────────────────────────
console.log("📦 Installing runtime deps…");
execSync("npm install --no-save --legacy-peer-deps @slack/web-api @anthropic-ai/sdk", {
  stdio: "inherit",
  cwd: process.cwd(),
});

const { WebClient } = (await import("@slack/web-api"));
const { default: Anthropic } = (await import("@anthropic-ai/sdk"));

// ── 2. Config ─────────────────────────────────────────────────────────────────
const CHANNEL_ID = process.env.SLACK_CHANNEL_ID || "C0B2XT7EN90";
const BOT_USER_ID = process.env.BUG_BOT_USER_ID || "U0B2ZP9PGM7"; // ONE Bug Bot
const REPO_ROOT = process.env.REPO_ROOT || process.cwd();
const GITHUB_REPO = process.env.GITHUB_REPO || "NCGHoldings/FleetONE";
const DRY_RUN = process.env.DRY_RUN === "true";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── 3. Slack helpers ──────────────────────────────────────────────────────────
async function fetchBugMessages(limit = 100) {
  const result = await slack.conversations.history({
    channel: CHANNEL_ID,
    limit,
  });
  // Only messages from the bot that contain an individual bug (not queue summaries)
  return (result.messages || []).filter(
    (m) =>
      m.user === BOT_USER_ID &&
      m.text &&
      m.text.includes("Bug #") &&
      m.text.includes("Severity") &&
      !m.text.includes("Bug Queue")
  );
}

async function fetchThread(ts) {
  const result = await slack.conversations.replies({
    channel: CHANNEL_ID,
    ts,
  });
  return result.messages || [];
}

async function postToThread(parentTs, text) {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would post to thread ${parentTs}:\n${text}`);
    return;
  }
  await slack.chat.postMessage({
    channel: CHANNEL_ID,
    thread_ts: parentTs,
    text,
  });
}

// ── 4. Parse bug from Slack message text ─────────────────────────────────────
function parseBug(msg) {
  const idMatch = msg.text.match(/Bug #([a-f0-9]+)/);
  const titleMatch = msg.text.match(/Bug #[a-f0-9]+ — ([^\n*]+)/);
  const severityMatch = msg.text.match(/`(HIGH|MEDIUM|LOW|UNKNOWN)`/);
  const descMatch = msg.text.match(
    /\*:clipboard: Description:\*\n([\s\S]*?)\n\*:repeat:/
  );
  const stepsMatch = msg.text.match(
    /\*:repeat: Steps to Reproduce:\*\n([\s\S]*?)(?:\n:white_check_mark:|$)/
  );

  return {
    id: idMatch?.[1] ?? "unknown",
    title: titleMatch?.[1]?.trim() ?? "Unknown bug",
    severity: severityMatch?.[1] ?? "UNKNOWN",
    description: descMatch?.[1]?.trim() ?? "",
    steps: stepsMatch?.[1]?.trim() ?? "",
    ts: msg.ts,
  };
}

// ── 5. Check if bug is already being handled ─────────────────────────────────
function isResolved(threadMessages) {
  return threadMessages.some(
    (m) =>
      m.text &&
      (m.text.toLowerCase().includes("fixed") ||
        m.text.includes("github.com") ||
        m.text.includes("PR opened") ||
        m.text.includes("pull/"))
  );
}

// ── 6. Git helpers ────────────────────────────────────────────────────────────
function git(cmd, opts = {}) {
  return execSync(`git ${cmd}`, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    ...opts,
  }).trim();
}

function branchExists(branch) {
  try {
    git(`rev-parse --verify ${branch}`);
    return true;
  } catch {
    return false;
  }
}

function createBranch(bugId) {
  const branch = `fix/bug-${bugId.slice(0, 8)}`;
  if (branchExists(branch)) {
    console.log(`  Branch ${branch} already exists, reusing.`);
    git(`checkout ${branch}`);
  } else {
    git("checkout main");
    git("pull origin main");
    git(`checkout -b ${branch}`);
  }
  return branch;
}

// ── 7. Claude agent — agentic loop with tools ─────────────────────────────────
const AGENT_TOOLS = [
  {
    name: "read_file",
    description: "Read the contents of a file in the repository.",
    input_schema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Relative path from repo root (e.g. src/components/foo/Bar.tsx)",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Write or overwrite a file in the repository.",
    input_schema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Relative path from repo root" },
        content: { type: "string", description: "Full file content" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "bash",
    description:
      "Run a read-only bash command (grep, find, cat, ls). Do NOT run git, npm install, or destructive commands.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "The bash command to run" },
      },
      required: ["command"],
    },
  },
  {
    name: "done",
    description:
      "Signal that you have finished making all necessary changes. Call this when the fix is complete.",
    input_schema: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "One-paragraph summary of what was changed and why",
        },
        files_changed: {
          type: "array",
          items: { type: "string" },
          description: "List of relative file paths that were modified",
        },
      },
      required: ["summary", "files_changed"],
    },
  },
];

function runTool(toolName, toolInput) {
  if (toolName === "read_file") {
    const abs = path.join(REPO_ROOT, toolInput.path);
    if (!fs.existsSync(abs)) return `File not found: ${toolInput.path}`;
    return fs.readFileSync(abs, "utf8");
  }

  if (toolName === "write_file") {
    const abs = path.join(REPO_ROOT, toolInput.path);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, toolInput.content, "utf8");
    return `Written: ${toolInput.path}`;
  }

  if (toolName === "bash") {
    // Safety guardrails — no destructive commands
    const cmd = toolInput.command;
    const blocked = ["rm ", "git ", "npm install", "npx ", "curl ", "wget "];
    if (blocked.some((b) => cmd.includes(b))) {
      return `Command blocked for safety: ${cmd}`;
    }
    const result = spawnSync("bash", ["-c", cmd], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      timeout: 15000,
    });
    return (result.stdout || "") + (result.stderr ? `\nSTDERR: ${result.stderr}` : "");
  }

  return `Unknown tool: ${toolName}`;
}

async function runFixAgent(bug) {
  console.log(`\n🤖 Running fix agent for Bug #${bug.id}…`);

  const systemPrompt = `You are an expert TypeScript/React developer working on FleetONE — a fleet management SaaS built with React 18 + Vite + Supabase.

Repository structure (key paths):
- src/components/yutong/      — Yutong bus sales pipeline, order management, invoice generation
- src/components/accounting/  — Finance ERP (AR/AP/GL)
- src/components/fleet/       — Bus management
- src/components/special-hire/— Special hire quotation/booking
- src/hooks/                  — Data hooks (useAccountingData, useAccountingMutations, etc.)
- src/lib/gl-posting-utils.ts — ⚠️ PROTECTED — do NOT modify

Your job: investigate the bug below, locate the root cause in the codebase, and fix it with minimal, targeted changes. Do not refactor unrelated code.

When you are done making all changes, call the \`done\` tool with a summary.`;

  const userMessage = `**Bug #${bug.id}** (${bug.severity})
Title: ${bug.title}

Description:
${bug.description}

Steps to Reproduce:
${bug.steps}

Please investigate the codebase, find the root cause, and fix it.`;

  const messages = [{ role: "user", content: userMessage }];
  let result = null;

  // Agentic loop — max 20 turns
  for (let turn = 0; turn < 20; turn++) {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      system: systemPrompt,
      tools: AGENT_TOOLS,
      messages,
    });

    // Append assistant response
    messages.push({ role: "assistant", content: response.content });

    // Check stop reason
    if (response.stop_reason === "end_turn") {
      console.log("  Agent finished (end_turn).");
      break;
    }

    if (response.stop_reason === "tool_use") {
      const toolResults = [];

      for (const block of response.content) {
        if (block.type !== "tool_use") continue;

        console.log(`  🔧 Tool: ${block.name}`, block.input?.path || block.input?.command?.slice(0, 60) || "");

        if (block.name === "done") {
          result = block.input;
          console.log(`  ✅ Agent done. Files changed: ${result.files_changed.join(", ")}`);
          break;
        }

        const output = runTool(block.name, block.input);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: typeof output === "string" ? output : JSON.stringify(output),
        });
      }

      if (result) break; // done tool was called

      messages.push({ role: "user", content: toolResults });
    }
  }

  return result; // { summary, files_changed } or null if agent didn't call done
}

// ── 8. Open PR via gh CLI ─────────────────────────────────────────────────────
function openPR(branch, bug, agentSummary) {
  const title = `fix: ${bug.title.slice(0, 72)}`;
  const body = `## Bug #${bug.id}
**Severity:** ${bug.severity}
**Reporter reported:** ${bug.title}

## What was fixed
${agentSummary.summary}

## Files changed
${agentSummary.files_changed.map((f) => `- \`${f}\``).join("\n")}

## Test plan
- [ ] Reproduce the original steps from the bug report
- [ ] Confirm the issue is resolved
- [ ] Confirm no regression in adjacent functionality

---
🤖 Auto-fixed by [FleetONE Bug Fixer](https://github.com/${GITHUB_REPO}/blob/main/.github/workflows/bug-fixer.yml) · Slack bug \`#${bug.id}\``;

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would create PR:\n  Title: ${title}\n  Branch: ${branch}`);
    return `https://github.com/${GITHUB_REPO}/pull/DRY_RUN`;
  }

  const result = spawnSync(
    "gh",
    [
      "pr",
      "create",
      "--title",
      title,
      "--body",
      body,
      "--base",
      "main",
      "--head",
      branch,
    ],
    { cwd: REPO_ROOT, encoding: "utf8" }
  );

  if (result.status !== 0) {
    throw new Error(`gh pr create failed: ${result.stderr}`);
  }

  // gh pr create returns the PR URL on stdout
  return result.stdout.trim();
}

// ── 9. Main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Reading #one-bug channel…");
  const bugMessages = await fetchBugMessages(100);
  console.log(`  Found ${bugMessages.length} individual bug messages.`);

  const toFix = [];

  for (const msg of bugMessages) {
    const bug = parseBug(msg);
    if (bug.id === "unknown" || bug.severity === "UNKNOWN") continue; // skip vague ones
    if (!bug.description) continue; // skip if no description to work with

    const thread = await fetchThread(msg.ts);
    if (isResolved(thread)) {
      console.log(`  ⏭  Bug #${bug.id} — already resolved or PR exists, skipping.`);
      continue;
    }

    toFix.push(bug);
  }

  console.log(`\n🐛 ${toFix.length} bug(s) to fix: ${toFix.map((b) => "#" + b.id).join(", ")}`);

  for (const bug of toFix) {
    console.log(`\n${"─".repeat(60)}`);
    console.log(`🔧 Fixing Bug #${bug.id} — ${bug.title}`);

    try {
      // 1. Create branch
      const branch = createBranch(bug.id);

      // 2. Run Claude agent
      const agentResult = await runFixAgent(bug);

      if (!agentResult || agentResult.files_changed.length === 0) {
        console.log(`  ⚠️  Agent made no changes — skipping PR for bug #${bug.id}`);
        await postToThread(
          bug.ts,
          `⚠️ *Auto-fix attempted for Bug #${bug.id}* — the agent was unable to locate a confident fix for this one. Manual review needed.`
        );
        // Clean up branch
        git("checkout main");
        git(`branch -D ${branch}`);
        continue;
      }

      // 3. Commit
      if (!DRY_RUN) {
        git("add -A");
        const commitMsg = `fix: bug #${bug.id} — ${bug.title.slice(0, 60)}\n\nAuto-fixed by FleetONE Bug Fixer agent.\nSlack bug ID: #${bug.id}\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`;
        git(`commit -m "${commitMsg.replace(/"/g, '\\"')}"`);

        // 4. Push
        git(`push origin ${branch} --force-with-lease`);
      }

      // 5. Open PR
      const prUrl = openPR(branch, bug, agentResult);
      console.log(`  ✅ PR created: ${prUrl}`);

      // 6. Post to Slack thread
      await postToThread(
        bug.ts,
        `🔧 *Auto-fix PR opened for Bug #${bug.id}*\n\n${prUrl}\n\n*What was changed:*\n${agentResult.summary}\n\nPlease review, test, and merge. Then reply \`fixed\` in this thread to close the bug.`
      );
    } catch (err) {
      console.error(`  ❌ Error fixing bug #${bug.id}:`, err.message);
      await postToThread(
        bug.ts,
        `❌ *Auto-fix failed for Bug #${bug.id}*\n\nError: \`${err.message}\`\n\nManual fix required.`
      );
      // Reset branch state
      try {
        git("checkout main");
      } catch {}
    }
  }

  console.log("\n✅ Bug fixer run complete.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
