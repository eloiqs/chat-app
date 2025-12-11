import {
  test,
  expect,
  TestUsers,
  API_ROUTES,
} from '../../fixtures/test-fixtures';
import { TestChats } from '../../data/test-data';
import { RouteController } from 'playwright-route-controller';

test.describe('View Messages', () => {
  test('should display messages when selecting a chat', async ({
    onAliceChat,
    chatDashboardPage,
    page,
  }) => {
    await chatDashboardPage.expectOnChatRoute(TestChats.johnAlice.id);

    // Verify the known messages from the mock data are visible in the messages area
    // c1 has 4 base messages: m1, m2, m3, m4
    // Use .last() to get the one in the messages area (not the chat list preview)
    await expect(
      page.getByText('Hey! How are you doing?').last(),
    ).toBeVisible();
    await expect(
      page
        .getByText("I'm doing great! Just finished the project proposal.")
        .last(),
    ).toBeVisible();
    await expect(
      page.getByText("That's awesome! Can you send it over?").last(),
    ).toBeVisible();
    await expect(
      page.getByText(TestChats.johnAlice.lastMessage).last(),
    ).toBeVisible();
  });

  test('should show sender name for other users messages', async ({
    onAliceChat,
    page,
  }) => {
    // Alice's messages should show her name
    await expect(page.getByText(TestUsers.alice.name).first()).toBeVisible();
  });

  test('should mark chat as read when opened', async ({
    authenticatedAsJohn,
    chatDashboardPage,
    page,
    serverProcess,
  }) => {
    await chatDashboardPage.waitForChatsToLoad();

    const controller = new RouteController({
      method: 'POST',
      match: (req) => req.url().includes(TestChats.johnBob.id),
    });
    await page.route(API_ROUTES.CHAT_READ, (route) => controller.handle(route));

    // Bob's chat has unread messages
    await chatDashboardPage.expectOnChatRoute(TestChats.johnAlice.id);
    await chatDashboardPage.expectUnreadBadgeVisible(TestChats.johnBob.id);

    await chatDashboardPage.selectChatById(TestChats.johnBob.id);

    // Badge should disappear after viewing
    await controller.continueAll();
    await chatDashboardPage.expectUnreadBadgeHidden(TestChats.johnBob.id);
  });
});
