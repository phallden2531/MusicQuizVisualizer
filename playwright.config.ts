import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node --import tsx scripts/e2e-server.mjs',
    url: 'http://127.0.0.1:3100/api/health',
    reuseExistingServer: false,
    env: {
      PORT: '3100',
      HOST_PASSWORD: 'e2e-host-password',
      SESSION_SECRET: 'e2e-session-secret-with-at-least-32-characters',
    },
  },
});
