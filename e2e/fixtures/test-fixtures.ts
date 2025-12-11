import { test as base, BrowserContext, Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'child_process';
import getPort, { portNumbers } from 'get-port';
import path from 'path';
import treeKill from 'tree-kill';
import type { User } from 'shared';
import { loginAsUser } from '../helpers/auth.helper';
import { addFailedMessage } from '../helpers/storage.helper';
import { ChatDashboardPage } from '../page-objects/chat-dashboard.page';
import { ChatMessagesPage } from '../page-objects/chat-messages.page';
import { UserSelectionPage } from '../page-objects/user-selection.page';
import { TestUsers } from '../data/test-data';

type WorkerFixtures = {
  serverPort: number;
  clientPort: number;
  serverProcess: ChildProcess;
  clientProcess: ChildProcess;
  apiURL: string;
  clientURL: string;
};

/**
 * Context for a single user session with all page objects
 */
export interface UserContext {
  page: Page;
  context: BrowserContext;
  userSelection: UserSelectionPage;
  dashboard: ChatDashboardPage;
  messages: ChatMessagesPage;
}

interface WithFailedMessageOptions {
  /** Chat ID to add the failed message to. Defaults to 'c1' */
  chatId?: string;
  /** Whether to navigate to the chat after adding the message. Defaults to true */
  navigateToChat?: boolean;
}

type TestFixtures = {
  userSelectionPage: UserSelectionPage;
  chatDashboardPage: ChatDashboardPage;
  chatMessagesPage: ChatMessagesPage;
  authenticatedAsJohn: void;
  authenticatedAsAlice: void;
  /** Authenticate as John and wait for chats to load */
  johnWithChatsLoaded: void;
  /** Navigate to Alice's chat (c1) after authentication */
  onAliceChat: void;
  /** Add a failed message, reload page, and wait for chats to load */
  withFailedMessage: (
    content: string,
    options?: WithFailedMessageOptions,
  ) => Promise<void>;
  /**
   * Factory to create isolated user contexts for multi-user testing.
   * Each context has its own browser context, page, and page objects.
   */
  createUserContext: (user: User) => Promise<UserContext>;
};

async function waitForServer(url: string, timeout = 30000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}

function spawnServer(
  port: number,
  cwd: string,
  clientURL: string,
): ChildProcess {
  const proc = spawn('npm', ['run', 'dev', '--workspace=server'], {
    cwd,
    env: { ...process.env, PORT: String(port), CORS_ORIGINS: clientURL },
    stdio: 'pipe',
    shell: true,
  });

  proc.stdout?.on('data', (data) => {
    if (process.env.DEBUG_SERVER) console.log(`[server:${port}] ${data}`);
  });
  proc.stderr?.on('data', (data) => {
    if (process.env.DEBUG_SERVER) console.error(`[server:${port}] ${data}`);
  });

  return proc;
}

function spawnClient(port: number, apiPort: number, cwd: string): ChildProcess {
  const proc = spawn(
    'npm',
    ['run', 'dev', '--workspace=web-client', '--', '--port', String(port)],
    {
      cwd,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        VITE_API_URL: `http://localhost:${apiPort}`,
      },
      stdio: 'pipe',
      shell: true,
    },
  );

  proc.stdout?.on('data', (data) => {
    if (process.env.DEBUG_CLIENT) console.log(`[client:${port}] ${data}`);
  });
  proc.stderr?.on('data', (data) => {
    if (process.env.DEBUG_CLIENT) console.error(`[client:${port}] ${data}`);
  });

  return proc;
}

