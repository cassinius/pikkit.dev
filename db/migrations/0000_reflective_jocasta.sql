CREATE TYPE "public"."atom_severity" AS ENUM('critical', 'high', 'medium', 'low');--> statement-breakpoint
CREATE TABLE "atom_embeddings" (
	"atom_id" text PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"embedding_text" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "atoms" (
	"id" text PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"severity" "atom_severity" DEFAULT 'medium' NOT NULL,
	"triggers" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"applies_to" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"checklist" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"red_flag" text,
	"detect_cmd" text,
	"fix_pattern" text,
	"see_also" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repos" (
	"id" text PRIMARY KEY NOT NULL,
	"path" text NOT NULL,
	"default_filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trace_embeddings" (
	"trace_id" integer PRIMARY KEY NOT NULL,
	"model" text NOT NULL,
	"embedding_text" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "traces" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"repo_id" text,
	"tool_name" text NOT NULL,
	"request" jsonb NOT NULL,
	"results" jsonb,
	"explanation" jsonb,
	"sql_queries" jsonb,
	"duration_ms" integer
);
--> statement-breakpoint
ALTER TABLE "atom_embeddings" ADD CONSTRAINT "atom_embeddings_atom_id_atoms_id_fk" FOREIGN KEY ("atom_id") REFERENCES "public"."atoms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_embeddings" ADD CONSTRAINT "trace_embeddings_trace_id_traces_id_fk" FOREIGN KEY ("trace_id") REFERENCES "public"."traces"("id") ON DELETE cascade ON UPDATE no action;