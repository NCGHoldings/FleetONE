import { supabase } from '@/integrations/supabase/client';

// ══════════════════════════════════════════════════════════════════════════
// AUTO ISSUE DETECTOR — Fully Automatic System Issue Detection
// 
// This module intercepts ALL Supabase API calls globally using a fetch
// wrapper. No manual integration needed — just install once and it catches:
//   ✓ 404 errors (missing tables/columns)
//   ✓ 400 errors (bad requests, RLS violations)
//   ✓ 500 errors (server errors)
//   ✓ Empty dropdown data
//   ✓ Uncaught JS errors and promise rejections
// ══════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// ── Deduplication ──────────────────────────────────────────────────────────
const recentIssueKeys = new Set<string>();
const DEDUP_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isDuplicate(key: string): boolean {
  if (recentIssueKeys.has(key)) return true;
  recentIssueKeys.add(key);
  setTimeout(() => recentIssueKeys.delete(key), DEDUP_WINDOW_MS);
  return false;
}

// ── Issue Logger ───────────────────────────────────────────────────────────
async function logIssue(params: {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  error_message?: string;
  auto_diagnosis: string;
  suggested_fix: string;
}) {
  const dedupKey = `${params.category}:${params.title}`.toLowerCase();
  if (isDuplicate(dedupKey)) return;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // Don't log if not authenticated

    await (supabase as any).from('system_issues').insert({
      title: params.title.substring(0, 200),
      description: params.description,
      category: params.category,
      priority: params.priority,
      status: 'diagnosed',
      page_url: window.location.pathname,
      page_name: window.location.pathname,
      error_message: params.error_message || null,
      auto_diagnosis: params.auto_diagnosis,
      suggested_fix: params.suggested_fix,
      is_auto_diagnosed: true,
      reported_by: user.id,
      reporter_name: '🤖 System Auto-Detector',
      browser_info: navigator.userAgent.substring(0, 200),
    });
    console.log(`%c[AutoIssue] ✅ Logged: ${params.title}`, 'color: #22c55e; font-weight: bold');
  } catch (err) {
    // Silently fail — never let issue logging break the app
    console.warn('[AutoIssue] Failed to log:', err);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// INTERCEPTOR 1: Global Fetch Interceptor for Supabase API Calls
// ══════════════════════════════════════════════════════════════════════════
// Automatically catches ALL Supabase API errors by wrapping window.fetch.
// This is the core — requires ZERO changes to existing code.

function installFetchInterceptor() {
  const originalFetch = window.fetch;

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url || '';

    // Only intercept Supabase REST API calls
    if (!url.includes(SUPABASE_URL) || !url.includes('/rest/v1/')) {
      return originalFetch.apply(this, args);
    }

    try {
      const response = await originalFetch.apply(this, args);

      // Extract table name from URL: /rest/v1/table_name?...
      const tableName = url.split('/rest/v1/')[1]?.split('?')[0] || 'unknown';
      const method = (args[1] as RequestInit)?.method || 'GET';

      // ── Catch 404: Table/column doesn't exist ──────────────────
      if (response.status === 404) {
        logIssue({
          title: `Missing table: "${tableName}" does not exist`,
          description: `A ${method} request to table "${tableName}" returned 404 (Not Found). This table is referenced in the code but doesn't exist in the database schema.`,
          category: 'data_missing',
          priority: 'critical',
          error_message: `404 Not Found: ${tableName}`,
          auto_diagnosis: `The table "${tableName}" does not exist in the Supabase database. This is a code-database sync issue — the frontend code references a table that hasn't been created yet.`,
          suggested_fix: `1. Create the "${tableName}" table in Supabase SQL Editor.\n2. Add appropriate columns and RLS policies.\n3. If the table was renamed, update the code to use the new name.`,
        });
      }

      // ── Catch 400: Bad request (column doesn't exist, RLS, etc) ──
      if (response.status === 400) {
        // Clone response to read body without consuming it
        const clone = response.clone();
        try {
          const body = await clone.json();
          const errorMsg = body?.message || body?.error || JSON.stringify(body);

          if (errorMsg.includes('does not exist')) {
            // Column doesn't exist
            const colMatch = errorMsg.match(/column\s+"?(\w+)"?\s+/i) || 
                             errorMsg.match(/(\w+)\s+does not exist/i);
            const colName = colMatch?.[1] || 'unknown column';

            logIssue({
              title: `Missing column: "${colName}" in "${tableName}"`,
              description: `Table "${tableName}" doesn't have the column "${colName}". The code references a column that doesn't exist in the database.`,
              category: 'data_missing',
              priority: 'high',
              error_message: errorMsg,
              auto_diagnosis: `The column "${colName}" does not exist in table "${tableName}". Either the column was never created, was renamed, or was deleted.`,
              suggested_fix: `1. Add the "${colName}" column to "${tableName}" in Supabase.\n2. Check if the column name has a typo in the code.\n3. If schema changed, update the code to match.`,
            });
          } else {
            logIssue({
              title: `API Error on "${tableName}" (${method})`,
              description: `A ${method} request to "${tableName}" returned 400 Bad Request.`,
              category: 'submission_failure',
              priority: 'medium',
              error_message: errorMsg?.substring(0, 500),
              auto_diagnosis: `A bad request was sent to table "${tableName}". Common causes: invalid data types, constraint violations, or malformed queries.`,
              suggested_fix: `1. Check the request payload format matches the table schema.\n2. Verify all required columns are being sent.\n3. Check browser console for the full error details.`,
            });
          }
        } catch {
          // Couldn't parse body, skip
        }
      }

      // ── Catch 403: Permission denied (RLS) ─────────────────────
      if (response.status === 403) {
        logIssue({
          title: `Permission denied: "${tableName}" (${method})`,
          description: `RLS policy is blocking ${method} access to "${tableName}" for the current user.`,
          category: 'submission_failure',
          priority: 'high',
          error_message: `403 Forbidden on ${tableName}`,
          auto_diagnosis: `Row Level Security (RLS) policies are blocking ${method} access to "${tableName}". The current user's role doesn't have the required permissions.`,
          suggested_fix: `1. Check RLS policies on "${tableName}" in Supabase dashboard.\n2. Add a policy for the ${method} operation.\n3. Verify the user's role has the needed access.`,
        });
      }

      // ── Catch 500: Server error ────────────────────────────────
      if (response.status >= 500) {
        logIssue({
          title: `Server error on "${tableName}" (${method})`,
          description: `A ${method} request to "${tableName}" returned a server error (${response.status}).`,
          category: 'page_crash',
          priority: 'critical',
          error_message: `${response.status} Server Error on ${tableName}`,
          auto_diagnosis: `A server-side error occurred while accessing "${tableName}". This could be a database issue, a trigger error, or a Supabase infrastructure problem.`,
          suggested_fix: `1. Check Supabase dashboard logs for server errors.\n2. Check database triggers on "${tableName}" for bugs.\n3. If persistent, check Supabase status page for outages.`,
        });
      }

      return response;
    } catch (networkError) {
      // Network failures (offline, DNS, etc.)
      return originalFetch.apply(this, args);
    }
  };

  console.log('%c[AutoIssue] 🔍 Fetch interceptor installed — monitoring all Supabase API calls', 'color: #a855f7; font-weight: bold');
}

