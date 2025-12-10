import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Get CORS configuration from environment variables
  const corsOrigins = configService.get<string>(
    'CORS_ORIGINS',
    'http://localhost:5173',
  );
  console.log('corsOrigins', corsOrigins);
  const corsCredentials =
    configService.get<string>('CORS_CREDENTIALS', 'true') === 'true';

  // Enable CORS for the web client
  app.enableCors({
    origin: corsOrigins.split(',').map((origin) => origin.trim()),
    credentials: corsCredentials,
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`Server is running on: http://localhost:${port}`);
}
bootstrap();
