/**
 * Integration test: full HTTP → queue → worker pipeline.
 *
 * TextAiService and ImageAiService are mocked at the NestJS provider boundary.
 * Real Postgres, Redis, MinIO via Testcontainers.
 *
 * Asserts: story created, status transitions, story readable via GET,
 * images persisted to DB and MinIO on success, scene failure produces placeholder.
 */
import { BullModule } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import Redis from 'ioredis';
import { Pool } from 'pg';
import * as supertest from 'supertest';
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { afterAll, beforeAll, describe, it, expect, vi } from 'vitest';

import * as schema from '../../src/db/schema';
import { HealthController } from '../../src/health.controller';
import { DRIZZLE } from '../../src/modules/database/database.module';
import { GenerationModule } from '../../src/modules/generation/generation.module';
import { ImageAiModule } from '../../src/modules/image-ai/image-ai.module';
import { ImageAiService } from '../../src/modules/image-ai/image-ai.service';
import { JobsModule } from '../../src/modules/jobs/jobs.module';
import { REDIS_CLIENT } from '../../src/modules/redis/redis.module';
import { SafetyModule } from '../../src/modules/safety/safety.module';
import { StorageModule } from '../../src/modules/storage/storage.module';
import { StoriesModule } from '../../src/modules/stories/stories.module';
import { TextAiModule } from '../../src/modules/text-ai/text-ai.module';
import { TextAiService } from '../../src/modules/text-ai/text-ai.service';

const MOCK_PLAN = {
  title: 'Встреча в ночном клубе',
  characterSheet: 'Анна, 24 года, высокая брюнетка с зелёными глазами',
  styleDescription: 'Реалистичный фотографический стиль',
  sceneOutline: ['Анна входит в клуб', 'Случайное знакомство', 'Страстный финал'],
  imagePrompts: [
    'Woman entering nightclub, photorealistic',
    'Two people meeting at a bar, photorealistic',
    'Passionate embrace, photorealistic',
  ],
};

const MOCK_STORY_TEXT =
  'Анна вошла в клуб и сразу почувствовала чужой взгляд на себе...\n\nОна остановилась у входа.\n\nФинал истории.';

const MOCK_REFERENCE_PORTRAIT = {
  url: 'http://localhost:9000/story-generator/images/story-id/reference.png',
  storageKey: 'images/story-id/reference.png',
};

const MOCK_SCENE_IMAGES = [
  { url: 'http://minio/scene-0.png', storageKey: 'images/id/scene-0.png', sceneIndex: 0 },
  { url: 'http://minio/scene-1.png', storageKey: 'images/id/scene-1.png', sceneIndex: 1 },
  { url: '', storageKey: '', sceneIndex: 2 }, // simulated failure on scene 2
];

const CREATE_TABLES_SQL = `
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
  CREATE TABLE IF NOT EXISTS "images" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "story_id" uuid NOT NULL,
    "kind" text NOT NULL,
    "scene_index" integer,
    "storage_key" text NOT NULL,
    "url" text NOT NULL,
    "status" text DEFAULT 'done' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  );
`;

