/**
 * Centralized test data constants.
 * This module provides a single source of truth for all test data IDs and values.
 */

import type { User } from 'shared';

/**
 * Test users - these match the mock data in the server
 */
export const TestUsers = {
  john: { id: 'u1', name: 'John Doe', avatar: 'JD' },
  alice: { id: 'u2', name: 'Alice Johnson', avatar: 'AJ' },
  bob: { id: 'u3', name: 'Bob Smith', avatar: 'BS' },
  charlie: { id: 'u4', name: 'Charlie Davis', avatar: 'CD' },
  diana: { id: 'u5', name: 'Diana Wilson', avatar: 'DW' },
} as const satisfies Record<string, User>;

/**
 * Test chat metadata - describes chat relationships and state
 */
export const TestChats = {
  johnAlice: {
    id: 'c1',
    participants: ['u1', 'u2'] as const,
    /** Last message in this chat */
    lastMessage: "Sure, I'll email it to you in a few minutes.",
  },
  johnBob: {
    id: 'c2',
    participants: ['u1', 'u3'] as const,
    /** Number of unread messages for John in this chat */
    unreadCountForJohn: 2,
  },
  johnCharlie: {
    id: 'c3',
    participants: ['u1', 'u4'] as const,
  },
  johnDiana: {
    id: 'c5',
    participants: ['u1', 'u5'] as const,
  },
  groupChat: {
    id: 'c6',
    participants: ['u1', 'u2', 'u3'] as const,
  },
} as const;

/**
 * Chat IDs that John (u1) participates in
 */
export const JohnsChatIds = ['c1', 'c2', 'c3', 'c5', 'c6'] as const;

/**
 * Helper to get user by ID
 */
export function getUserById(id: string): User | undefined {
  return Object.values(TestUsers).find((user) => user.id === id);
}

/**
 * Helper to get chat by ID
 */
export function getChatById(id: string) {
  return Object.values(TestChats).find((chat) => chat.id === id);
}
