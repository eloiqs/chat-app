import { RouteController } from 'playwright-route-controller';
import { test, expect, UI_TEXT, API_ROUTES } from '../../fixtures/test-fixtures';
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
    testData,
  }) => {
    // Add failed message to first chat but don't navigate to it
    await withFailedMessage('Failed in first chat', {
      chatId: testData.chats[0].id,
      navigateToChat: false,
    });

    // Navigate to second chat instead
    await chatDashboardPage.selectChatById(testData.chats[1].id);

    // The failed message should NOT be visible in second chat
    await chatMessagesPage.expectMessageNotVisible('Failed in first chat');
  });

  test('should show correct failed messages when switching between chats', async ({
    withFailedMessage,
    chatDashboardPage,
    chatMessagesPage,
    authenticatedUser,
    testData,
    page,
  }) => {
    // Add failed message to first chat
    await withFailedMessage('Failed message for chat 1', {
      chatId: testData.chats[0].id,
      navigateToChat: false,
    });

    // Add failed message to second chat directly via storage helper
    await addFailedMessage(page, authenticatedUser.id, testData.chats[1].id, {
      content: 'Failed message for chat 2',
      error: true,
    });
    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();

    // Navigate to first chat - should see first chat's failed message
    await chatDashboardPage.selectChatById(testData.chats[0].id);
    await chatMessagesPage.expectMessageVisible('Failed message for chat 1');
    await chatMessagesPage.expectMessageNotVisible('Failed message for chat 2');

    // Navigate to second chat - should see second chat's failed message
    await chatDashboardPage.selectChatById(testData.chats[1].id);
    await chatMessagesPage.expectMessageVisible('Failed message for chat 2');
    await chatMessagesPage.expectMessageNotVisible('Failed message for chat 1');
  });

  test('should maintain separate failed messages for multiple chats', async ({
    authenticatedUser,
    chatDashboardPage,
    chatMessagesPage,
    testData,
    page,
  }) => {
    // Add different failed messages to three different chats
    await addFailedMessage(page, authenticatedUser.id, testData.chats[0].id, {
      content: 'Error in chat 1',
      error: true,
    });
    await addFailedMessage(page, authenticatedUser.id, testData.chats[1].id, {
      content: 'Error in chat 2',
      error: true,
    });
    await addFailedMessage(page, authenticatedUser.id, testData.chats[2].id, {
      content: 'Error in chat 3',
      error: true,
    });

    await page.reload();
    await chatDashboardPage.waitForChatsToLoad();

    // Verify each chat shows only its own failed message
    await chatDashboardPage.selectChatById(testData.chats[0].id);
    await chatMessagesPage.expectMessageVisible('Error in chat 1');
    await chatMessagesPage.expectMessageNotVisible('Error in chat 2');
    await chatMessagesPage.expectMessageNotVisible('Error in chat 3');

    await chatDashboardPage.selectChatById(testData.chats[1].id);
    await chatMessagesPage.expectMessageVisible('Error in chat 2');
    await chatMessagesPage.expectMessageNotVisible('Error in chat 1');
    await chatMessagesPage.expectMessageNotVisible('Error in chat 3');

    await chatDashboardPage.selectChatById(testData.chats[2].id);
    await chatMessagesPage.expectMessageVisible('Error in chat 3');
    await chatMessagesPage.expectMessageNotVisible('Error in chat 1');
    await chatMessagesPage.expectMessageNotVisible('Error in chat 2');
  });
});
