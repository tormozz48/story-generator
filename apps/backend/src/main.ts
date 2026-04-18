import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { JsonLogger } from './common/logger/json.logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new JsonLogger(),
  });

  app.use(helmet());
  app.enableCors({ origin: process.env['FRONTEND_URL'] ?? '*' });
  app.setGlobalPrefix('api');

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  app.get(JsonLogger).log(`API listening on port ${port}`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
