import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export interface RedisMessage {
  type: string;
  chatId: string;
  [key: string]: unknown;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private publisher: Redis;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>(
      'REDIS_URL',
      'redis://localhost:6379',
    );

    this.publisher = new Redis(redisUrl);

    this.publisher.on('error', (error) => {
      console.error('Redis publisher error:', error);
    });

    console.log('Redis publisher connected');
  }

  async onModuleDestroy() {
    await this.publisher?.quit();
  }

  async publish(channel: string, message: RedisMessage): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }
}
