CREATE TABLE IF NOT EXISTS "images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"scene_index" integer,
	"storage_key" text NOT NULL,
	"url" text NOT NULL,
	"status" text DEFAULT 'done' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "images_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "stories"("id")
);
