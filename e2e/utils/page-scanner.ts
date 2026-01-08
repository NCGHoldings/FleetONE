import { Page, Locator } from '@playwright/test';

export interface ScanResult {
  url: string;
  title: string;
  consoleErrors: ConsoleError[];
  networkFailures: NetworkFailure[];
  brokenButtons: BrokenElement[];
  brokenLinks: BrokenElement[];
  totalElements: number;
  scannedElements: number;
  skippedDestructive: number;
}

export interface ConsoleError {
  type: string;
  text: string;
  location?: string;
}

export interface NetworkFailure {
  url: string;
  status: number;
  statusText: string;
  method: string;
}

export interface BrokenElement {
  selector: string;
  text: string;
  error: string;
  type: 'button' | 'link';
}

// Patterns for destructive actions to skip
const DESTRUCTIVE_PATTERNS = [
  /delete/i,
  /remove/i,
  /destroy/i,
  /confirm.*delete/i,
  /submit.*payment/i,
  /pay.*now/i,
  /checkout/i,
  /purchase/i,
  /cancel.*order/i,
  /reset.*password/i,
  /sign.*out/i,
  /log.*out/i,
  /logout/i,
  /deactivate/i,
  /archive/i,
  /permanently/i,
];

// Patterns for safe actions to test
const SAFE_PATTERNS = [
  /view/i,
  /show/i,
  /open/i,
  /expand/i,
  /collapse/i,
  /toggle/i,
  /filter/i,
  /search/i,
  /sort/i,
  /refresh/i,
  /details/i,
  /info/i,
  /copy/i,
  /download/i,
  /export/i,
  /print/i,
];

function isDestructiveAction(text: string): boolean {
  return DESTRUCTIVE_PATTERNS.some(pattern => pattern.test(text));
}

function isSafeAction(text: string): boolean {
  return SAFE_PATTERNS.some(pattern => pattern.test(text));
}

export async function scanPage(page: Page, url: string, title: string): Promise<ScanResult> {
  const result: ScanResult = {
    url,
    title,
    consoleErrors: [],
    networkFailures: [],
    brokenButtons: [],
    brokenLinks: [],
    totalElements: 0,
    scannedElements: 0,
    skippedDestructive: 0,
  };

  // Collect console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      result.consoleErrors.push({
        type: msg.type(),
        text: msg.text(),
        location: msg.location()?.url,
      });
    }
  });

  // Collect uncaught exceptions
  page.on('pageerror', error => {
    result.consoleErrors.push({
      type: 'exception',
      text: error.message,
    });
  });

  // Collect network failures (status >= 400)
  page.on('response', response => {
    if (response.status() >= 400) {
      result.networkFailures.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText(),
        method: response.request().method(),
      });
    }
  });

  try {
    // Navigate to page with network idle
    await page.goto(url, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });

    // Wait a bit for dynamic content to load
    await page.waitForTimeout(2000);

    // Check if page loaded successfully (not redirected to auth)
    const currentUrl = page.url();
    if (currentUrl.includes('/auth')) {
      result.brokenLinks.push({
        selector: 'page',
        text: title,
        error: 'Redirected to auth - possible permission issue',
        type: 'link',
      });
      return result;
    }

    // Scan buttons
    await scanButtons(page, result);

    // Scan internal links
    await scanLinks(page, result);

  } catch (error) {
    result.brokenLinks.push({
      selector: 'page',
      text: title,
      error: error instanceof Error ? error.message : 'Unknown navigation error',
      type: 'link',
    });
  }

  return result;
}

async function scanButtons(page: Page, result: ScanResult): Promise<void> {
  const buttons = await page.locator('button:visible').all();
  result.totalElements += buttons.length;

  for (const button of buttons) {
    try {
      const text = await button.textContent() || '';
      const ariaLabel = await button.getAttribute('aria-label') || '';
      const buttonIdentifier = text.trim() || ariaLabel || 'unnamed button';

      // Skip destructive actions
      if (isDestructiveAction(buttonIdentifier)) {
        result.skippedDestructive++;
        continue;
      }

      // Check if button is disabled
      const isDisabled = await button.isDisabled();
      if (isDisabled) {
        result.scannedElements++;
        continue;
      }

      // Only test safe actions or do a hover test for others
      if (isSafeAction(buttonIdentifier)) {
        result.scannedElements++;
        // Try to click and check for errors
        try {
          await button.click({ timeout: 3000, force: false });
          await page.waitForTimeout(500);
        } catch (clickError) {
          result.brokenButtons.push({
            selector: await getSelector(button),
            text: buttonIdentifier,
            error: clickError instanceof Error ? clickError.message : 'Click failed',
            type: 'button',
          });
        }
      } else {
        // For non-safe buttons, just verify they're interactive
        result.scannedElements++;
        try {
          await button.hover({ timeout: 2000 });
        } catch (hoverError) {
          result.brokenButtons.push({
            selector: await getSelector(button),
            text: buttonIdentifier,
            error: 'Button not interactable: ' + (hoverError instanceof Error ? hoverError.message : 'Unknown'),
            type: 'button',
          });
        }
      }
    } catch (error) {
      // Element may have become stale, skip
    }
  }
}

