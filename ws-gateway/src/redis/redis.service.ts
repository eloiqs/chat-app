import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RedisMessage {
  type: string;
  chatId: string;
  [key: string]: unknown;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private subscriber: Redis;
  private readonly handlers = new Map<string, Set<(message: RedisMessage) => void>>();

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );

    this.subscriber = new Redis(redisUrl);

    this.subscriber.on('message', (channel: string, message: string) => {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        try {
          const parsed = JSON.parse(message) as RedisMessage;
          handlers.forEach((handler) => handler(parsed));
        } catch (error) {
          console.error('Failed to parse Redis message:', error);
        }
      }
    });

    this.subscriber.on('error', (error) => {
      console.error('Redis subscriber error:', error);
    });

    this.subscriber.on('connect', () => {
      console.log('Redis subscriber connected');
    });
  }

  async onModuleDestroy() {
    await this.subscriber?.quit();
  }

  async subscribe(
    channel: string,
    handler: (message: RedisMessage) => void,
  ): Promise<() => void> {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());
      await this.subscriber.subscribe(channel);
    }

    this.handlers.get(channel)!.add(handler);

    return () => {
      const channelHandlers = this.handlers.get(channel);
      if (channelHandlers) {
        channelHandlers.delete(handler);
        if (channelHandlers.size === 0) {
          this.handlers.delete(channel);
          this.subscriber.unsubscribe(channel);
        }
      }
    };
  }
}
