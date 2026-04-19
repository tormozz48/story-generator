import type { StoryPlan } from '@story-generator/shared';
import { pgTable, text, integer, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';

export const stories = pgTable('stories', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: text('owner_id'), // nullable: anonymous browser UUID
  prompt: text('prompt').notNull(),
  title: text('title'),
  status: text('status').notNull().default('queued'),
  targetLength: integer('target_length').notNull().default(2000),
  style: text('style').notNull().default('photorealistic'),
  jobId: text('job_id'),
  plan: jsonb('plan').$type<StoryPlan>(),
  generatedText: text('generated_text'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const images = pgTable('images', {
  id: uuid('id').primaryKey().defaultRandom(),
  storyId: uuid('story_id')
    .notNull()
    .references(() => stories.id),
  kind: text('kind').notNull(), // 'reference' | 'scene'
  sceneIndex: integer('scene_index'), // nullable for reference portrait
  storageKey: text('storage_key').notNull(),
  url: text('url').notNull(),
  status: text('status').notNull().default('done'), // 'done' | 'failed'
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export type StoriesTable = typeof stories;
export type ImagesTable = typeof images;
