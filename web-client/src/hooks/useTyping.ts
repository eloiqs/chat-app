import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { TypingIndicator } from 'shared';
import { useSocket } from '@/contexts/SocketProvider';

const TYPING_TIMEOUT = 3000;
const REFRESH_INTERVAL = 2000;
const DEBOUNCE_MS = 1000;

export type TypingByChat = Map<string, { userId: string; userName: string }[]>;

/**
 * Consolidated typing hook that handles both listening and emitting.
 *
 * Usage:
 * - Without chatId: returns typingByChat map (for chat list/sidebar)
 * - With chatId: returns typingUserNames for that chat + handleTyping/stopTyping emitters
 */
export function useTyping(chatId?: string) {
  const { onTypingIndicator, sendTyping } = useSocket();
  const [typingByChat, setTypingByChat] = useState<TypingByChat>(new Map());
  const typingTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  // Emitter state (only used when chatId is provided)
  const isTypingRef = useRef(false);
  const stopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEmitRef = useRef(0);

  // Listen for typing events
  useEffect(() => {
    const unsubscribe = onTypingIndicator((event: TypingIndicator) => {
      const key = `${event.chatId}:${event.userId}`;

      // Clear existing timeout for this user
      const existingTimeout = typingTimeoutsRef.current.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        typingTimeoutsRef.current.delete(key);
      }

      if (event.isTyping) {
        // Add user to typing list
        setTypingByChat((prev) => {
          const chatTyping = prev.get(event.chatId) || [];
          if (chatTyping.some((u) => u.userId === event.userId)) return prev;
          return new Map(prev).set(event.chatId, [
            ...chatTyping,
            { userId: event.userId, userName: event.userName },
          ]);
        });

        // Auto-clear after timeout
        const timeout = setTimeout(() => {
          setTypingByChat((prev) => {
            const chatTyping = prev.get(event.chatId);
            if (!chatTyping) return prev;
            const filtered = chatTyping.filter(
              (u) => u.userId !== event.userId,
            );
            if (filtered.length === 0) {
              const rest = new Map(prev);
              rest.delete(event.chatId);
              return rest;
            }
            return new Map(prev).set(event.chatId, filtered);
          });
          typingTimeoutsRef.current.delete(key);
        }, TYPING_TIMEOUT);
        typingTimeoutsRef.current.set(key, timeout);
      } else {
        // Remove user from typing list
        setTypingByChat((prev) => {
          const chatTyping = prev.get(event.chatId);
          if (!chatTyping) return prev;
          const filtered = chatTyping.filter((u) => u.userId !== event.userId);
          if (filtered.length === 0) {
            const rest = new Map(prev);
            rest.delete(event.chatId);
            return rest;
          }
          return new Map(prev).set(event.chatId, filtered);
        });
      }
    });

    return () => {
      unsubscribe();
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.clear();
    };
  }, [onTypingIndicator]);

  // Emit typing (with debouncing)
  const emitTyping = useCallback(
    (isTyping: boolean) => {
      if (chatId) {
        sendTyping(chatId, isTyping);
      }
    },
    [chatId, sendTyping],
  );

  const handleTyping = useCallback(() => {
    if (!chatId) return;

    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
    }

    const now = Date.now();

    // Emit if not already typing, or refresh interval passed
    if (!isTypingRef.current || now - lastEmitRef.current >= REFRESH_INTERVAL) {
      isTypingRef.current = true;
      lastEmitRef.current = now;
      emitTyping(true);
    }

    // Stop typing after debounce period of inactivity
    stopTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTyping(false);
    }, DEBOUNCE_MS);
  }, [chatId, emitTyping]);

  const stopTyping = useCallback(() => {
    if (stopTimeoutRef.current) {
      clearTimeout(stopTimeoutRef.current);
      stopTimeoutRef.current = null;
    }
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emitTyping(false);
    }
  }, [emitTyping]);

  // Cleanup emitter on unmount
  useEffect(() => {
    return () => {
      if (stopTimeoutRef.current) {
        clearTimeout(stopTimeoutRef.current);
      }
      if (isTypingRef.current && chatId) {
        sendTyping(chatId, false);
      }
    };
  }, [chatId, sendTyping]);

  // Return typing user names for specific chat
  const typingUserNames = useMemo(() => {
    if (!chatId) return [];
    return (typingByChat.get(chatId) || []).map((u) => u.userName);
  }, [chatId, typingByChat]);

  return {
    typingByChat,
    typingUserNames,
    handleTyping,
    stopTyping,
  };
}
