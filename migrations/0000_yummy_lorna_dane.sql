CREATE TABLE "ai_queries" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"query" text NOT NULL,
	"response" text NOT NULL,
	"confidence" numeric(5, 2),
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "athletes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"sport" text NOT NULL,
	"nationality" text NOT NULL,
	"world_rank" integer,
	"profile_image" text,
	"readiness_index" numeric(5, 2),
	"win_rate" numeric(5, 2),
	"next_match_days" integer,
	"coach_name" text,
	"coach_title" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "career_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"date" text NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "kpi_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"metric_name" text NOT NULL,
	"value" numeric(5, 2) NOT NULL,
	"trend" numeric(5, 2),
	"last_updated" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "opponents" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"name" text NOT NULL,
	"nationality" text NOT NULL,
	"world_rank" integer,
	"profile_image" text,
	"playing_style" text,
	"threat_level" text,
	"recent_form" text[],
	"match_date" text,
	"win_probability" numeric(5, 2)
);
--> statement-breakpoint
CREATE TABLE "performance_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"month" text NOT NULL,
	"performance_score" numeric(5, 2),
	"ranking" integer
);
--> statement-breakpoint
CREATE TABLE "strengths" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"name" text NOT NULL,
	"description" text,
	"score" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"drill_name" text NOT NULL,
	"description" text,
	"expected_uplift" numeric(5, 2),
	"priority" integer
);
--> statement-breakpoint
CREATE TABLE "weaknesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"athlete_id" integer,
	"name" text NOT NULL,
	"description" text,
	"score" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_queries" ADD CONSTRAINT "ai_queries_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "career_events" ADD CONSTRAINT "career_events_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kpi_metrics" ADD CONSTRAINT "kpi_metrics_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opponents" ADD CONSTRAINT "opponents_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "performance_data" ADD CONSTRAINT "performance_data_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "strengths" ADD CONSTRAINT "strengths_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_recommendations" ADD CONSTRAINT "training_recommendations_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weaknesses" ADD CONSTRAINT "weaknesses_athlete_id_athletes_id_fk" FOREIGN KEY ("athlete_id") REFERENCES "public"."athletes"("id") ON DELETE no action ON UPDATE no action;