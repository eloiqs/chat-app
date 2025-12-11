import { RouteController } from 'playwright-route-controller';
import {
  test,
  expect,
  TestUsers,
  API_ROUTES,
} from '../../fixtures/test-fixtures';
import { TestChats, JohnsChatIds } from '../../data/test-data';

test.describe('View Chats List', () => {
  test('should display chat list after login', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
  }) => {
    await chatDashboardPage.expectChatCount(JohnsChatIds.length);
  });

  test('should show participant names for direct chats', async ({
    johnWithChatsLoaded,
    page,
  }) => {
    await expect(
      page.getByText(TestUsers.alice.name, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(TestUsers.bob.name, { exact: true }),
    ).toBeVisible();
  });

  test('should show unread badge for chats with unread messages', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
  }) => {
    // Chat with Bob has unread messages for John
    await chatDashboardPage.expectUnreadBadgeVisible(TestChats.johnBob.id);
  });

  test('should show last message preview', async ({
    johnWithChatsLoaded,
    page,
  }) => {
    // Chat with Alice shows last message
    await expect(page.getByText(TestChats.johnAlice.lastMessage)).toBeVisible();
  });

  test('should auto-redirect to first chat', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
  }) => {
    await chatDashboardPage.expectOnChatRoute(TestChats.johnAlice.id);
  });

  test('should optimistically update last message preview and rollback', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
    chatMessagesPage,
    page,
  }) => {
    const messageContent = 'Failed message content';

    await chatDashboardPage.expectChatItemLatestMessage(
      TestChats.johnAlice.id,
      TestChats.johnAlice.lastMessage,
    );

    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    await chatMessagesPage.sendMessage(messageContent);
    await chatMessagesPage.expectMessageSending(messageContent);
    await chatDashboardPage.expectChatItemLatestMessage(
      TestChats.johnAlice.id,
      messageContent,
    );

    controller.abort();

    await chatMessagesPage.expectMessageError(messageContent);
    await chatDashboardPage.expectChatItemLatestMessage(
      TestChats.johnAlice.id,
      TestChats.johnAlice.lastMessage,
    );

    await chatMessagesPage.retryFailedMessage(messageContent);

    controller.continue();

    await chatMessagesPage.expectMessageSent(messageContent);
    await chatDashboardPage.expectChatItemLatestMessage(
      TestChats.johnAlice.id,
      messageContent,
    );
  });

  test('should optimistically update read badge and rollback', async ({
    johnWithChatsLoaded,
    chatDashboardPage,
    page,
  }) => {
    const bobChatId = TestChats.johnBob.id;
    const aliceChatId = TestChats.johnAlice.id;

    await chatDashboardPage.expectUnreadBadgeVisible(bobChatId);

    const controller = new RouteController({
      method: 'POST',
      match: (req) => req.url().includes(bobChatId),
    });
    await page.route(API_ROUTES.CHAT_READ, (route) => {
      return controller.handle(route);
    });

    // Select chat -> triggers optimistic update (badge hidden)
    await chatDashboardPage.selectChatById(bobChatId);
    await chatDashboardPage.expectUnreadBadgeHidden(bobChatId);

    // abort -> should rollback (badge visible)
    controller.abort();
    await chatDashboardPage.expectUnreadBadgeVisible(bobChatId);

    await chatDashboardPage.selectChatById(aliceChatId);

    // Reload and verify server state wasn't changed (badge still visible)
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.expectUnreadBadgeVisible(bobChatId);

    // Select chat again -> triggers optimistic update
    await chatDashboardPage.selectChatById(bobChatId);
    await chatDashboardPage.expectUnreadBadgeHidden(bobChatId);

    // Wait for request, then let it through
    await controller.waitForPending();
    controller.continue();

    // Badge should stay hidden (server updated)
    await chatDashboardPage.expectUnreadBadgeHidden(bobChatId);

    await chatDashboardPage.selectChatById(aliceChatId);

    // Reload and verify server state was updated (badge gone)
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();
    await chatDashboardPage.selectChatById(bobChatId);

    // Let any new read requests through
    controller.continue();

    await chatDashboardPage.expectUnreadBadgeHidden(bobChatId);
  });
});
