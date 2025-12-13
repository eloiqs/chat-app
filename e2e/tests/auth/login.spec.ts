import {
  test,
  expect,
  STORAGE_KEYS,
  API_ROUTES,
} from '../../fixtures/test-fixtures';

test.describe('User Selection & Login', () => {
  test('should display user selection page on first visit', async ({
    userSelectionPage,
    testData,
  }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.expectHeadingVisible();
  });

  test('should show loading state while fetching users', async ({
    page,
    userSelectionPage,
    testData,
  }) => {
    await page.route(API_ROUTES.USERS, async () => {
      // Never respond - keep loading forever
      await new Promise(() => {});
    });
    await userSelectionPage.goto();
    await userSelectionPage.expectLoading();
  });

  test('should display test users', async ({ userSelectionPage, testData, page }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    // Verify test-provisioned users are visible (there may be seed data too)
    await expect(page.getByText(testData.user.name)).toBeVisible();
    for (const otherUser of testData.otherUsers) {
      await expect(page.getByText(otherUser.name)).toBeVisible();
    }
  });

  test('should redirect to chat dashboard after selecting a user', async ({
    userSelectionPage,
    chatDashboardPage,
    testData,
    page,
  }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.selectUserByName(testData.user.name);

    await expect(page).toHaveURL(/\/chat/);
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.expectCurrentUser(testData.user.name);
  });

  test('should persist login across page refresh', async ({
    userSelectionPage,
    chatDashboardPage,
    testData,
    page,
  }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.selectUserByName(testData.user.name);

    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.expectCurrentUser(testData.user.name);
  });

  test('should store user in sessionStorage after login', async ({
    userSelectionPage,
    testData,
    page,
  }) => {
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.selectUserByName(testData.user.name);

    const storedUser = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      STORAGE_KEYS.USER,
    );

    expect(storedUser).toBeTruthy();
    expect(JSON.parse(storedUser!)).toMatchObject({
      id: testData.user.id,
      name: testData.user.name,
    });
  });
});
