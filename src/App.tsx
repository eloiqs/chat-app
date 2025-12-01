import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ChatListPage } from '@/pages/ChatListPage';
import { ChatDetailPage } from '@/pages/ChatDetailPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatListPage />} />
        <Route path="/chat/:chatId" element={<ChatDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
