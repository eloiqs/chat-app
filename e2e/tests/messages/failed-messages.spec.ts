import { RouteController } from 'playwright-route-controller';
import { test, expect, UI_TEXT, API_ROUTES, TestUsers } from '../../fixtures/test-fixtures';
import { addFailedMessage } from '../../helpers/storage.helper';

test.describe('Send Message - Error & Recovery', () => {
  test('should display error state for failed messages', async ({
    withFailedMessage,
    chatMessagesPage,
  }) => {
    await withFailedMessage('Failed message content');
    await chatMessagesPage.expectMessageError('Failed message content');
  });

  test('should show retry option for failed messages', async ({
    withFailedMessage,
    page,
  }) => {
    await withFailedMessage('Message to retry');
    await page.getByText(UI_TEXT.MESSAGE_ERROR).click();
    await expect(
      page.getByRole('button', { name: UI_TEXT.BUTTON_RETRY }),
    ).toBeVisible();
  });

  test('should show delete option for failed messages', async ({
    withFailedMessage,
    page,
  }) => {
    await withFailedMessage('Message to remove');
    await page.getByText(UI_TEXT.MESSAGE_ERROR).click();
    await expect(
      page.getByRole('button', { name: UI_TEXT.BUTTON_DELETE }),
    ).toBeVisible();
  });

  test('should remove message when delete is clicked', async ({
    withFailedMessage,
    chatMessagesPage,
  }) => {
    await withFailedMessage('Message to delete');
    await chatMessagesPage.deleteFailedMessage('Message to delete');
    await chatMessagesPage.expectMessageNotVisible('Message to delete');
  });

  test('should resend message when retry is clicked', async ({
    withFailedMessage,
    chatMessagesPage,
    page,
  }) => {
    const controller = new RouteController({ method: 'POST' });
    await page.route(API_ROUTES.CHAT_MESSAGES, (route) =>
      controller.handle(route),
    );

    await withFailedMessage('Message to resend');
    await chatMessagesPage.retryFailedMessage('Message to resend');

    // Verify sending state while request is pending
    await chatMessagesPage.expectMessageSending('Message to resend');

    // Let request complete
    controller.continue();

    await chatMessagesPage.expectMessageSent('Message to resend');
  });

  test('should persist failed messages in sessionStorage across reloads', async ({
    withFailedMessage,
    chatMessagesPage,
  }) => {
    await withFailedMessage('Persisted failed message');
    await chatMessagesPage.expectMessageVisible('Persisted failed message');
  });

  test('should not show failed message from one chat in another chat', async ({
    withFailedMessage,
    chatDashboardPage,
    chatMessagesPage,
  }) => {
    // Add failed message to chat c1 (Alice) but don't navigate to it
    await withFailedMessage('Failed in Alice chat', {
      chatId: 'c1',
      navigateToChat: false,
    });

    // Navigate to chat c2 (Bob) instead
    await chatDashboardPage.selectChatById('c2');

    // The failed message should NOT be visible in Bob's chat
    await chatMessagesPage.expectMessageNotVisible('Failed in Alice chat');
  });

  test('should show correct failed messages when switching between chats', async ({
    withFailedMessage,
    chatDashboardPage,
    chatMessagesPage,
    page,
  }) => {
    // Add failed message to chat c1 (Alice)
    await withFailedMessage('Failed message for Alice', {
      chatId: 'c1',
      navigateToChat: false,
    });

    // Add failed message to chat c2 (Bob) directly via storage helper
    await addFailedMessage(page, TestUsers.john.id, 'c2', {
      content: 'Failed message for Bob',
      error: true,
    });
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();

    // Navigate to Alice's chat (c1) - should see Alice's failed message
    await chatDashboardPage.selectChatById('c1');
    await chatMessagesPage.expectMessageVisible('Failed message for Alice');
    await chatMessagesPage.expectMessageNotVisible('Failed message for Bob');

    // Navigate to Bob's chat (c2) - should see Bob's failed message
    await chatDashboardPage.selectChatById('c2');
    await chatMessagesPage.expectMessageVisible('Failed message for Bob');
    await chatMessagesPage.expectMessageNotVisible('Failed message for Alice');
  });

  test('should maintain separate failed messages for multiple chats', async ({
    authenticatedAsJohn,
    chatDashboardPage,
    chatMessagesPage,
    page,
  }) => {
    // Add different failed messages to three different chats
    await addFailedMessage(page, TestUsers.john.id, 'c1', {
      content: 'Error in chat with Alice',
      error: true,
    });
    await addFailedMessage(page, TestUsers.john.id, 'c2', {
      content: 'Error in chat with Bob',
      error: true,
    });
    await addFailedMessage(page, TestUsers.john.id, 'c3', {
      content: 'Error in chat with Charlie',
      error: true,
    });

    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();

    // Verify each chat shows only its own failed message
    await chatDashboardPage.selectChatById('c1');
    await chatMessagesPage.expectMessageVisible('Error in chat with Alice');
    await chatMessagesPage.expectMessageNotVisible('Error in chat with Bob');
    await chatMessagesPage.expectMessageNotVisible('Error in chat with Charlie');

    await chatDashboardPage.selectChatById('c2');
    await chatMessagesPage.expectMessageVisible('Error in chat with Bob');
    await chatMessagesPage.expectMessageNotVisible('Error in chat with Alice');
    await chatMessagesPage.expectMessageNotVisible('Error in chat with Charlie');

    await chatDashboardPage.selectChatById('c3');
    await chatMessagesPage.expectMessageVisible('Error in chat with Charlie');
    await chatMessagesPage.expectMessageNotVisible('Error in chat with Alice');
    await chatMessagesPage.expectMessageNotVisible('Error in chat with Bob');
  });
});
