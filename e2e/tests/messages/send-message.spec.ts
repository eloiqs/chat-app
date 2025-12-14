import { RouteController } from 'playwright-route-controller';
import { test, API_ROUTES } from '../../fixtures/test-fixtures';

test.describe('Send Message - Success', () => {
  test('should show optimistic message immediately', async ({
    onFirstChat,
    chatMessagesPage,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    const testMessage = `Test message ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);

    // Message should appear immediately while request is pending
    await chatMessagesPage.expectMessageVisible(testMessage);
    await chatMessagesPage.expectMessageSending(testMessage);

    controller.continue();
  });

  test('should show sending indicator while message is being sent', async ({
    onFirstChat,
    chatMessagesPage,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    const testMessage = `Sending test ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);

    await chatMessagesPage.expectMessageSending(testMessage);

    controller.continue();
  });

  test('should confirm message after successful send', async ({
    onFirstChat,
    chatMessagesPage,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    const testMessage = `Confirmed message ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);

    // Verify sending state first
    await chatMessagesPage.expectMessageSending(testMessage);

    // Let request complete
    controller.continue();

    await chatMessagesPage.expectMessageSent(testMessage);
  });

  test('should clear input after sending', async ({
    onFirstChat,
    chatMessagesPage,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    const testMessage = `Clear input test ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);

    // Input should clear immediately (optimistic)
    await chatMessagesPage.expectInputEmpty();

    controller.continue();
  });
});

test.describe('Send Message - Chat Isolation', () => {
  test('should not show sending message from one chat in another chat', async ({
    authenticatedUser,
    chatDashboardPage,
    chatMessagesPage,
    testData,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    // Navigate to first chat and send a message
    await chatDashboardPage.selectChatById(testData.chats[0].id);
    const testMessage = `Sending in chat 1 ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);

    // Verify message is in sending state
    await chatMessagesPage.expectMessageSending(testMessage);

    // Navigate to second chat
    await chatDashboardPage.selectChatById(testData.chats[1].id);

    // The sending message should NOT be visible in second chat
    await chatMessagesPage.expectMessageNotVisible(testMessage);

    // Navigate back to first chat and verify message was sent
    await chatDashboardPage.selectChatById(testData.chats[0].id);

    // Complete the request
    controller.continueAll();
    await chatMessagesPage.expectMessageSent(testMessage);
    await chatMessagesPage.expectMessageVisible(testMessage);
  });

  test('should show correct sending messages when switching between chats', async ({
    authenticatedUser,
    chatDashboardPage,
    chatMessagesPage,
    testData,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    // Send message in first chat
    await chatDashboardPage.selectChatById(testData.chats[0].id);
    const chat1Message = `Message for chat 1 ${Date.now()}`;
    await chatMessagesPage.sendMessage(chat1Message);
    await chatMessagesPage.expectMessageSending(chat1Message);

    // Send message in second chat
    await chatDashboardPage.selectChatById(testData.chats[1].id);
    const chat2Message = `Message for chat 2 ${Date.now()}`;
    await chatMessagesPage.sendMessage(chat2Message);
    await chatMessagesPage.expectMessageSending(chat2Message);

    // Verify second chat shows only its message
    await chatMessagesPage.expectMessageNotVisible(chat1Message);

    // Switch back to first chat - should see its message only
    await chatDashboardPage.selectChatById(testData.chats[0].id);
    await chatMessagesPage.expectMessageVisible(chat1Message);
    await chatMessagesPage.expectMessageNotVisible(chat2Message);

    // Complete all requests
    controller.continueAll();

    // Verify first chat's message is sent
    await chatMessagesPage.expectMessageSent(chat1Message);

    // Verify second chat's message is sent
    await chatDashboardPage.selectChatById(testData.chats[1].id);
    await chatMessagesPage.expectMessageSent(chat2Message);
  });

  test('should maintain separate sending messages for multiple chats', async ({
    authenticatedUser,
    chatDashboardPage,
    chatMessagesPage,
    testData,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    // Send messages to three different chats
    await chatDashboardPage.selectChatById(testData.chats[0].id);
    const chat1Message = `Sending to chat 1 ${Date.now()}`;
    await chatMessagesPage.sendMessage(chat1Message);

    await chatDashboardPage.selectChatById(testData.chats[1].id);
    const chat2Message = `Sending to chat 2 ${Date.now()}`;
    await chatMessagesPage.sendMessage(chat2Message);

    await chatDashboardPage.selectChatById(testData.chats[2].id);
    const chat3Message = `Sending to chat 3 ${Date.now()}`;
    await chatMessagesPage.sendMessage(chat3Message);

    // Verify third chat shows only its message
    await chatMessagesPage.expectMessageSending(chat3Message);
    await chatMessagesPage.expectMessageNotVisible(chat1Message);
    await chatMessagesPage.expectMessageNotVisible(chat2Message);

    // Verify first chat shows only its message
    await chatDashboardPage.selectChatById(testData.chats[0].id);
    await chatMessagesPage.expectMessageSending(chat1Message);
    await chatMessagesPage.expectMessageNotVisible(chat2Message);
    await chatMessagesPage.expectMessageNotVisible(chat3Message);

    // Verify second chat shows only its message
    await chatDashboardPage.selectChatById(testData.chats[1].id);
    await chatMessagesPage.expectMessageSending(chat2Message);
    await chatMessagesPage.expectMessageNotVisible(chat1Message);
    await chatMessagesPage.expectMessageNotVisible(chat3Message);

    // Complete all requests
    controller.continueAll();

    // Verify all messages are sent in their respective chats
    await chatMessagesPage.expectMessageSent(chat2Message);

    await chatDashboardPage.selectChatById(testData.chats[0].id);
    await chatMessagesPage.expectMessageSent(chat1Message);

    await chatDashboardPage.selectChatById(testData.chats[2].id);
    await chatMessagesPage.expectMessageSent(chat3Message);
  });
});
