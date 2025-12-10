import { test, expect, UI_TEXT } from '../../fixtures/test-fixtures';

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
  }) => {
    await withFailedMessage('Message to resend');
    await chatMessagesPage.retryFailedMessage('Message to resend');
    await chatMessagesPage.expectMessageSent('Message to resend');
  });

  test('should persist failed messages in sessionStorage across reloads', async ({
    withFailedMessage,
    chatMessagesPage,
  }) => {
    await withFailedMessage('Persisted failed message');
    await chatMessagesPage.expectMessageVisible('Persisted failed message');
  });
});
