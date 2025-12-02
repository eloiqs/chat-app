import { useActionState, useRef, useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

interface MessageInputProps {
  sendMessageAction: (content: string) => Promise<void>;
}

export function MessageInput({ sendMessageAction }: MessageInputProps) {
  const formRef = useRef<HTMLFormElement>(null);

  const [error, submitAction, isPending] = useActionState<undefined, FormData>(
    async (_previousState, formData) => {
      const message = formData.get('message');
      if (message && typeof message === 'string' && message.trim()) {
        formRef.current?.reset();
        await sendMessageAction(message);
      }
    },
    undefined,
  );

  return (
    <form action={submitAction} className="flex gap-2" ref={formRef}>
      <Input
        type="text"
        name="message"
        placeholder="Type a message..."
        className="flex-1"
      />
      <Button type="submit" size="icon" disabled={isPending}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
