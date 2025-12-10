/**
 * UI text constants used in tests.
 * These should match the actual text displayed in the application.
 * Having them centralized makes it easy to update if the UI text changes.
 */

export const UI_TEXT = {
  // Loading states
  LOADING_USERS: 'Loading users...',
  LOADING_CHATS: 'Loading chats...',

  // Message states
  MESSAGE_SENDING: 'Sending...',
  MESSAGE_ERROR: 'Not sent. Tap for options.',
  NO_MESSAGES: 'No messages yet. Start the conversation!',

  // Page headings
  WELCOME_HEADING: 'Welcome to Chat App',

  // Buttons
  BUTTON_SELECT: 'Select',
  BUTTON_LOGOUT: /logout/i,
  BUTTON_RETRY: 'Retry',
  BUTTON_DELETE: 'Delete',

  // Placeholders
  MESSAGE_INPUT_PLACEHOLDER: 'Type a message...',
} as const;

/**
 * API route patterns for mocking/interception
 */
export const API_ROUTES = {
  USERS: '**/api/chats/users',
  CHATS: '**/api/chats',
  CHAT_MESSAGES: '**/api/chats/*/messages',
  CHAT_READ: '**/api/chats/*/read',
} as const;
