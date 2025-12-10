import type { ClientMessage } from '@/types/types';
import type * as Shared from 'shared';

export const toMessage = (
  message: Shared.Message,
  userId: string,
): ClientMessage => {
  return {
    ...message,
    isCurrentUser: message.sender.id === userId,
  };
};