async function scanLinks(page: Page, result: ScanResult): Promise<void> {
  const links = await page.locator('a[href]:visible').all();
  result.totalElements += links.length;

  for (const link of links) {
    try {
      const href = await link.getAttribute('href') || '';
      const text = await link.textContent() || '';
      const linkIdentifier = text.trim() || href;

      // Skip external links, hash links, and javascript: links
      if (
        href.startsWith('http') ||
        href.startsWith('#') ||
        href.startsWith('javascript:') ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href === ''
      ) {
        result.scannedElements++;
        continue;
      }

      // Skip destructive actions
      if (isDestructiveAction(linkIdentifier)) {
        result.skippedDestructive++;
        continue;
      }

      result.scannedElements++;

      // Check if link is clickable
      try {
        await link.hover({ timeout: 2000 });
      } catch (hoverError) {
        result.brokenLinks.push({
          selector: await getSelector(link),
          text: linkIdentifier,
          error: 'Link not interactable: ' + (hoverError instanceof Error ? hoverError.message : 'Unknown'),
          type: 'link',
        });
      }
    } catch (error) {
      // Element may have become stale, skip
    }
  }
}

async function getSelector(element: Locator): Promise<string> {
  try {
    const id = await element.getAttribute('id');
    if (id) return `#${id}`;

    const className = await element.getAttribute('class');
    const text = await element.textContent();
    
    if (text?.trim()) {
      return `"${text.trim().substring(0, 30)}..."`;
    }
    
    if (className) {
      return `.${className.split(' ')[0]}`;
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export function generateSummary(results: ScanResult[]): string {
  const totalPages = results.length;
  const pagesWithErrors = results.filter(r => 
    r.consoleErrors.length > 0 || 
    r.networkFailures.length > 0 || 
    r.brokenButtons.length > 0 || 
    r.brokenLinks.length > 0
  ).length;
  
  const totalConsoleErrors = results.reduce((sum, r) => sum + r.consoleErrors.length, 0);
  const totalNetworkFailures = results.reduce((sum, r) => sum + r.networkFailures.length, 0);
  const totalBrokenButtons = results.reduce((sum, r) => sum + r.brokenButtons.length, 0);
  const totalBrokenLinks = results.reduce((sum, r) => sum + r.brokenLinks.length, 0);
  const totalElementsScanned = results.reduce((sum, r) => sum + r.scannedElements, 0);
  const totalSkippedDestructive = results.reduce((sum, r) => sum + r.skippedDestructive, 0);

  let summary = `
╔══════════════════════════════════════════════════════════════╗
║                    SYSTEM SCAN SUMMARY                        ║
╠══════════════════════════════════════════════════════════════╣
║  Pages Scanned:        ${String(totalPages).padStart(6)}                              ║
║  Pages with Issues:    ${String(pagesWithErrors).padStart(6)}                              ║
║  Elements Scanned:     ${String(totalElementsScanned).padStart(6)}                              ║
║  Destructive Skipped:  ${String(totalSkippedDestructive).padStart(6)}                              ║
╠══════════════════════════════════════════════════════════════╣
║  Console Errors:       ${String(totalConsoleErrors).padStart(6)}                              ║
║  Network Failures:     ${String(totalNetworkFailures).padStart(6)}                              ║
║  Broken Buttons:       ${String(totalBrokenButtons).padStart(6)}                              ║
║  Broken Links:         ${String(totalBrokenLinks).padStart(6)}                              ║
╚══════════════════════════════════════════════════════════════╝
`;

  if (pagesWithErrors > 0) {
    summary += '\n\n📋 DETAILED ISSUES BY PAGE:\n';
    summary += '═'.repeat(60) + '\n';

    for (const result of results) {
      const hasIssues = 
        result.consoleErrors.length > 0 || 
        result.networkFailures.length > 0 || 
        result.brokenButtons.length > 0 || 
        result.brokenLinks.length > 0;

      if (hasIssues) {
        summary += `\n📄 ${result.title} (${result.url})\n`;
        summary += '-'.repeat(50) + '\n';

        if (result.consoleErrors.length > 0) {
          summary += '  🔴 Console Errors:\n';
          for (const err of result.consoleErrors) {
            summary += `     • ${err.text.substring(0, 100)}\n`;
          }
        }

        if (result.networkFailures.length > 0) {
          summary += '  🟠 Network Failures:\n';
          for (const fail of result.networkFailures) {
            summary += `     • ${fail.method} ${fail.url.substring(0, 60)} → ${fail.status}\n`;
          }
        }

        if (result.brokenButtons.length > 0) {
          summary += '  🔵 Broken Buttons:\n';
          for (const btn of result.brokenButtons) {
            summary += `     • ${btn.text}: ${btn.error.substring(0, 50)}\n`;
          }
        }

        if (result.brokenLinks.length > 0) {
          summary += '  🟣 Broken Links:\n';
          for (const link of result.brokenLinks) {
            summary += `     • ${link.text}: ${link.error.substring(0, 50)}\n`;
          }
        }
      }
    }
  }

  return summary;
}
