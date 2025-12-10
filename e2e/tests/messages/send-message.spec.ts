import { RouteController } from 'utils/route-controller';
import { test, expect, API_ROUTES } from '../../fixtures/test-fixtures';

test.describe('Send Message - Success', () => {
  test('should show optimistic message immediately', async ({
    onAliceChat,
    chatMessagesPage,
  }) => {
    const testMessage = `Test message ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);

    // Message should appear immediately
    await chatMessagesPage.expectMessageVisible(testMessage);
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
  });

  test('should confirm message after successful send', async ({
    onAliceChat,
    chatMessagesPage,
  }) => {
    const testMessage = `Confirmed message ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);

    await chatMessagesPage.expectMessageSent(testMessage);
  });

  test('should clear input after sending', async ({
    onAliceChat,
    chatMessagesPage,
  }) => {
    const testMessage = `Clear input test ${Date.now()}`;
    await chatMessagesPage.sendMessage(testMessage);

    await chatMessagesPage.expectInputEmpty();
  });
});
