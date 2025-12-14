import { test as base, BrowserContext, Page } from '@playwright/test';
import path from 'path';
import dotenv from 'dotenv';
import type { User } from 'shared';
import { loginAsUser } from '../helpers/auth.helper';
import { addFailedMessage } from '../helpers/storage.helper';
import {
  generateTestId,
  TestDataFactory,
  type ChatInput,
} from '../helpers/test-data-factory';
import { ChatDashboardPage } from '../page-objects/chat-dashboard.page';
import { ChatMessagesPage } from '../page-objects/chat-messages.page';
import { UserSelectionPage } from '../page-objects/user-selection.page';

dotenv.config({ path: path.resolve(__dirname, '../../.env.e2e') });

const E2E_DATABASE_URL = `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@localhost:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;
const E2E_SERVER_URL = `http://localhost:${process.env.SERVER_PORT}`;
const E2E_CLIENT_URL = `http://localhost:${process.env.CLIENT_PORT}`;

type WorkerFixtures = {
  apiURL: string;
  clientURL: string;
};

export interface UserContext {
  page: Page;
  context: BrowserContext;
  userSelection: UserSelectionPage;
  dashboard: ChatDashboardPage;
  messages: ChatMessagesPage;
}

export interface TestData {
  user: User;
  otherUsers: User[];
  chats: ChatInput[];
  /** Convenience shorthand for first chat */
  chat: ChatInput;
  /** Named user access for easier destructuring */
  users: {
    user1: User;
    user2: User;
    user3: User;
    user4: User;
  };
}

interface WithFailedMessageOptions {
  chatId?: string;
  navigateToChat?: boolean;
}

type TestFixtures = {
  userSelectionPage: UserSelectionPage;
  chatDashboardPage: ChatDashboardPage;
  chatMessagesPage: ChatMessagesPage;
  testDataFactory: TestDataFactory;
  testData: TestData;
  authenticatedUser: User;
  onFirstChat: void;
  withFailedMessage: (
    content: string,
    options?: WithFailedMessageOptions,
  ) => Promise<void>;
  createUserContext: (user: User) => Promise<UserContext>;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  apiURL: [
    async ({}, use) => {
      await use(E2E_SERVER_URL);
    },
    { scope: 'worker' },
  ],

  clientURL: [
    async ({}, use) => {
      await use(E2E_CLIENT_URL);
    },
    { scope: 'worker' },
  ],

  testDataFactory: async ({}, use, testInfo) => {
    const testId = generateTestId(testInfo.title, testInfo.workerIndex);
    const factory = new TestDataFactory(E2E_DATABASE_URL, testId);

    await use(factory);

    await factory.cleanup();
    await factory.disconnect();
  },

  testData: async ({ testDataFactory }, use) => {
    // Use unique names to avoid conflicts with other tests and seed data
    const prefix = testDataFactory.getPrefix();
    const user1 = testDataFactory.createUser({ name: `Primary ${prefix}` });
    const user2 = testDataFactory.createUser({ name: `Other1 ${prefix}` });
    const user3 = testDataFactory.createUser({ name: `Other2 ${prefix}` });
    const user4 = testDataFactory.createUser({ name: `Other3 ${prefix}` });

    const chat1 = testDataFactory.createChat([user1.id, user2.id]);
    const chat2 = testDataFactory.createChat([user1.id, user3.id]);
    const chat3 = testDataFactory.createChat([user1.id, user4.id]);

    await testDataFactory.provision({
      users: [user1, user2, user3, user4],
      chats: [chat1, chat2, chat3],
    });

    await use({
      user: user1,
      otherUsers: [user2, user3, user4],
      chats: [chat1, chat2, chat3],
      chat: chat1,
      users: { user1, user2, user3, user4 },
    });
  },

  userSelectionPage: async ({ page, clientURL }, use) => {
    await use(new UserSelectionPage(page, clientURL));
  },

  chatDashboardPage: async ({ page }, use) => {
    await use(new ChatDashboardPage(page));
  },

  chatMessagesPage: async ({ page }, use) => {
    await use(new ChatMessagesPage(page));
  },

  authenticatedUser: async (
    { page, clientURL, testData, chatDashboardPage },
    use,
  ) => {
    await page.goto(clientURL);
    await loginAsUser(page, testData.user);
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();
    await use(testData.user);
  },

  onFirstChat: async (
    { authenticatedUser, chatDashboardPage, testData },
    use,
  ) => {
    await chatDashboardPage.selectChatById(testData.chats[0].id);
    await use();
  },

  withFailedMessage: async (
    { authenticatedUser, chatDashboardPage, page, testData },
    use,
  ) => {
    const addMessage = async (
      content: string,
      options?: WithFailedMessageOptions,
    ) => {
      const chatId = options?.chatId ?? testData.chats[0].id;
      const navigateToChat = options?.navigateToChat ?? true;

      await addFailedMessage(page, authenticatedUser.id, chatId, {
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

  createUserContext: async ({ browser, clientURL }, use) => {
    const contexts: UserContext[] = [];

    const factory = async (user: User): Promise<UserContext> => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const userSelection = new UserSelectionPage(page, clientURL);
      const dashboard = new ChatDashboardPage(page);
      const messages = new ChatMessagesPage(page);

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

    for (const ctx of contexts) {
      await ctx.context.close();
    }
  },
});

export { expect } from '@playwright/test';
export { API_ROUTES, UI_TEXT } from '../constants/ui-text';
export { STORAGE_KEYS } from '../helpers/storage.helper';
export type { ChatInput, MessageInput } from '../helpers/test-data-factory';
