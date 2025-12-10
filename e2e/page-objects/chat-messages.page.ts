import { Page, Locator, expect } from '@playwright/test';
import { UI_TEXT } from '../constants/ui-text';

export class ChatMessagesPage {
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly emptyState: Locator;

  constructor(private readonly page: Page) {
    this.messageInput = page.getByPlaceholder(UI_TEXT.MESSAGE_INPUT_PLACEHOLDER);
    this.sendButton = page.locator('button[type="submit"]');
    this.emptyState = page.getByText(UI_TEXT.NO_MESSAGES);
  }

  getMessages(): Locator {
    return this.page.locator('[data-testid^="message-"]');
  }

  getMessageByContent(content: string): Locator {
    return this.getMessages().filter({ hasText: content });
  }

  async sendMessage(content: string): Promise<void> {
    await this.messageInput.fill(content);
    await this.sendButton.click();
  }

  async expectMessageSending(content: string): Promise<void> {
    const message = this.getMessageByContent(content);
    await expect(message.getByText(UI_TEXT.MESSAGE_SENDING)).toBeVisible();
  }

  async expectMessageSent(content: string): Promise<void> {
    const message = this.getMessageByContent(content);
    await expect(message.getByText(UI_TEXT.MESSAGE_SENDING)).not.toBeVisible({
      timeout: 10000,
    });
  }

  async expectMessageError(content: string): Promise<void> {
    const message = this.getMessageByContent(content);
    await expect(message.getByText(UI_TEXT.MESSAGE_ERROR)).toBeVisible();
  }

  private async openFailedMessagePopover(content: string): Promise<void> {
    const message = this.getMessageByContent(content);
    await message.getByText(UI_TEXT.MESSAGE_ERROR).click();
  }

  async retryFailedMessage(content: string): Promise<void> {
    await this.openFailedMessagePopover(content);
    const retryButton = this.page.getByRole('button', {
      name: UI_TEXT.BUTTON_RETRY,
    });
    await retryButton.waitFor({ state: 'visible' });
    await retryButton.click();
  }

  async deleteFailedMessage(content: string): Promise<void> {
    await this.openFailedMessagePopover(content);
    const deleteButton = this.page.getByRole('button', {
      name: UI_TEXT.BUTTON_DELETE,
    });
    await deleteButton.waitFor({ state: 'visible' });
    await deleteButton.click();
  }

  async expectNoMessages(): Promise<void> {
    await expect(this.emptyState).toBeVisible();
  }

  // Additional assertion helpers

  async expectMessageCount(count: number): Promise<void> {
    await expect(this.getMessages()).toHaveCount(count);
  }

  async expectMessageVisible(content: string): Promise<void> {
    await expect(this.getMessageByContent(content)).toBeVisible();
  }

  async expectMessageNotVisible(content: string): Promise<void> {
    await expect(this.getMessageByContent(content)).not.toBeVisible();
  }

  async expectInputEmpty(): Promise<void> {
    await expect(this.messageInput).toHaveValue('');
  }

  async expectInputValue(value: string): Promise<void> {
    await expect(this.messageInput).toHaveValue(value);
  }
}
