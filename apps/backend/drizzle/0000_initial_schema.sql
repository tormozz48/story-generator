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
