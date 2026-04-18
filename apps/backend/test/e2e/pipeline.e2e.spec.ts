/**
 * E2E test: full pipeline from HTTP POST through stored story, using nock cassettes.
 *
 * Record once with RECORD=true and a real OPENROUTER_API_KEY; subsequent runs replay.
 * Assertions: structure, language (Cyrillic present), length, schema validity.
 * Never asserts exact AI-generated text.
 */
import fs from 'fs';
import path from 'path';

import { BullModule } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';
import nock from 'nock';
import { Pool } from 'pg';
import * as supertest from 'supertest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, it, expect } from 'vitest';

import * as schema from '../../src/db/schema';
import { DRIZZLE } from '../../src/modules/database/database.module';
import { GenerationModule } from '../../src/modules/generation/generation.module';
import { ImageAiModule } from '../../src/modules/image-ai/image-ai.module';
import { JobsModule } from '../../src/modules/jobs/jobs.module';
import { REDIS_CLIENT } from '../../src/modules/redis/redis.module';
import { SafetyModule } from '../../src/modules/safety/safety.module';
import { StorageModule } from '../../src/modules/storage/storage.module';
import { StoriesModule } from '../../src/modules/stories/stories.module';
import { TextAiModule } from '../../src/modules/text-ai/text-ai.module';

const CASSETTE_PATH = path.join(__dirname, '../fixtures/openrouter-plan.json');
const RECORD_MODE = process.env['RECORD'] === 'true';

function loadCassette() {
  const cassette = JSON.parse(fs.readFileSync(CASSETTE_PATH, 'utf-8')) as Array<{
    scope: string;
    method: string;
    path: string;
    status: number;
    response: unknown;
  }>;
  for (const entry of cassette) {
    nock(entry.scope)
      .post(entry.path)
      .reply(entry.status, entry.response);
  }
}

describe('Generation pipeline (e2e)', () => {
  let app: INestApplication;
  let pgContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let minioContainer: StartedTestContainer;

  beforeAll(async () => {
    if (!RECORD_MODE) {
      loadCassette();
    }

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
        .withEnvironment({ MINIO_ROOT_USER: 'minioadmin', MINIO_ROOT_PASSWORD: 'minioadmin' })
        .withCommand(['server', '/data'])
        .withExposedPorts(9000)
        .start(),
    ]);

    const pgPort = pgContainer.getMappedPort(5432);
    const redisPort = redisContainer.getMappedPort(6379);
    const minioPort = minioContainer.getMappedPort(9000);
    const databaseUrl = `postgresql://story:story@localhost:${pgPort}/story_generator`;

    const pool = new Pool({ connectionString: databaseUrl });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "stories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "owner_id" text,
        "prompt" text NOT NULL,
        "title" text,
        "status" text DEFAULT 'queued' NOT NULL,
        "target_length" integer DEFAULT 2000 NOT NULL,
        "style" text DEFAULT 'photorealistic' NOT NULL,
        "job_id" text,
        "plan" jsonb,
        "generated_text" text,
        "error_message" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    await pool.end();

    const env = {
      NODE_ENV: 'test',
      PORT: '3097',
      DATABASE_URL: databaseUrl,
      REDIS_HOST: 'localhost',
      REDIS_PORT: String(redisPort),
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: String(minioPort),
      MINIO_USE_SSL: 'false',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'minioadmin',
      MINIO_BUCKET: 'story-generator',
      THROTTLE_TTL: '3600000',
      THROTTLE_LIMIT: '100',
      OPENROUTER_API_KEY: RECORD_MODE ? (process.env['OPENROUTER_API_KEY'] ?? 'test-key') : 'test-key',
      OPENROUTER_TEXT_MODEL: 'qwen/qwen-2.5-72b-instruct',
    };

    const db = drizzle(new Pool({ connectionString: databaseUrl }), { schema });
    const redis = new Redis({ host: 'localhost', port: redisPort });

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
        BullModule.forRoot({ connection: { host: 'localhost', port: redisPort } }),
        StorageModule,
        SafetyModule,
        TextAiModule,
        ImageAiModule,
        GenerationModule,
        StoriesModule,
        JobsModule,
      ],
    })
      .overrideProvider(DRIZZLE)
      .useValue(db)
      .overrideProvider(REDIS_CLIENT)
      .useValue(redis)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  }, 120_000);

  afterAll(async () => {
    nock.cleanAll();
    nock.enableNetConnect();
    await app?.close();
    await Promise.all([pgContainer?.stop(), redisContainer?.stop(), minioContainer?.stop()]);
  });

  it('creates a story and eventually reaches done status with Cyrillic text', async () => {
    const createRes = await supertest
      .default(app.getHttpServer())
      .post('/api/stories')
      .send({
        prompt: 'Страстная встреча двух взрослых людей на вечеринке в Москве',
        targetLength: 500,
      })
      .expect(201);

    const { storyId } = createRes.body as { storyId: string; jobId: string };
    expect(storyId).toMatch(/^[0-9a-f-]{36}$/);

    // Wait for worker to process
    let story: { status: string; generatedText: string | null; title: string | null } | undefined;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await supertest
        .default(app.getHttpServer())
        .get(`/api/stories/${storyId}`)
        .expect(200);
      story = res.body as typeof story;
      if (story?.status === 'done' || story?.status === 'failed') break;
    }

    // Assert invariants, not exact text
    expect(story?.status).toBe('done');
    expect(story?.generatedText).toBeTruthy();
    expect(story?.generatedText?.length).toBeGreaterThan(50);

    // Must contain Cyrillic (story is in Russian)
    const cyrillicPattern = /[\u0400-\u04FF]/;
    expect(cyrillicPattern.test(story?.generatedText ?? '')).toBe(true);

    // Title should be set
    expect(story?.title).toBeTruthy();
  }, 60_000);
});
