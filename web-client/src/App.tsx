import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChatListPage } from '@/pages/ChatListPage';
import { ChatDetailPage } from '@/pages/ChatDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { UserSelectionPage } from '@/pages/UserSelectionPage';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function AppRoutes() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <UserSelectionPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<ChatListPage />} />
      <Route path="/chat/:chatId" element={<ChatDetailPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
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
