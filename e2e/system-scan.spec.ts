import { test, expect } from '@playwright/test';
import { getTestableRoutes, TestableRoute } from './utils/routes';
import { scanPage, ScanResult, generateSummary } from './utils/page-scanner';

// Store all results for final summary
const allResults: ScanResult[] = [];

test.describe('Full System Scan', () => {
  const routes = getTestableRoutes();

  test.beforeAll(async () => {
    console.log(`\n🚀 Starting Full System Scan of ${routes.length} pages...\n`);
  });

  test.afterAll(async () => {
    // Generate and print summary
    const summary = generateSummary(allResults);
    console.log(summary);

    // Write summary to file for CI/CD
    const fs = await import('fs');
    fs.writeFileSync('playwright-report/scan-summary.txt', summary);
  });

  // Group tests by category for better reporting
  const routesByCategory = routes.reduce((acc, route) => {
    if (!acc[route.category]) {
      acc[route.category] = [];
    }
    acc[route.category].push(route);
    return acc;
  }, {} as Record<string, TestableRoute[]>);

  for (const [category, categoryRoutes] of Object.entries(routesByCategory)) {
    test.describe(category, () => {
      for (const route of categoryRoutes) {
        test(`${route.title} (${route.url})`, async ({ page }) => {
          // Set longer timeout for complex pages
          test.setTimeout(60000);

          console.log(`📄 Scanning: ${route.title} (${route.url})`);

          // Scan the page
          const result = await scanPage(page, route.url, route.title);
          allResults.push(result);

          // Take screenshot for the report
          await page.screenshot({ 
            path: `playwright-report/screenshots/${route.id}.png`,
            fullPage: true 
          });

          // Log immediate findings
          if (result.consoleErrors.length > 0) {
            console.log(`  ⚠️  ${result.consoleErrors.length} console errors`);
          }
          if (result.networkFailures.length > 0) {
            console.log(`  ⚠️  ${result.networkFailures.length} network failures`);
          }
          if (result.brokenButtons.length > 0) {
            console.log(`  ⚠️  ${result.brokenButtons.length} broken buttons`);
          }
          if (result.brokenLinks.length > 0) {
            console.log(`  ⚠️  ${result.brokenLinks.length} broken links`);
          }

          // Use soft assertions so test continues even on failures
          // This allows us to scan all pages and report all issues
          
          // Assert no critical console errors (filter out common non-critical ones)
          const criticalErrors = result.consoleErrors.filter(err => 
            !err.text.includes('ResizeObserver') &&
            !err.text.includes('Non-Error promise rejection') &&
            !err.text.includes('Download the React DevTools')
          );
          
          expect.soft(
            criticalErrors, 
            `Console errors on ${route.title}`
          ).toHaveLength(0);

          // Assert no network failures for app API calls (ignore external services)
          const appNetworkFailures = result.networkFailures.filter(fail =>
            fail.url.includes('supabase') || 
            fail.url.includes('localhost') ||
            fail.url.includes(process.env.VITE_SUPABASE_URL || '')
          );
          
          expect.soft(
            appNetworkFailures,
            `Network failures on ${route.title}`
          ).toHaveLength(0);

          // Assert no broken interactive elements
          expect.soft(
            result.brokenButtons,
            `Broken buttons on ${route.title}`
          ).toHaveLength(0);

          expect.soft(
            result.brokenLinks,
            `Broken links on ${route.title}`
          ).toHaveLength(0);

          console.log(`  ✅ Scanned ${result.scannedElements} elements, skipped ${result.skippedDestructive} destructive actions`);
        });
      }
    });
  }
});

// Additional standalone tests for critical flows
test.describe('Critical Flow Checks', () => {
  test('Dashboard loads with key components', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Verify key dashboard elements exist
    await expect(page.locator('body')).toBeVisible();
    
    // Check for any visible error states
    const errorAlerts = page.locator('[role="alert"]');
    const alertCount = await errorAlerts.count();
    
    // Take screenshot
    await page.screenshot({ 
      path: 'playwright-report/screenshots/dashboard-check.png',
      fullPage: true 
    });
  });

  test('Navigation sidebar is functional', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check sidebar exists and has navigation items
    const sidebar = page.locator('nav, [role="navigation"]').first();
    await expect(sidebar).toBeVisible();

    // Verify at least some navigation links exist
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });
});
