import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:5173',
  );
  const corsCredentials =
    configService.get<string>('CORS_CREDENTIALS', 'true') === 'true';

  app.enableCors({
    origin: corsOrigins.split(',').map((origin) => origin.trim()),
    credentials: corsCredentials,
  });

  const port = configService.get<number>('PORT', 3002);
  await app.listen(port);
  console.log(`WebSocket Gateway is running on: http://localhost:${port}`);
}
bootstrap();
