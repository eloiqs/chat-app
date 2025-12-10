import { test, expect, TestUsers, STORAGE_KEYS } from '../../fixtures/test-fixtures';
import { TestChats } from '../../data/test-data';

test.describe('Full User Journey', () => {
  test('complete chat workflow: login -> view chats -> send message -> logout', async ({
    userSelectionPage,
    chatDashboardPage,
    chatMessagesPage,
    page,
  }) => {
    // Step 1: Load app and see users
    await userSelectionPage.goto();
    await userSelectionPage.waitForUsersToLoad();
    await userSelectionPage.expectHeadingVisible();

    // Step 2: Select a user
    await userSelectionPage.selectUserByName(TestUsers.john.name);
    await expect(page).toHaveURL(/\/chat/);

    // Step 3: Wait for chats to load and verify
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.expectCurrentUser(TestUsers.john.name);

    // Step 4: Click on a chat
    await chatDashboardPage.selectChatById(TestChats.johnAlice.id);
    await chatDashboardPage.expectOnChatRoute(TestChats.johnAlice.id);

    // Step 5: View messages
    const messages = chatMessagesPage.getMessages();
    await expect(messages.first()).toBeVisible();

    // Step 6: Send a message
    const testMessage = `E2E Test Message ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);
    await chatMessagesPage.expectMessageSent(testMessage);

    // Step 7: Logout
    await chatDashboardPage.logout();
    await userSelectionPage.waitForUsersToLoad();

    // Step 8: Verify session is cleared
    const storedUser = await page.evaluate(
      (key) => sessionStorage.getItem(key),
      STORAGE_KEYS.USER,
    );
    expect(storedUser).toBeNull();
  });

  test('multi-user scenario: two users chatting', async ({
    createUserContext,
  }) => {
    // Create two user contexts
    const john = await createUserContext(TestUsers.john);
    const alice = await createUserContext(TestUsers.alice);

    // Wait for John's chats to load
    await john.dashboard.waitForChatsToLoad();

    // Wait for Alice's chats to load
    await alice.dashboard.waitForChatsToLoad();

    // John navigates to chat with Alice
    await john.dashboard.selectChatById(TestChats.johnAlice.id);

    // John sends a message
    const testMessage = `Hello from John ${Date.now()}`;
    await john.messages.sendMessage(testMessage);

    // Verify message sent on John's side
    await john.messages.expectMessageVisible(testMessage);

    // Alice navigates to chat with John
    await alice.dashboard.selectChatById(TestChats.johnAlice.id);

    // Alice should see John's message (after refresh since no real-time updates)
    await alice.page.reload();
    await alice.dashboard.waitForChatsToLoad();
    await alice.messages.expectMessageVisible(testMessage);
  });
});
