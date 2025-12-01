import { Controller, Get, Param } from '@nestjs/common';
import type { Chat, Message } from 'shared';
import { ChatService } from './chat.service';

@Controller('api/chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Get()
  getAllChats(): Chat[] {
    return this.chatService.getAllChats();
  }

  @Get(':id')
  getChatById(@Param('id') id: string): Chat | undefined {
    return this.chatService.getChatById(id);
  }

  @Get(':id/messages')
  getChatMessages(@Param('id') id: string): Message[] {
    return this.chatService.getChatMessages(id);
  }
}
