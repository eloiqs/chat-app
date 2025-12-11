import { Page, Locator, expect } from '@playwright/test';
import { UI_TEXT } from '../constants/ui-text';

export class ChatDashboardPage {
  readonly currentUserName: Locator;
  readonly logoutButton: Locator;
  readonly loadingChats: Locator;

  constructor(public readonly page: Page) {
    this.currentUserName = page.getByTestId('current-user-name');
    this.logoutButton = page.getByRole('button', {
      name: UI_TEXT.BUTTON_LOGOUT,
    });
    this.loadingChats = page.getByText(UI_TEXT.LOADING_CHATS);
  }

  async waitForChatsToLoad(): Promise<void> {
    await expect(this.loadingChats).not.toBeVisible({ timeout: 10000 });
  }

  async expectCurrentUser(name: string): Promise<void> {
    await expect(this.currentUserName).toContainText(name);
  }

  async expectChatItemLatestMessage(
    chatId: string,
    content: string,
  ): Promise<void> {
    await expect(this.getChatItem(chatId)).toContainText(content);
  }

  getChatItem(chatId: string): Locator {
    return this.page.getByTestId(`chat-item-${chatId}`);
  }

  getChatItems(): Locator {
    return this.page.locator('[data-testid^="chat-item-"]');
  }

  async selectChatById(chatId: string): Promise<void> {
    await this.page.getByTestId(`chat-item-${chatId}`).click();
  }

  getUnreadBadge(chatId: string): Locator {
    return this.page.getByTestId(`unread-badge-${chatId}`);
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }

  // Additional assertion helpers

  async expectChatCount(count: number): Promise<void> {
    await expect(this.getChatItems()).toHaveCount(count);
  }

  async expectChatVisible(chatId: string): Promise<void> {
    await expect(this.getChatItem(chatId)).toBeVisible();
  }

  async expectUnreadBadgeVisible(chatId: string): Promise<void> {
    await expect(this.getUnreadBadge(chatId)).toBeVisible();
  }

  async expectUnreadBadgeHidden(chatId: string): Promise<void> {
    await expect(this.getUnreadBadge(chatId)).not.toBeVisible();
  }

  async expectOnChatRoute(chatId: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`/chat/${chatId}`));
  }
}
