import { execSync } from 'child_process';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.e2e') });

const ROOT_DIR = path.resolve(__dirname, '..');

function log(message: string) {
  console.log(`[e2e-setup] ${message}`);
}

function exec(command: string) {
  log(`Running: ${command}`);
  execSync(command, { stdio: 'inherit', cwd: ROOT_DIR });
}

async function waitForService(
  url: string,
  name: string,
  maxRetries = 60,
  delayMs = 2000,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) {
        log(`${name} is ready at ${url}`);
        return;
      }
    } catch {
      // Service not ready yet
    }
    log(`Waiting for ${name} at ${url}... (${i + 1}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`${name} did not become ready in time at ${url}`);
}

export default async function globalSetup(): Promise<void> {
  // Additional wait for services to be fully ready
  await waitForService(
    `http://localhost:${process.env.SERVER_PORT}/api/chats/users`,
    'Server',
  );
  await waitForService(`http://localhost:${process.env.CLIENT_PORT}`, 'Client');

  log('E2E environment is ready');
}
