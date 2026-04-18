import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';
import { JsonLogger } from './common/logger/json.logger';

/**
 * BullMQ worker entrypoint. Boots the full AppModule (so all providers,
 * including the GenerationProcessor, are registered) but does NOT start
 * an HTTP server — workers have no public port.
 */
async function bootstrapWorker() {
  const logger = new JsonLogger();
  const app = await NestFactory.createApplicationContext(AppModule, { logger });

  logger.log('Worker process started', 'Bootstrap');

  // Keep the process alive; BullMQ workers are long-running
  process.on('SIGTERM', async () => {
    await app.close();
    process.exit(0);
  });
}

bootstrapWorker().catch((err) => {
  console.error('Worker bootstrap failed', err);
  process.exit(1);
});
