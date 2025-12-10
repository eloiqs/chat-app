import { test, expect, TestUsers, STORAGE_KEYS, UI_TEXT, API_ROUTES } from '../../fixtures/test-fixtures';

test.describe('User Selection & Login', () => {
  test('should display user selection page on first visit', async ({
    userSelectionPage,
  }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.expectHeadingVisible();
  });

  test('should show loading state while fetching users', async ({
    page,
    userSelectionPage,
  }) => {
    await page.route(API_ROUTES.USERS, async () => {
      // Never respond - keep loading forever
      await new Promise(() => {});
    });
    await userSelectionPage.goto();
    await userSelectionPage.expectLoading();
  });

  test('should display all 5 available users', async ({ userSelectionPage }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.expectUserCount(5);
  });

  test('should redirect to chat dashboard after selecting a user', async ({
    userSelectionPage,
    chatDashboardPage,
    page,
  }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.selectUserByName(TestUsers.john.name);

    await expect(page).toHaveURL(/\/chat/);
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.expectCurrentUser(TestUsers.john.name);
  });

  test('should persist login across page refresh', async ({
    userSelectionPage,
    chatDashboardPage,
    page,
  }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.selectUserByName(TestUsers.alice.name);

    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.expectCurrentUser(TestUsers.alice.name);
  });

  test('should store user in sessionStorage after login', async ({
    userSelectionPage,
    page,
  }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.selectUserByName(TestUsers.bob.name);

    const storedUser = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      STORAGE_KEYS.USER,
    );

    expect(storedUser).toBeTruthy();
    expect(JSON.parse(storedUser!)).toMatchObject({
      id: TestUsers.bob.id,
      name: TestUsers.bob.name,
    });
  });
});
