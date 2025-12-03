import type { Message } from 'shared';

export type OptimisticMessage = Message & {
  isCurrentUser: boolean;
  error?: boolean;
  sending?: boolean;
};
