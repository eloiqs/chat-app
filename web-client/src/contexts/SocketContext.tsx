import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { io, Socket } from 'socket.io-client';
import type { TypingIndicator, NewMessageEvent } from 'shared';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinChat: (chatId: string) => void;
  leaveChat: (chatId: string) => void;
  emitTyping: (chatId: string, userId: string, isTyping: boolean) => void;
  onUserTyping: (callback: (data: TypingIndicator) => void) => () => void;
  onNewMessage: (callback: (data: NewMessageEvent) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
  userId: string;
}

export function SocketProvider({ children, userId }: SocketProviderProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;
    const newSocket = io(apiUrl, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Authenticate the socket connection with the user ID
      newSocket.emit('authenticate', { userId });
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      //
    });

    newSocket.on('reconnect', (attemptNumber) => {
      //
    });

    newSocket.on('reconnect_failed', () => {
      //
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [userId]);

  const joinChat = (chatId: string) => {
    if (!socket?.connected) {
      console.warn('Socket not connected, cannot join chat');
      return;
    }
    socket.emit('join_chat', { chatId });
  };

  const leaveChat = (chatId: string) => {
    if (!socket?.connected) {
      console.warn('Socket not connected, cannot leave chat');
      return;
    }
    socket.emit('leave_chat', { chatId });
  };

  const emitTyping = (chatId: string, userId: string, isTyping: boolean) => {
    if (!socket?.connected) {
      return; // Silently fail for typing indicators
    }
    socket.emit('typing', { chatId, userId, isTyping });
  };

  const onUserTyping = (callback: (data: TypingIndicator) => void) => {
    if (!socket) return () => {};

    socket.on('user_typing', callback);

    return () => {
      socket.off('user_typing', callback);
    };
  };

  const onNewMessage = (callback: (data: NewMessageEvent) => void) => {
    if (!socket) return () => {};

    socket.on('new_message', callback);

    return () => {
      socket.off('new_message', callback);
    };
  };

  const value: SocketContextValue = {
    socket,
    isConnected,
    joinChat,
    leaveChat,
    emitTyping,
    onUserTyping,
    onNewMessage,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}
