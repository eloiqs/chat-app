import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import type { TypingIndicator, NewMessageEvent } from 'shared';
import { useCurrentUser } from './UserProvider';
import { useAuth } from './AuthContext';

interface SocketContextType {
  isConnected: boolean;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  onNewMessage: (callback: (event: NewMessageEvent) => void) => () => void;
  onTypingIndicator: (callback: (event: TypingIndicator) => void) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3002';

export function SocketProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useCurrentUser();
  const { onLogout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const joinedChatsRef = useRef<Set<string>>(new Set());
  const newMessageCallbacksRef = useRef<Set<(event: NewMessageEvent) => void>>(
    new Set(),
  );
  const typingCallbacksRef = useRef<Set<(event: TypingIndicator) => void>>(
    new Set(),
  );

  useEffect(() => {
    const socket = io(WS_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected, authenticating...');
      socket.emit(
        'authenticate',
        { userId: currentUser.id, userName: currentUser.name },
        (response: { success: boolean }) => {
          if (response.success) {
            console.log('Socket authenticated');
            setIsConnected(true);
            // Rejoin any previously joined chats after reconnection
            joinedChatsRef.current.forEach((chatId) => {
              socket.emit('join_chat', { chatId });
            });
          }
        },
      );
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    socket.on('new_message', (event: NewMessageEvent) => {
      newMessageCallbacksRef.current.forEach((callback) => callback(event));
    });

    socket.on('user_typing', (event: TypingIndicator) => {
      typingCallbacksRef.current.forEach((callback) => callback(event));
    });

    socket.connect();

    // Cleanup on logout
    const unsubscribe = onLogout(() => {
      socket.disconnect();
      joinedChatsRef.current.clear();
      setIsConnected(false);
    });

    return () => {
      unsubscribe();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [currentUser.id, currentUser.name, onLogout]);

  const joinChat = useCallback((chatId: string) => {
    const socket = socketRef.current;
    if (socket?.connected && !joinedChatsRef.current.has(chatId)) {
      socket.emit('join_chat', { chatId });
      joinedChatsRef.current.add(chatId);
    }
  }, []);

  const leaveChat = useCallback((chatId: string) => {
    const socket = socketRef.current;
    if (socket && joinedChatsRef.current.has(chatId)) {
      socket.emit('leave_chat', { chatId });
      joinedChatsRef.current.delete(chatId);
    }
  }, []);

  const sendTyping = useCallback((chatId: string, isTyping: boolean) => {
    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit('typing', { chatId, isTyping });
    }
  }, []);

  const onNewMessage = useCallback(
    (callback: (event: NewMessageEvent) => void) => {
      newMessageCallbacksRef.current.add(callback);
      return () => {
        newMessageCallbacksRef.current.delete(callback);
      };
    },
    [],
  );

  const onTypingIndicator = useCallback(
    (callback: (event: TypingIndicator) => void) => {
      typingCallbacksRef.current.add(callback);
      return () => {
        typingCallbacksRef.current.delete(callback);
      };
    },
    [],
  );

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        joinChat,
        leaveChat,
        sendTyping,
        onNewMessage,
        onTypingIndicator,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
