export const APP_VERSION = "1.4.0";
export const BUILD_DATE = new Date().toISOString();

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: {
    type: 'feature' | 'fix' | 'improvement';
    description: string;
  }[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.4.0",
    date: "2026-04-03",
    title: "Trial Balance & Proforma Invoice",
    changes: [
      { type: "feature", description: "Proforma Invoice toggle on Special Hire quotation preview" },
      { type: "fix", description: "Trial Balance now correctly calculates opening/period/closing balances from journal entries" },
      { type: "fix", description: "Financial periods auto-seeded (Oct 2025 – Apr 2026)" },
      { type: "feature", description: "App version display & What's New changelog" },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-04-02",
    title: "Landed Cost & COA Fixes",
    changes: [
      { type: "feature", description: "Landed Cost voucher posting creates proper balanced journal entries (DR Inventory / CR Expense)" },
      { type: "fix", description: "Chart of Accounts: Level 1 creation restricted to 6 standard categories only" },
      { type: "fix", description: "Orphaned bank account removed and journal entries reassigned" },
      { type: "improvement", description: "Account type auto-derived from parent account" },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-04-01",
    title: "Test Mode Data Leak Fix",
    changes: [
      { type: "fix", description: "Special Hire finance approval now uses effective company ID instead of hardcoded live company" },
      { type: "fix", description: "Test mode approvals no longer write to live General Ledger" },
      { type: "improvement", description: "Company context properly threaded through all 11 GL posting locations" },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-28",
    title: "Special Hire & Yutong Flows",
    changes: [
      { type: "feature", description: "Complete Special Hire quotation-to-settlement workflow" },
      { type: "feature", description: "Yutong bus sales flow with 5 journal entry types" },
      { type: "improvement", description: "Workflow column performance optimization" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-03-15",
    title: "Initial Release",
    changes: [
      { type: "feature", description: "Fleet management dashboard with real-time tracking" },
      { type: "feature", description: "Full accounting module: GL, AR, AP, Fixed Assets" },
      { type: "feature", description: "Special Hire booking and quotation system" },
      { type: "feature", description: "Multi-company support with test mode" },
    ],
  },
];
