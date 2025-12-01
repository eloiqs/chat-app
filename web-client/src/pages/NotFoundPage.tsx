import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <AppLayout title="404">
      <div className="max-w-2xl mx-auto text-center py-12">
        <h2 className="text-4xl font-bold mb-4">404</h2>
        <p className="text-muted-foreground mb-6">Page not found</p>
        <Link to="/">
          <Button>Back to Chats</Button>
        </Link>
      </div>
    </AppLayout>
  );
}