// ══════════════════════════════════════════════════════════════════════════
// INTERCEPTOR 2: Global JavaScript Error Handler
// ══════════════════════════════════════════════════════════════════════════

function installErrorHandler() {
  // Uncaught errors
  window.addEventListener('error', (event) => {
    // Ignore errors from extensions or other origins
    if (event.filename && !event.filename.includes(window.location.origin)) return;

    // Suppress native browser crash logs for handled errors
    event.preventDefault();

    logIssue({
      title: `JS Error: ${(event.message || 'Unknown error').substring(0, 100)}`,
      description: `An uncaught JavaScript error occurred. File: ${event.filename || 'unknown'}, Line: ${event.lineno || '?'}`,
      category: 'page_crash',
      priority: 'high',
      error_message: `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
      auto_diagnosis: 'An uncaught JavaScript error occurred. This may cause parts of the page to break or become unresponsive.',
      suggested_fix: `1. Check ${event.filename} at line ${event.lineno}.\n2. This may be caused by accessing undefined/null properties.\n3. Add error boundaries around the affected component.`,
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    // Suppress native browser crash logs for unhandled promises
    event.preventDefault();
    
    const reason = event.reason?.message || event.reason?.toString?.() || 'Unknown rejection';
    // Skip Supabase fetch errors (already caught by fetch interceptor)
    if (reason.includes('FetchError') || reason.includes('NetworkError') || reason.includes('Failed to fetch')) return;

    logIssue({
      title: `Async Error: ${reason.substring(0, 100)}`,
      description: `An unhandled async error occurred on page ${window.location.pathname}.`,
      category: 'page_crash',
      priority: 'medium',
      error_message: reason.substring(0, 500),
      auto_diagnosis: 'An async operation failed without proper error handling.',
      suggested_fix: `1. Add try-catch blocks around async operations.\n2. Add .catch() handlers to all Promises.\n3. Use React Query error boundaries for data fetching.`,
    });
  });

  console.log('%c[AutoIssue] 💥 Error handler installed — catching uncaught JS errors', 'color: #ef4444; font-weight: bold');
}

// ══════════════════════════════════════════════════════════════════════════
// INTERCEPTOR 3: Empty Dropdown DOM Scanner
// ══════════════════════════════════════════════════════════════════════════
// Scans the page for dropdown/select elements that rendered with 0 options.
// This catches the case where Supabase returns 200 OK but with empty data
// (e.g., GL Account Mapping dropdowns have no chart_of_accounts linked).

const scannedDropdowns = new Set<string>();

function scanForEmptyDropdowns() {
  const pagePath = window.location.pathname;

  // Strategy 1: Find all select-trigger elements (ShadCN Select components)
  // and check if their text is a placeholder (starts with "Select")
  document.querySelectorAll('[role="combobox"], [data-slot="select-trigger"]').forEach((el) => {
    const triggerText = (el as HTMLElement).innerText?.trim() || '';
    const isPlaceholder = /^select\s/i.test(triggerText) || triggerText === '' || triggerText === 'undefined';
    
    if (!isPlaceholder) return; // Has a real selection, skip

    // Find the label for this dropdown
    const container = el.closest('.space-y-2, .grid, [class*="form"]');
    const label = container?.querySelector('label')?.innerText?.trim() || 
                  el.getAttribute('aria-label') || 
                  triggerText || 'Unknown field';
    
    const dropdownKey = `${pagePath}:${label}`;
    if (scannedDropdowns.has(dropdownKey)) return;
    scannedDropdowns.add(dropdownKey);
    
    // Delayed check — give the data 3 seconds to load before flagging
    setTimeout(() => {
      // Re-check: is it still a placeholder?
      const currentText = (el as HTMLElement).innerText?.trim() || '';
      const stillPlaceholder = /^select\s/i.test(currentText) || currentText === '' || currentText === 'undefined';
      
      if (!stillPlaceholder) {
        scannedDropdowns.delete(dropdownKey); // Data loaded, remove from scanned
        return;
      }

      // Check if dropdown popup has items by simulating a click check
      // Look for any nearby "No results" or "No options" text
      const popoverContent = document.querySelector('[role="listbox"], [data-radix-popper-content-wrapper]');
      const hasNoResults = popoverContent?.textContent?.includes('No results') || false;

      logIssue({
        title: `Empty dropdown: "${label}" on ${pagePath}`,
        description: `The "${label}" dropdown on page ${pagePath} has no selectable options. ${hasNoResults ? 'The dropdown shows "No results found".' : 'The dropdown appears to have no data loaded.'} This may indicate missing data or a broken data link.`,
        category: 'dropdown_empty',
        priority: 'high',
        auto_diagnosis: `The "${label}" dropdown is empty on ${pagePath}. Possible causes:\n1. The source data table has no records.\n2. The lookup/reference table is not linked to this page correctly.\n3. RLS policies may be blocking the data fetch.\n4. The required seed data hasn't been created yet.`,
        suggested_fix: `1. Check which table feeds the "${label}" dropdown.\n2. Verify that table has data in Supabase Table Editor.\n3. If it's a GL Account dropdown, ensure Chart of Accounts has entries.\n4. If it's a Category dropdown, create categories first.\n5. Check RLS policies allow SELECT for authenticated users.`,
      });
    }, 4000); // Wait 4 seconds for data to load
  });
}

