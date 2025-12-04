import type * as Shared from 'shared';

export interface User extends Shared.User {}

export interface ClientMessage extends Shared.Message {
  isCurrentUser: boolean;
  error?: boolean;
  sending?: boolean;
}
