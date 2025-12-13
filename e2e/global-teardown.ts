import { execSync } from 'child_process';
import path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');

function log(message: string) {
  console.log(`[e2e-teardown] ${message}`);
}

export default async function globalTeardown(): Promise<void> {
  // Skip teardown if E2E_KEEP_RUNNING is set (useful for debugging)
  if (process.env.E2E_KEEP_RUNNING) {
    log('Skipping teardown (E2E_KEEP_RUNNING is set)');
    return;
  }

  log('Stopping E2E environment');

  try {
    execSync(`docker compose -p e2e down -v`, {
      stdio: 'inherit',
      cwd: ROOT_DIR,
    });
    log('E2E environment stopped');
  } catch (error) {
    log(`Warning: Failed to stop docker-compose: ${error}`);
  }
}
