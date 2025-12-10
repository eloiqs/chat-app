import { Page } from '@playwright/test';

export const STORAGE_KEYS = {
  USER: 'chat-app-user',
  FAILED_MESSAGES_PREFIX: 'chat-failed-messages',
} as const;

const FAILED_MESSAGES_PREFIX = STORAGE_KEYS.FAILED_MESSAGES_PREFIX;

interface FailedMessage {
  id: string;
  chatId: string;
  content: string;
  timestamp: string;
  sender: { id: string; name: string; avatar?: string };
  isCurrentUser: boolean;
  error: boolean;
  sending: boolean;
}

export async function addFailedMessage(
  page: Page,
  userId: string,
  chatId: string,
  message: Partial<FailedMessage>
): Promise<void> {
  const key = `${FAILED_MESSAGES_PREFIX}-${userId}-${chatId}`;
  const fullMessage: FailedMessage = {
    id: `failed-${Date.now()}`,
    chatId,
    content: 'Failed message',
    timestamp: new Date().toISOString(),
    sender: { id: userId, name: 'Test User' },
    isCurrentUser: true,
    error: true,
    sending: false,
    ...message,
  };

  await page.evaluate(
    ({ storageKey, msg }) => {
      const existing = sessionStorage.getItem(storageKey);
      const messages = existing ? JSON.parse(existing) : [];
      messages.push(msg);
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    },
    { storageKey: key, msg: fullMessage }
  );
}

export async function getFailedMessages(
  page: Page,
  userId: string,
  chatId: string
): Promise<FailedMessage[]> {
  const key = `${FAILED_MESSAGES_PREFIX}-${userId}-${chatId}`;
  return page.evaluate((storageKey) => {
    const stored = sessionStorage.getItem(storageKey);
    return stored ? JSON.parse(stored) : [];
  }, key);
}

export async function clearAllStorage(page: Page): Promise<void> {
  await page.evaluate(() => sessionStorage.clear());
}
