import { RouteController } from 'playwright-route-controller';
import { test, API_ROUTES } from '../../fixtures/test-fixtures';

test.describe('Send Message - Success', () => {
  test('should show optimistic message immediately', async ({
    onAliceChat,
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
    onAliceChat,
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
    onAliceChat,
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
    onAliceChat,
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
    johnWithChatsLoaded,
    chatDashboardPage,
    chatMessagesPage,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    // Navigate to Alice's chat and send a message
    await chatDashboardPage.selectChatById('c1');
    const testMessage = `Sending in Alice chat ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);

    // Verify message is in sending state
    await chatMessagesPage.expectMessageSending(testMessage);

    // Navigate to Bob's chat
    await chatDashboardPage.selectChatById('c2');

    // The sending message should NOT be visible in Bob's chat
    await chatMessagesPage.expectMessageNotVisible(testMessage);

    // Complete the request
    controller.continueAll();

    // Navigate back to Alice's chat and verify message was sent
    await chatDashboardPage.selectChatById('c1');
    await chatMessagesPage.expectMessageSent(testMessage);
    await chatMessagesPage.expectMessageVisible(testMessage);
  });

  test('should show correct sending messages when switching between chats', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
    chatMessagesPage,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    // Send message in Alice's chat
    await chatDashboardPage.selectChatById('c1');
    const aliceMessage = `Message for Alice ${Date.now()}`;
    await chatMessagesPage.sendMessage(aliceMessage);
    await chatMessagesPage.expectMessageSending(aliceMessage);

    // Send message in Bob's chat
    await chatDashboardPage.selectChatById('c2');
    const bobMessage = `Message for Bob ${Date.now()}`;
    await chatMessagesPage.sendMessage(bobMessage);
    await chatMessagesPage.expectMessageSending(bobMessage);

    // Verify Bob's chat shows only Bob's message
    await chatMessagesPage.expectMessageNotVisible(aliceMessage);

    // Switch back to Alice's chat - should see Alice's message only
    await chatDashboardPage.selectChatById('c1');
    await chatMessagesPage.expectMessageVisible(aliceMessage);
    await chatMessagesPage.expectMessageNotVisible(bobMessage);

    // Complete all requests
    controller.continueAll();

    // Verify Alice's message is sent
    await chatMessagesPage.expectMessageSent(aliceMessage);

    // Verify Bob's message is sent
    await chatDashboardPage.selectChatById('c2');
    await chatMessagesPage.expectMessageSent(bobMessage);
  });

  test('should maintain separate sending messages for multiple chats', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
    chatMessagesPage,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    // Send messages to three different chats
    await chatDashboardPage.selectChatById('c1');
    const aliceMessage = `Sending to Alice ${Date.now()}`;
    await chatMessagesPage.sendMessage(aliceMessage);

    await chatDashboardPage.selectChatById('c2');
    const bobMessage = `Sending to Bob ${Date.now()}`;
    await chatMessagesPage.sendMessage(bobMessage);

    await chatDashboardPage.selectChatById('c3');
    const charlieMessage = `Sending to Charlie ${Date.now()}`;
    await chatMessagesPage.sendMessage(charlieMessage);

    // Verify Charlie's chat shows only Charlie's message
    await chatMessagesPage.expectMessageSending(charlieMessage);
    await chatMessagesPage.expectMessageNotVisible(aliceMessage);
    await chatMessagesPage.expectMessageNotVisible(bobMessage);

    // Verify Alice's chat shows only Alice's message
    await chatDashboardPage.selectChatById('c1');
    await chatMessagesPage.expectMessageSending(aliceMessage);
    await chatMessagesPage.expectMessageNotVisible(bobMessage);
    await chatMessagesPage.expectMessageNotVisible(charlieMessage);

    // Verify Bob's chat shows only Bob's message
    await chatDashboardPage.selectChatById('c2');
    await chatMessagesPage.expectMessageSending(bobMessage);
    await chatMessagesPage.expectMessageNotVisible(aliceMessage);
    await chatMessagesPage.expectMessageNotVisible(charlieMessage);

    // Complete all requests
    controller.continueAll();

    // Verify all messages are sent in their respective chats
    await chatMessagesPage.expectMessageSent(bobMessage);

    await chatDashboardPage.selectChatById('c1');
    await chatMessagesPage.expectMessageSent(aliceMessage);

    await chatDashboardPage.selectChatById('c3');
    await chatMessagesPage.expectMessageSent(charlieMessage);
  });
});
