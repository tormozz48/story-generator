import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import * as supertest from 'supertest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';

import { HealthController } from '../../src/health.controller';

/**
 * Integration smoke test: spins up real Postgres, Redis, MinIO via Testcontainers,
 * boots a minimal NestJS app with just the HealthController, and hits GET /health.
 *
 * TextAiModule, ImageAiModule, StoriesService NOT loaded — this tests infra wiring.
 */
describe('GET /health (integration)', () => {
  let app: INestApplication;
  let pgContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let minioContainer: StartedTestContainer;

  beforeAll(async () => {
    // Spin up containers in parallel; they communicate via host-mapped ports
    [pgContainer, redisContainer, minioContainer] = await Promise.all([
      new GenericContainer('postgres:16-alpine')
        .withEnvironment({
          POSTGRES_USER: 'story',
          POSTGRES_PASSWORD: 'story',
          POSTGRES_DB: 'story_generator',
        })
        .withExposedPorts(5432)
        .start(),
      new GenericContainer('redis:7-alpine').withExposedPorts(6379).start(),
      new GenericContainer('minio/minio:latest')
        .withEnvironment({
          MINIO_ROOT_USER: 'minioadmin',
          MINIO_ROOT_PASSWORD: 'minioadmin',
        })
        .withCommand(['server', '/data'])
        .withExposedPorts(9000)
        .start(),
    ]);

    const env = {
      NODE_ENV: 'test',
      PORT: '3099',
      DATABASE_URL: `postgresql://story:story@localhost:${pgContainer.getMappedPort(5432)}/story_generator`,
      REDIS_HOST: 'localhost',
      REDIS_PORT: String(redisContainer.getMappedPort(6379)),
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: String(minioContainer.getMappedPort(9000)),
      MINIO_USE_SSL: 'false',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'minioadmin',
      MINIO_BUCKET: 'story-generator',
      THROTTLE_TTL: '3600000',
      THROTTLE_LIMIT: '10',
    };

    // Minimal module — only HealthController; no AI or DB modules needed
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => env],
        }),
      ],
      controllers: [HealthController],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await Promise.all([pgContainer?.stop(), redisContainer?.stop(), minioContainer?.stop()]);
  });

  it('returns 200 { status: "ok" }', async () => {
    const res = await supertest.default(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});
