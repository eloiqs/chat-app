import { Page, Locator, expect } from '@playwright/test';
import { UI_TEXT } from '../constants/ui-text';

export class UserSelectionPage {
  readonly heading: Locator;
  readonly loadingIndicator: Locator;

  constructor(
    private readonly page: Page,
    private readonly baseURL: string = '',
  ) {
    this.heading = page.getByText(UI_TEXT.WELCOME_HEADING);
    this.loadingIndicator = page.getByText(UI_TEXT.LOADING_USERS);
  }

  async goto(): Promise<void> {
    await this.page.goto(this.baseURL || '/');
  }

  async waitForUsersToLoad(): Promise<void> {
    await expect(this.loadingIndicator).not.toBeVisible({ timeout: 10000 });
    await expect(this.page.getByText('Something went wrong')).not.toBeVisible();
    await expect(this.heading).toBeVisible();
  }

  getUserCards(): Locator {
    return this.page.locator('[data-testid^="user-card-"]');
  }

  async selectUserByName(name: string): Promise<void> {
    const card = this.page
      .locator('[data-testid^="user-card-"]')
      .filter({ hasText: name });
    await card.getByRole('button', { name: UI_TEXT.BUTTON_SELECT }).click();
  }

  async selectUserById(userId: string): Promise<void> {
    await this.page
      .getByTestId(`user-card-${userId}`)
      .getByRole('button', { name: UI_TEXT.BUTTON_SELECT })
      .click();
  }

  async expectUserCount(count: number): Promise<void> {
    await expect(this.getUserCards()).toHaveCount(count);
  }

  async expectHeadingVisible(): Promise<void> {
    await expect(this.heading).toBeVisible();
  }

  async expectLoading(): Promise<void> {
    await expect(this.loadingIndicator).toBeVisible();
  }
}