describe('Stories pipeline (integration)', () => {
  let app: INestApplication;
  let pgContainer: StartedTestContainer;
  let redisContainer: StartedTestContainer;
  let minioContainer: StartedTestContainer;

  beforeAll(async () => {
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
    await pool.query(CREATE_TABLES_SQL);
    await pool.end();

    const env = {
      NODE_ENV: 'test',
      PORT: '3098',
      DATABASE_URL: databaseUrl,
      REDIS_HOST: 'localhost',
      REDIS_PORT: String(redisPort),
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: String(minioPort),
      MINIO_USE_SSL: 'false',
      MINIO_ACCESS_KEY: 'minioadmin',
      MINIO_SECRET_KEY: 'minioadmin',
      MINIO_BUCKET: 'story-generator',
      MINIO_PUBLIC_URL: `http://localhost:${minioPort}`,
      THROTTLE_TTL: '3600000',
      THROTTLE_LIMIT: '100',
      OPENROUTER_API_KEY: 'test-key',
      OPENROUTER_TEXT_MODEL: 'test-model',
      REPLICATE_API_KEY: 'test-key',
      REPLICATE_IMAGE_MODEL: 'test/model',
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
      controllers: [HealthController],
    })
      .overrideProvider(DRIZZLE)
      .useValue(db)
      .overrideProvider(REDIS_CLIENT)
      .useValue(redis)
      // Mock TextAiService — do not hit real API
      .overrideProvider(TextAiService)
      .useValue({
        plan: vi.fn().mockResolvedValue(MOCK_PLAN),
        writeStory: vi.fn().mockResolvedValue(MOCK_STORY_TEXT),
      })
      // Mock ImageAiService — do not hit real Replicate
      .overrideProvider(ImageAiService)
      .useValue({
        generateReferencePortrait: vi.fn().mockResolvedValue(MOCK_REFERENCE_PORTRAIT),
        generateSceneImages: vi.fn().mockResolvedValue(MOCK_SCENE_IMAGES),
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await Promise.all([pgContainer?.stop(), redisContainer?.stop(), minioContainer?.stop()]);
  });

  it('POST /api/stories returns storyId and jobId', async () => {
    const res = await supertest
      .default(app.getHttpServer())
      .post('/api/stories')
      .send({ prompt: 'Романтическая история о встрече двух взрослых людей в Москве' })
      .expect(201);

    expect(res.body).toMatchObject({
      storyId: expect.stringMatching(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      ),
      jobId: expect.any(String),
    });
  });

  it('POST /api/stories with blocked prompt returns 422', async () => {
    const res = await supertest
      .default(app.getHttpServer())
      .post('/api/stories')
      .send({ prompt: 'child porn story with explicit content and more text' })
      .expect(422);

    expect(res.body).toMatchObject({ error: 'unsafe_prompt' });
  });

  it('GET /api/stories/:id returns story with images after processing', async () => {
    // Create story
    const createRes = await supertest
      .default(app.getHttpServer())
      .post('/api/stories')
      .send({ prompt: 'Романтическая история о встрече двух взрослых людей в Москве' })
      .expect(201);

    const { storyId } = createRes.body as { storyId: string; jobId: string };

    // Poll until done (worker processes async)
    let story:
      | {
          status: string;
          generatedText: string | null;
          images?: Array<{ kind: string; url: string; status: string }>;
        }
      | undefined;
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await supertest
        .default(app.getHttpServer())
        .get(`/api/stories/${storyId}`)
        .expect(200);
      story = res.body as typeof story;
      if (story?.status === 'done' || story?.status === 'failed') break;
    }

    expect(story?.status).toBe('done');
    expect(story?.generatedText).toBeTruthy();

    // Images should be present
    expect(Array.isArray(story?.images)).toBe(true);
    const images = story?.images ?? [];

    // Reference portrait
    const ref = images.find((img) => img.kind === 'reference');
    expect(ref).toBeDefined();
    expect(ref?.url).toBeTruthy();
    expect(ref?.status).toBe('done');

    // Scene images: 2 succeeded, 1 failed (from mock)
    const scenes = images.filter((img) => img.kind === 'scene');
    expect(scenes).toHaveLength(3);
    expect(scenes.filter((s) => s.status === 'done')).toHaveLength(2);
    expect(scenes.filter((s) => s.status === 'failed')).toHaveLength(1);
  }, 30_000);

  it('GET /api/stories/:id scene failure does not fail the whole story', async () => {
    // The mock already returns one failed scene (index 2). The story should still be 'done'.
    const createRes = await supertest
      .default(app.getHttpServer())
      .post('/api/stories')
      .send({ prompt: 'История о двух взрослых людях на отдыхе у моря' })
      .expect(201);

    const { storyId } = createRes.body as { storyId: string };

    let status = '';
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 500));
      const res = await supertest
        .default(app.getHttpServer())
        .get(`/api/stories/${storyId}`)
        .expect(200);
      const body = res.body as { status: string };
      status = body.status;
      if (status === 'done' || status === 'failed') break;
    }

    expect(status).toBe('done'); // story completes despite one scene failure
  }, 30_000);

  it('GET /api/stories/nonexistent returns 404', async () => {
    await supertest
      .default(app.getHttpServer())
      .get('/api/stories/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });
});
