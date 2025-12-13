import { RouteController } from 'playwright-route-controller';
import { test, expect, API_ROUTES } from '../../fixtures/test-fixtures';

test.describe('View Chats List', () => {
  test('should display chat list after login', async ({
    authenticatedUser,
    chatDashboardPage,
    testData,
  }) => {
    await chatDashboardPage.expectChatCount(testData.chats.length);
  });

  test('should show participant names for direct chats', async ({
    authenticatedUser,
    testData,
    page,
  }) => {
    // Check that other users' names are visible
    for (const otherUser of testData.otherUsers) {
      await expect(
        page.getByText(otherUser.name, { exact: true }),
      ).toBeVisible();
    }
  });

  test('should show unread badge for chats with unread messages', async ({
    authenticatedUser,
    chatDashboardPage,
    testDataFactory,
    testData,
    page,
  }) => {
    // Add an unread message to the second chat
    const unreadMessage = testDataFactory.createMessage(
      testData.chats[1].id,
      testData.otherUsers[1].id,
      'Unread message!',
    );
    await testDataFactory.provision({
      users: [],
      chats: [],
      messages: [unreadMessage],
    });

    // Reload to see the unread badge
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();

    await chatDashboardPage.expectUnreadBadgeVisible(testData.chats[1].id);
  });

  test('should show last message preview', async ({
    authenticatedUser,
    chatDashboardPage,
    testDataFactory,
    testData,
    page,
  }) => {
    // Add a message to the first chat
    const message = testDataFactory.createMessage(
      testData.chats[0].id,
      testData.otherUsers[0].id,
      'Last message preview test',
    );
    await testDataFactory.provision({
      users: [],
      chats: [],
      messages: [message],
    });

    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();

    // Check the last message preview in the chat list item specifically
    await chatDashboardPage.expectChatItemLatestMessage(
      testData.chats[0].id,
      'Last message preview test',
    );
  });

  test('should auto-redirect to first chat', async ({
    authenticatedUser,
    chatDashboardPage,
    testData,
  }) => {
    await chatDashboardPage.expectOnChatRoute(testData.chats[0].id);
  });

  test('should optimistically update last message preview and rollback', async ({
    authenticatedUser,
    chatDashboardPage,
    chatMessagesPage,
    testDataFactory,
    testData,
    page,
  }) => {
    // Add an initial message
    const initialMessage = testDataFactory.createMessage(
      testData.chats[0].id,
      testData.otherUsers[0].id,
      'Initial message',
    );
    await testDataFactory.provision({
      users: [],
      chats: [],
      messages: [initialMessage],
    });

    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.selectChatById(testData.chats[0].id);

    const messageContent = 'Failed message content';

    await chatDashboardPage.expectChatItemLatestMessage(
      testData.chats[0].id,
      'Initial message',
    );

    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    await chatMessagesPage.sendMessage(messageContent);
    await chatMessagesPage.expectMessageSending(messageContent);
    await chatDashboardPage.expectChatItemLatestMessage(
      testData.chats[0].id,
      messageContent,
    );

    controller.abort();

    await chatMessagesPage.expectMessageError(messageContent);
    await chatDashboardPage.expectChatItemLatestMessage(
      testData.chats[0].id,
      'Initial message',
    );

    await chatMessagesPage.retryFailedMessage(messageContent);

    controller.continue();

    await chatMessagesPage.expectMessageSent(messageContent);
    await chatDashboardPage.expectChatItemLatestMessage(
      testData.chats[0].id,
      messageContent,
    );
  });

  test('should optimistically update read badge and rollback', async ({
    authenticatedUser,
    chatDashboardPage,
    testDataFactory,
    testData,
    page,
  }) => {
    // Add unread messages to second chat
    const unreadMessage = testDataFactory.createMessage(
      testData.chats[1].id,
      testData.otherUsers[1].id,
      'Unread message for badge test',
    );
    await testDataFactory.provision({
      users: [],
      chats: [],
      messages: [unreadMessage],
    });

    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();

    const chat1Id = testData.chats[0].id;
    const chat2Id = testData.chats[1].id;

    await chatDashboardPage.expectUnreadBadgeVisible(chat2Id);

    const controller = new RouteController({
      method: 'POST',
      match: (req) => req.url().includes(chat2Id),
    });
    await page.route(API_ROUTES.CHAT_READ, (route) => {
      return controller.handle(route);
    });

    // Select chat -> triggers optimistic update (badge hidden)
    await chatDashboardPage.selectChatById(chat2Id);
    await chatDashboardPage.expectUnreadBadgeHidden(chat2Id);

    // abort -> should rollback (badge visible)
    controller.abort();
    await chatDashboardPage.expectUnreadBadgeVisible(chat2Id);

    await chatDashboardPage.selectChatById(chat1Id);

    // Reload and verify server state wasn't changed (badge still visible)
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.expectUnreadBadgeVisible(chat2Id);

    // Select chat again -> triggers optimistic update
    await chatDashboardPage.selectChatById(chat2Id);
    await chatDashboardPage.expectUnreadBadgeHidden(chat2Id);

    // Wait for request, then let it through
    await controller.waitForPending();
    controller.continue();

    // Badge should stay hidden (server updated)
    await chatDashboardPage.expectUnreadBadgeHidden(chat2Id);

    await chatDashboardPage.selectChatById(chat1Id);

    // Reload and verify server state was updated (badge gone)
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.selectChatById(chat2Id);

    // Let any new read requests through
    controller.continue();

    await chatDashboardPage.expectUnreadBadgeHidden(chat2Id);
  });
});
