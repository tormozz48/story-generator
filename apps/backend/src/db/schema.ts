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

export type StoriesTable = typeof stories;
