import { defineConfig, devices } from '@playwright/test';
import path from 'path';

const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  forbidOnly: isCI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
