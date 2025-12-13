import { execSync } from 'child_process';
import path from 'path';

const ROOT_DIR = path.resolve(__dirname, '..');

// Environment variables, see .env.example
export const ENV = {
  POSTGRES_USER: 'chatapp',
  POSTGRES_PASSWORD: 'chatapp',
  POSTGRES_DB: 'chatapp_e2e',
  POSTGRES_PORT: '5442',
  REDIS_PORT: '6389',
  SERVER_PORT: '3021',
  WS_PORT: '3022',
  CLIENT_PORT: '5193',
  CORS_ORIGINS: 'http://localhost:5193',
};

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
    log(`Waiting for ${name}... (${i + 1}/${maxRetries})`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`${name} did not become ready in time at ${url}`);
}

export default async function globalSetup(): Promise<void> {
  log('Starting E2E environment with docker-compose');

  const envVars = Object.entries(ENV)
    .map(([key, value]) => `${key}=${value}`)
    .join(' ');

  // Start all services
  exec(`${envVars} docker compose -p e2e up -d --build --wait`);

  // Additional wait for services to be fully ready
  await waitForService(
    `http://localhost:${ENV.SERVER_PORT}/api/chats/users`,
    'Server',
  );
  await waitForService(`http://localhost:${ENV.CLIENT_PORT}`, 'Client');

  log('E2E environment is ready');
}
