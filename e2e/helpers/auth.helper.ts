import { Page } from '@playwright/test';
import type { User } from 'shared';
import { STORAGE_KEYS } from './storage.helper';
import { TestUsers } from '../data/test-data';

const STORAGE_KEY = STORAGE_KEYS.USER;

// Re-export for backwards compatibility
export const testUsers = TestUsers;

export async function loginAsUser(page: Page, user: User): Promise<void> {
  await page.evaluate(
    ({ key, userData }) => {
      sessionStorage.setItem(key, JSON.stringify(userData));
    },
    { key: STORAGE_KEY, userData: user },
  );
}

export async function logout(page: Page): Promise<void> {
  await page.evaluate((key) => {
    sessionStorage.removeItem(key);
  }, STORAGE_KEY);
}

export async function getCurrentUser(page: Page): Promise<User | null> {
  return page.evaluate((key) => {
    const stored = sessionStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  }, STORAGE_KEY);
}

export async function isLoggedIn(page: Page): Promise<boolean> {
  const user = await getCurrentUser(page);
  return user !== null;
}
