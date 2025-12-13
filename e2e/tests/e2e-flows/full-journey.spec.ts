import { test, expect, STORAGE_KEYS } from '../../fixtures/test-fixtures';

test.describe('Full User Journey', () => {
  test('complete chat workflow: login -> view chats -> send message -> logout', async ({
    userSelectionPage,
    chatDashboardPage,
    chatMessagesPage,
    testData,
    page,
  }) => {
    const { user1, user2 } = testData.users;
    const { chat } = testData;

    // Step 1: Load app and see users
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.expectHeadingVisible();

    // Step 2: Select a user
    await userSelectionPage.selectUserByName(user1.name);
    await expect(page).toHaveURL(/\/chat/);

    // Step 3: Wait for chats to load and verify
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.expectCurrentUser(user1.name);

    // Step 4: Click on a chat
    await chatDashboardPage.selectChatById(chat.id);
    await chatDashboardPage.expectOnChatRoute(chat.id);

    // Step 5: Send a message
    const testMessage = `E2E Test Message ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);
    await chatMessagesPage.expectMessageSent(testMessage);

    // Step 6: Logout
    await chatDashboardPage.logout();
    await userSelectionPage.waitForUsersToLoad();

    // Step 7: Verify session is cleared
    const storedUser = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      STORAGE_KEYS.USER,
    );
    expect(storedUser).toBeNull();
  });

  test('multi-user scenario: two users chatting', async ({
    createUserContext,
    testData,
  }) => {
    const { user1, user2 } = testData.users;
    const { chat } = testData;

    // Create two user contexts
    const johnCtx = await createUserContext(user1);
    const aliceCtx = await createUserContext(user2);

    // Wait for John's chats to load
    await johnCtx.dashboard.waitForChatsToLoad();

    // Wait for Alice's chats to load
    await aliceCtx.dashboard.waitForChatsToLoad();

    // John navigates to chat with Alice
    await johnCtx.dashboard.selectChatById(chat.id);

    // John sends a message
    const testMessage = `Hello from User1 ${Date.now()}`;
    await johnCtx.messages.sendMessage(testMessage);

    // Verify message sent on John's side
    await johnCtx.messages.expectMessageVisible(testMessage);

    // Alice navigates to chat with John
    await aliceCtx.dashboard.selectChatById(chat.id);

    // Alice should see John's message (after refresh since no real-time updates)
    await aliceCtx.page.reload();
    await aliceCtx.dashboard.waitForChatsToLoad();
    await aliceCtx.messages.expectMessageVisible(testMessage);
  });
});
