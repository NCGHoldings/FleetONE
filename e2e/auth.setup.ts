import { test as setup, expect } from '@playwright/test';
import path from 'path';

const authFile = path.join(process.cwd(), 'e2e', '.auth', 'user.json');

setup('authenticate', async ({ page }) => {
  // Get credentials from environment variables
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be set.\n' +
      'Create a .env.test file or set them in your environment.'
    );
  }

  // Navigate to login page
  await page.goto('/auth');
  
  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Fill in credentials
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click sign in button
  await page.click('button[type="submit"]');

  // Wait for successful redirect to dashboard
  await page.waitForURL('/', { timeout: 30000 });
  
  // Verify we're logged in by checking for dashboard content
  await expect(page.locator('body')).not.toContainText('Sign in');

  // Save authentication state
  await page.context().storageState({ path: authFile });
  
  console.log('✅ Authentication successful, session saved');
});
