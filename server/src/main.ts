import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for the web client
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: ['http://localhost:5173', 'http://proxyman.debug:5173'],
      credentials: true,
    });
  }

  await app.listen(3000);
  console.log(`Server is running on: http://localhost:3000`);
}
bootstrap();