function killProcess(proc: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (!proc || proc.pid === undefined || proc.killed) {
      return resolve();
    }

    treeKill(proc.pid, 'SIGTERM', (err) => {
      if (err) {
        // If tree-kill fails, try a force kill
        treeKill(proc.pid!, 'SIGKILL');
      }
      resolve();
    });
  });
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Worker-scoped fixtures (shared across all tests in a worker)
  serverPort: [
    async ({}, use, workerInfo) => {
      await use(
        await getPort({
          host: 'localhost',
          port: portNumbers(
            3001 + workerInfo.parallelIndex * 20,
            3001 + (workerInfo.parallelIndex + 1) * 20,
          ),
        }),
      );
    },
    { scope: 'worker' },
  ],

  clientPort: [
    async ({}, use, workerInfo) => {
      await use(
        await getPort({
          host: 'localhost',
          port: portNumbers(5100 + workerInfo.parallelIndex, 5200),
        }),
      );
    },
    { scope: 'worker' },
  ],

  serverProcess: [
    async ({ serverPort, clientURL }, use) => {
      const cwd = path.resolve(__dirname, '../..');
      const proc = spawnServer(serverPort, cwd, clientURL);

      await waitForServer(`http://localhost:${serverPort}/api/chats/users`);

      await use(proc);

      await killProcess(proc);
    },
    { scope: 'worker' },
  ],

  clientProcess: [
    async ({ clientPort, serverPort, serverProcess }, use) => {
      // serverProcess dependency ensures server starts first
      const cwd = path.resolve(__dirname, '../..');
      const proc = spawnClient(clientPort, serverPort, cwd);

      await waitForServer(`http://localhost:${clientPort}`);

      await use(proc);

      await killProcess(proc);
    },
    { scope: 'worker' },
  ],

  apiURL: [
    async ({ serverPort }, use) => {
      await use(`http://localhost:${serverPort}`);
    },
    { scope: 'worker' },
  ],

  clientURL: [
    async ({ clientPort }, use) => {
      await use(`http://localhost:${clientPort}`);
    },
    { scope: 'worker' },
  ],

  page: [
    async ({ browser }, use) => {
      await use(await browser.newPage());
    },
    { scope: 'test' },
  ],

  // Test-scoped fixtures - page objects need clientURL and clientProcess
  userSelectionPage: async (
    { page, clientURL, clientProcess, serverProcess },
    use,
  ) => {
    await use(new UserSelectionPage(page, clientURL));
  },

  chatDashboardPage: async (
    { page, clientURL, clientProcess, serverProcess },
    use,
  ) => {
    // clientProcess dependency ensures client is running
    await use(new ChatDashboardPage(page));
  },

  chatMessagesPage: async ({ page, clientURL, clientProcess }, use) => {
    // clientProcess dependency ensures client is running
    await use(new ChatMessagesPage(page));
  },

  authenticatedAsJohn: async ({ page, clientURL, clientProcess }, use) => {
    // clientProcess dependency ensures client is running
    await page.goto(clientURL);
    await loginAsUser(page, TestUsers.john);
    await page.reload();
    await use();
  },

  authenticatedAsAlice: async ({ page, clientURL, clientProcess }, use) => {
    // clientProcess dependency ensures client is running
    await page.goto(clientURL);
    await loginAsUser(page, TestUsers.alice);
    await page.reload();
    await use();
  },

  johnWithChatsLoaded: async (
    { authenticatedAsJohn, chatDashboardPage },
    use,
  ) => {
    await chatDashboardPage.waitForChatsToLoad();
    await use();
  },

  onAliceChat: async ({ johnWithChatsLoaded, chatDashboardPage }, use) => {
    await chatDashboardPage.selectChatById('c1');
    await use();
  },

  withFailedMessage: async (
    { authenticatedAsJohn, chatDashboardPage, page },
    use,
  ) => {
    const addMessage = async (
      content: string,
      options?: WithFailedMessageOptions,
    ) => {
      const chatId = options?.chatId ?? 'c1';
      const navigateToChat = options?.navigateToChat ?? true;

      await addFailedMessage(page, TestUsers.john.id, chatId, {
        content,
        error: true,
      });
      await page.reload();
      await chatDashboardPage.waitForChatsToLoad();

      if (navigateToChat) {
        await chatDashboardPage.selectChatById(chatId);
      }
    };
    await use(addMessage);
  },

  createUserContext: async (
    { browser, clientURL, clientProcess, serverProcess },
    use,
  ) => {
    const contexts: UserContext[] = [];

    const factory = async (user: User): Promise<UserContext> => {
      const context = await browser.newContext();
      const page = await context.newPage();

      // Set up page objects
      const userSelection = new UserSelectionPage(page, clientURL);
      const dashboard = new ChatDashboardPage(page);
      const messages = new ChatMessagesPage(page);

      // Navigate and login
      await page.goto(clientURL);
      await loginAsUser(page, user);
      await page.reload();

      const userContext: UserContext = {
        page,
        context,
        userSelection,
        dashboard,
        messages,
      };

      contexts.push(userContext);
      return userContext;
    };

    await use(factory);

    // Cleanup all created contexts
    for (const ctx of contexts) {
      await ctx.context.close();
    }
  },
});

export { expect } from '@playwright/test';
export { TestUsers } from '../data/test-data';
export { STORAGE_KEYS } from '../helpers/storage.helper';
export { UI_TEXT, API_ROUTES } from '../constants/ui-text';