function installDomScanner() {
  // Scan when dialogs/modals open (which is when dropdowns become visible)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node instanceof HTMLElement) {
          // Trigger scan when dialog/form content is added to DOM
          if (node.querySelector?.('[role="dialog"], [role="combobox"], form, [data-slot="select-trigger"]') || 
              node.getAttribute?.('role') === 'dialog') {
            // Delay scan to let data queries complete
            setTimeout(scanForEmptyDropdowns, 3000);
          }
        }
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Also scan after initial page load and on navigation
  let lastPath = window.location.pathname;
  setInterval(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      scannedDropdowns.clear(); // Reset for new page
    }
  }, 1000);

  console.log('%c[AutoIssue] 👁️ DOM scanner installed — watching for empty dropdowns', 'color: #f59e0b; font-weight: bold');
}

// ══════════════════════════════════════════════════════════════════════════
// PUBLIC API: Install all interceptors
// ══════════════════════════════════════════════════════════════════════════

let installed = false;

export function installGlobalErrorHandler() {
  if (installed) return;
  installed = true;

  installFetchInterceptor();
  installErrorHandler();
  installDomScanner();

  console.log('%c[AutoIssue] 🚀 System Issue Auto-Detector is ACTIVE', 'color: #22c55e; font-weight: bold; font-size: 14px');
}

