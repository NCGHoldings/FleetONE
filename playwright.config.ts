import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// Auth file location for session reuse
const authFile = path.join(__dirname, 'e2e/.auth/user.json');

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run sequentially for system scan
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for predictable scanning
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  
  // Global timeout for each test
  timeout: 60000,
  
  // Expect timeout
  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: 'http://localhost:8080',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Viewport for consistent screenshots
    viewport: { width: 1920, height: 1080 },
    // Slow down actions for visibility in headed mode
    actionTimeout: 10000,
  },

  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Main test project that depends on setup
    {
      name: 'system-scan',
      testMatch: /system-scan\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
    },
    // Chromium for general testing
    {
      name: 'chromium',
      testIgnore: [/auth\.setup\.ts/, /system-scan\.spec\.ts/],
      use: { 
        ...devices['Desktop Chrome'],
        storageState: authFile,
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  // Output directories
  outputDir: 'playwright-report/test-results',
});
