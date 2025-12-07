import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export function MessageInput({
  sendMessageAction,
  sendMessagePending,
}: {
  sendMessageAction: (content: string) => void;
  sendMessagePending: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  const submitAction = async (formData: FormData) => {
    const message = formData.get('message');
    if (message && typeof message === 'string' && message.trim()) {
      formRef.current?.reset();
      sendMessageAction(message);
    }
  };

  return (
    <form action={submitAction} className="flex gap-2" ref={formRef}>
      <Input
        type="text"
        name="message"
        placeholder="Type a message..."
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={sendMessagePending}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
