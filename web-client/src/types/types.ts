import type { Message } from 'shared';

export type OptimisticMessage = Message & {
  error?: boolean;
  sending?: boolean;
};
