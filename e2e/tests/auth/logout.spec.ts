import { test, expect, TestUsers, STORAGE_KEYS } from '../../fixtures/test-fixtures';
import { TestChats } from '../../data/test-data';

test.describe('Logout', () => {
  test('should return to user selection after logout', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
    userSelectionPage,
  }) => {
    await chatDashboardPage.logout();

    // Wait for redirect to user selection page
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.expectHeadingVisible();
  });

  test('should clear sessionStorage on logout', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
    page,
  }) => {
    await chatDashboardPage.logout();

    const storedUser = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      STORAGE_KEYS.USER,
    );
    expect(storedUser).toBeNull();
  });

  test('should clear failed messages on logout', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
    page,
  }) => {
    const storageKey = `${STORAGE_KEYS.FAILED_MESSAGES_PREFIX}-${TestUsers.john.id}-${TestChats.johnAlice.id}`;

    // First add a failed message to storage
    await page.evaluate(
      (key) => {
        sessionStorage.setItem(
          key,
          JSON.stringify([{ id: 'failed-1', content: 'test', error: true }]),
        );
      },
      storageKey,
    );

    await chatDashboardPage.logout();

    const failedMessages = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      storageKey,
    );
    expect(failedMessages).toBeNull();
  });
});
