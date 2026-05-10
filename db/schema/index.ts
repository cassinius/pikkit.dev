import { sql } from "drizzle-orm";
import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";

export type AtomAppliesTo = {
  languages?: string[];
  frameworks?: string[];
  runtime?: string[];
};

export type TraceSqlQuery = {
  sql: string;
  params?: unknown[];
  duration_ms: number;
};

export type TraceExplanation = {
  summary?: string;
  intent?: Record<string, unknown>;
  filters_applied?: Record<string, unknown>;
  top_matches?: Array<{
    id: string;
    similarity?: number;
    reason?: string;
  }>;
  similarity_range?: {
    min?: number;
    max?: number;
  };
  fallbacks?: unknown[];
  warnings?: unknown[];
  [key: string]: unknown;
};

export const atomSeverity = pgEnum("atom_severity", [
  "critical",
  "high",
  "medium",
  "low",
]);

export const atoms = pgTable("atoms", {
  id: text("id").primaryKey(),
  version: integer("version").notNull().default(1),
  title: text("title").notNull(),
  category: text("category").notNull(),
  severity: atomSeverity("severity").notNull().default("medium"),
  triggers: text("triggers")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  appliesTo: jsonb("applies_to")
    .$type<AtomAppliesTo>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  checklist: text("checklist")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  redFlag: text("red_flag"),
  detectCmd: text("detect_cmd"),
  fixPattern: text("fix_pattern"),
  seeAlso: text("see_also")
    .array()
    .notNull()
    .default(sql`ARRAY[]::text[]`),
  embedding: vector("embedding", { dimensions: 768 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const traces = pgTable("traces", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp", { withTimezone: true })
    .notNull()
    .defaultNow(),
  repoId: text("repo_id"),
  toolName: text("tool_name").notNull(),
  request: jsonb("request").$type<unknown>().notNull(),
  results: jsonb("results").$type<unknown>(),
  explanation: jsonb("explanation").$type<TraceExplanation>(),
  sqlQueries: jsonb("sql_queries").$type<TraceSqlQuery[]>(),
  durationMs: integer("duration_ms"),
  embedding: vector("embedding", { dimensions: 768 }),
});

export const repos = pgTable("repos", {
  id: text("id").primaryKey(),
  path: text("path").notNull(),
  defaultFilters: jsonb("default_filters")
    .$type<Partial<AtomAppliesTo>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Atom = typeof atoms.$inferSelect;
export type NewAtom = typeof atoms.$inferInsert;
export type Trace = typeof traces.$inferSelect;
export type NewTrace = typeof traces.$inferInsert;
export type Repo = typeof repos.$inferSelect;
export type NewRepo = typeof repos.$inferInsert;
