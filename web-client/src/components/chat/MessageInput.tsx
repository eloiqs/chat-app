import { useOptimistic, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface MessageInputProps {
  sendMessageAction: (content: string) => Promise<void>;
}

export function MessageInput({ sendMessageAction }: MessageInputProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [sending, setSending] = useOptimistic(
    false,
    (_state, next: boolean) => next,
  );

  const submitAction = async (formData: FormData) => {
    const message = formData.get('message');
    if (message && typeof message === 'string' && message.trim()) {
      formRef.current?.reset();
      setSending(true);
      await sendMessageAction(message);
      setSending(false);
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
      <Button type="submit" size="icon" disabled={sending}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