// ── Manual detection helpers (for specific use cases) ──────────────────
export { logIssue as autoLogIssue };

export function detectEmptyDropdown(params: {
  fieldName: string;
  data: any[] | null | undefined;
  hasCreateOption: boolean;
  pageUrl: string;
  pageName: string;
  tableName?: string;
}) {
  const { fieldName, data, hasCreateOption, pageUrl, pageName, tableName } = params;
  if (data && data.length > 0) return;
  if (hasCreateOption) return;

  logIssue({
    title: `Empty dropdown: "${fieldName}" has no options`,
    description: `The "${fieldName}" dropdown on ${pageName} loaded with 0 options. ${tableName ? `Source table: ${tableName}. ` : ''}Users cannot select any value.`,
    category: 'dropdown_empty',
    priority: 'high',
    auto_diagnosis: `The "${fieldName}" dropdown is empty. The data source has no records, or RLS policies are blocking reads.`,
    suggested_fix: `1. Check if ${tableName || 'the source table'} has data in Supabase.\n2. Verify RLS SELECT policies.\n3. Add a "Create New" option so users can add entries.`,
  });
}

export function detectSupabaseError(params: {
  error: any;
  operation: string;
  tableName: string;
  pageUrl: string;
  pageName: string;
}) {
  if (!params.error) return;
  const { error, operation, tableName } = params;
  const errorMessage = error.message || 'Unknown error';

  logIssue({
    title: `DB Error: ${operation} on "${tableName}" failed`,
    description: `A database ${operation} on "${tableName}" failed.`,
    category: 'submission_failure',
    priority: 'medium',
    error_message: `[${error.code || ''}] ${errorMessage}`,
    auto_diagnosis: `Database operation "${operation}" failed on table "${tableName}": ${errorMessage}`,
    suggested_fix: `1. Check Supabase logs for details.\n2. Verify RLS policies for ${operation}.\n3. Check the query parameters.`,
  });
}
