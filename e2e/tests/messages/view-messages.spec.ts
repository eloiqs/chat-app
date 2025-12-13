import { test, expect, API_ROUTES } from '../../fixtures/test-fixtures';
import { RouteController } from 'playwright-route-controller';

test.describe('View Messages', () => {
  test('should display messages when selecting a chat', async ({
    authenticatedUser,
    chatDashboardPage,
    chatMessagesPage,
    testData,
    testDataFactory,
    page,
  }) => {
    const { chat } = testData;
    const { user2 } = testData.users;

    // Add some messages to the chat
    const messages = [
      testDataFactory.createMessage(chat.id, user2.id, 'Hey! How are you?'),
      testDataFactory.createMessage(
        chat.id,
        authenticatedUser.id,
        'Doing great, thanks!',
      ),
      testDataFactory.createMessage(chat.id, user2.id, 'Awesome!'),
    ];

    await testDataFactory.provision({
      users: [],
      chats: [],
      messages,
    });

    // Reload to fetch fresh data with new messages
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();

    // Navigate to the chat
    await chatDashboardPage.selectChatById(chat.id);
    await chatDashboardPage.expectOnChatRoute(chat.id);

    // Verify messages are visible
    await expect(page.getByText('Hey! How are you?').last()).toBeVisible();
    await expect(page.getByText('Doing great, thanks!').last()).toBeVisible();
    await expect(page.getByText('Awesome!').last()).toBeVisible();
  });

  test('should show sender name for other users messages', async ({
    authenticatedUser,
    chatDashboardPage,
    testData,
    testDataFactory,
    page,
  }) => {
    const { chat } = testData;
    const { user2 } = testData.users;

    // Add a message from user2
    const message = testDataFactory.createMessage(
      chat.id,
      user2.id,
      'Hello there!',
    );
    await testDataFactory.provision({
      users: [],
      chats: [],
      messages: [message],
    });

    // Navigate to the chat
    await chatDashboardPage.selectChatById(chat.id);

    // Other user's name should be visible
    await expect(page.getByText(user2.name).first()).toBeVisible();
  });

  test('should mark chat as read when opened', async ({
    authenticatedUser,
    chatDashboardPage,
    testData,
    testDataFactory,
    page,
  }) => {
    const { user1, user2 } = testData.users;

    // Create a second chat with unread messages
    const chat2 = testDataFactory.createChat([user1.id, user2.id]);
    const unreadMessage = testDataFactory.createMessage(
      chat2.id,
      user2.id,
      'Unread message!',
    );

    await testDataFactory.provision({
      users: [],
      chats: [chat2],
      messages: [unreadMessage],
    });

    // Reload to see the new chat
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();

    const controller = new RouteController({
      method: 'POST',
      match: (req) => req.url().includes(chat2.id),
    });
    await page.route(API_ROUTES.CHAT_READ, (route) => controller.handle(route));

    // Chat2 should have unread badge
    await chatDashboardPage.expectUnreadBadgeVisible(chat2.id);

    // Open the chat
    await chatDashboardPage.selectChatById(chat2.id);

    // Badge should disappear after viewing
    await controller.continueAll();
    await chatDashboardPage.expectUnreadBadgeHidden(chat2.id);
  });
});
