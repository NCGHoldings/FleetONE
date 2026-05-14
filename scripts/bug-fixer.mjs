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
        risk_level: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
          description:
            "Overall risk level of this change on the LIVE production system. HIGH = touches financial logic, auth, or cross-module state. CRITICAL = touches GL engine, RLS policies, or payment flows.",
        },
        affected_areas: {
          type: "array",
          items: { type: "string" },
          description:
            "List of features, pages, or functions that this change could affect or break — be specific (e.g. 'AR invoice creation', 'Yutong order PDF generation', 'Bank reconciliation page').",
        },
        risk_details: {
          type: "string",
          description:
            "Detailed explanation of what could go wrong in production if this fix has a side-effect. Include which user roles, modules, or data flows are at risk. If LOW risk, still explain why it is safe.",
        },
        testing_checklist: {
          type: "array",
          items: { type: "string" },
          description:
            "Specific manual test steps a reviewer MUST perform on staging before merging to production. Be precise — include UI paths, example data, and expected outcomes.",
        },
        db_changes_required: {
          type: "array",
          items: {
            type: "object",
            properties: {
              description: { type: "string", description: "Plain-English explanation of what this SQL does and why it is needed" },
              sql: { type: "string", description: "The exact SQL to run — must be safe to execute on the live Supabase project wwjpdszkmtnzshbulkon" },
              risk: { type: "string", description: "What could go wrong if this SQL is run incorrectly or at the wrong time" },
            },
            required: ["description", "sql", "risk"],
          },
          description:
            "SQL statements that MUST be applied to the database for this fix to work. Leave empty [] if no DB changes are needed. The agent must NEVER apply these automatically — they will be posted to Slack for a human to review and run manually.",
        },
      },
      required: ["summary", "files_changed", "risk_level", "affected_areas", "risk_details", "testing_checklist", "db_changes_required"],
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
    const p = toolInput.path;
    // Hard block: never write DB migrations or any SQL files
    const blockedPaths = ["supabase/migrations", ".env", "supabase/functions", ".sql"];
    const blocked = blockedPaths.find((b) => p.includes(b) || p.endsWith(b));
    if (blocked) {
      return `BLOCKED: Writing to '${p}' is not allowed. Database changes must be provided via db_changes_required in the done() call, not written as files.`;
    }
    const abs = path.join(REPO_ROOT, p);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, toolInput.content, "utf8");
    return `Written: ${p}`;
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

  const systemPrompt = `You are an expert TypeScript/React developer working on FleetONE — a LIVE PRODUCTION fleet management SaaS used daily by real users. Built with React 18 + Vite + Supabase.

⚠️  THIS IS A LIVE SYSTEM. Every change you make goes through code review before reaching production, but you must treat it as if it could affect real financial data, real user accounts, and real operations right now.

Repository structure (key paths):
- src/components/yutong/      — Yutong bus sales pipeline, order management, invoice generation
- src/components/accounting/  — Finance ERP (AR/AP/GL) — HIGH RISK area
- src/components/fleet/       — Bus management
- src/components/special-hire/— Special hire quotation/booking
- src/hooks/                  — Data hooks (useAccountingData, useAccountingMutations, etc.)
- src/lib/gl-posting-utils.ts — ⚠️  PROTECTED — do NOT modify under any circumstances

Critical rules:
1. Make the MINIMUM change needed to fix the bug — no refactoring, no "while I'm here" improvements
2. Never touch src/lib/gl-posting-utils.ts
3. Never physically delete or modify posted journal entries
4. If fixing something in the accounting module, be extra cautious — flag HIGH or CRITICAL risk
5. 🚫 NEVER apply any database changes yourself — no running SQL, no Supabase migrations, no schema edits
   - If the fix requires a DB change (new column, new RPC, RLS policy, index, etc.), write the SQL and put it in db_changes_required
   - A human will review and run it manually via the Supabase SQL editor
   - Do NOT create migration files in supabase/migrations/ — that would still be blocked but don't do it

Your job:
1. Investigate the bug, locate the root cause
2. Fix it with code-only changes (TypeScript/React/config files only)
3. If a DB change is also needed, document the exact SQL in db_changes_required — do NOT apply it
4. Think carefully about what else in the system imports or depends on the files you changed
5. Call the \`done\` tool with a full risk assessment — be honest about what could break

When calling \`done\`, you MUST provide:
- risk_level: how dangerous is this change on a live system (LOW/MEDIUM/HIGH/CRITICAL)
- affected_areas: every feature/page/function that could be impacted
- risk_details: what specifically could go wrong, and why it is or isn't safe
- testing_checklist: exact steps a human reviewer must run on staging before merging
- db_changes_required: [] if none needed, or array of {description, sql, risk} objects if DB changes are required`;

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
          console.log(`  ⚠️  Risk level: ${result.risk_level}`);
          console.log(`  📋 Affected areas: ${result.affected_areas?.join(", ")}`);
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
function riskBadge(level) {
  return { LOW: "🟢 LOW", MEDIUM: "🟡 MEDIUM", HIGH: "🔴 HIGH", CRITICAL: "🚨 CRITICAL" }[level] ?? level;
}

