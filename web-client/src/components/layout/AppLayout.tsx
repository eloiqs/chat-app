import type { ReactNode } from 'react';

interface AppLayoutProps {
  children: ReactNode;
  title?: ReactNode;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const renderTitle = () => {
    if (typeof title === 'string' || !title) {
      return <h1 className="text-2xl font-bold">{title || 'Chat App'}</h1>;
    }
    return title;
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="border-b bg-background z-10 shrink-0">
        <div className="container mx-auto px-4 py-4">{renderTitle()}</div>
      </header>
      <main className="container mx-auto px-4 py-6 flex-1 min-h-0">
        {children}
      </main>
    </div>
  );
}
