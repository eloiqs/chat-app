import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChatListPage } from '@/pages/ChatListPage';
import { ChatDetailPage } from '@/pages/ChatDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UserSelectionPage } from '@/pages/UserSelectionPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function AppRoutes() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <UserSelectionPage />;
  }

  return (
    <SocketProvider userId={currentUser.id}>
      <Routes>
        <Route path="/" element={<ChatListPage />} />
        <Route path="/chat/:chatId" element={<ChatDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </SocketProvider>
  );
}

const queryClient = new QueryClient();

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AppRoutes />
        </QueryClientProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