function openPR(branch, bug, agentSummary) {
  const title = `fix: ${bug.title.slice(0, 72)}`;

  const affectedList = (agentSummary.affected_areas || [])
    .map((a) => `- ${a}`)
    .join("\n");

  const testingList = (agentSummary.testing_checklist || [])
    .map((t) => `- [ ] ${t}`)
    .join("\n");

  const riskLevel = agentSummary.risk_level || "UNKNOWN";
  const isHighRisk = ["HIGH", "CRITICAL"].includes(riskLevel);

  const body = `## 🐛 Bug #${bug.id} — ${bug.title}
**Original severity:** ${bug.severity} · **Slack thread:** \`#${bug.id}\`

---

## ✅ What was fixed
${agentSummary.summary}

## 📁 Files changed
${agentSummary.files_changed.map((f) => `- \`${f}\``).join("\n")}

---

## ${isHighRisk ? "🚨" : "⚠️"} Risk Assessment — ${riskBadge(riskLevel)}

> **This is a LIVE production system.** Review this section carefully before merging.

### Could affect
${affectedList || "- No other areas identified"}

### Risk details
${agentSummary.risk_details || "Not provided."}

${isHighRisk ? `> ⛔ **${riskLevel} RISK — Do NOT merge directly to main without testing on staging first.**\n` : ""}
---

## 🧪 Testing checklist (run on staging before merging)
${testingList || "- [ ] Reproduce original bug steps and confirm resolved\n- [ ] Smoke test adjacent functionality"}
- [ ] Deploy to staging and verify no console errors
- [ ] Confirm no GL/financial data is affected (if applicable)

---
🤖 Auto-fixed by [FleetONE Bug Fixer](https://github.com/${GITHUB_REPO}/blob/main/.github/workflows/bug-fixer.yml) · Slack bug \`#${bug.id}\`
⚠️ *This PR was generated automatically. A human must review, test on staging, and approve before merging.*`;

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
      const riskLevel = agentResult.risk_level || "UNKNOWN";
      const riskEmoji = { LOW: "🟢", MEDIUM: "🟡", HIGH: "🔴", CRITICAL: "🚨" }[riskLevel] ?? "⚠️";
      const affectedSummary = (agentResult.affected_areas || []).join(", ") || "none identified";
      const dbChanges = agentResult.db_changes_required || [];

      await postToThread(
        bug.ts,
        `🔧 *Auto-fix PR opened for Bug #${bug.id}*\n\n` +
        `*PR:* ${prUrl}\n\n` +
        `*What was changed:*\n${agentResult.summary}\n\n` +
        `${riskEmoji} *Risk level: ${riskLevel}*\n` +
        `*Could affect:* ${affectedSummary}\n\n` +
        (["HIGH", "CRITICAL"].includes(riskLevel)
          ? `⛔ *${riskLevel} RISK — must be tested on staging before merging. See PR for full checklist.*\n\n`
          : "") +
        (dbChanges.length > 0
          ? `🗄️ *This fix also requires ${dbChanges.length} database change(s) — see next message.*\n\n`
          : "") +
        `Please review the PR, test on staging, and merge. Then reply \`fixed\` in this thread.`
      );

      // 7. If DB changes are needed, post them as a separate message so they're easy to copy
      if (dbChanges.length > 0) {
        for (let i = 0; i < dbChanges.length; i++) {
          const change = dbChanges[i];
          await postToThread(
            bug.ts,
            `🗄️ *Database change ${i + 1}/${dbChanges.length} required for Bug #${bug.id}*\n\n` +
            `*What it does:* ${change.description}\n\n` +
            `*⚠️ Risk if run incorrectly:* ${change.risk}\n\n` +
            `*Run this SQL in the Supabase SQL editor (project \`wwjpdszkmtnzshbulkon\`) BEFORE or AFTER merging the PR (as noted above):*\n` +
            `\`\`\`sql\n${change.sql}\n\`\`\`\n\n` +
            `⛔ *Do NOT run this on the live DB without reviewing it first. This was generated automatically.*`
          );
        }
      }
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
