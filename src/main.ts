import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 4000;

  app.enableCors({
    origin: 'http://localhost:3000', // Ganti dengan URL frontend kamu
    methods: 'GET,POST, FETCH, PUT,DELETE', // Metode HTTP yang diizinkan
    allowedHeaders: 'Content-Type, Authorization', // Header yang diizinkan
    credentials: true,
  });

  app.setGlobalPrefix('api');

  await app.listen(port);
}
bootstrap();
