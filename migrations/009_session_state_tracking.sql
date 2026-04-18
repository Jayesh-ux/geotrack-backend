-- Session state management for tracking
-- Tracks user's work session with states: NOT_STARTED, ACTIVE, PAUSED, ENDED

CREATE TABLE IF NOT EXISTS "user_tracking_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "session_state" VARCHAR(20) NOT NULL DEFAULT 'NOT_STARTED',
  "started_at" TIMESTAMPTZ,
  "ended_at" TIMESTAMPTZ,
  "paused_at" TIMESTAMPTZ,
  "resumed_at" TIMESTAMPTZ,
  "total_duration_minutes" integer,
  "clock_in_location" JSONB,
  "clock_out_location" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_tracking_sessions_user_state"
  ON "user_tracking_sessions" ("user_id", "session_state");

CREATE INDEX IF NOT EXISTS "idx_tracking_sessions_dates"
  ON "user_tracking_sessions" ("started_at", "ended_at");

-- Add session state columns to users table
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "current_session_id" uuid,
  ADD COLUMN IF NOT EXISTS "session_state" VARCHAR(20) DEFAULT 'NOT_STARTED';

-- Add tracking metadata to location_logs
ALTER TABLE "location_logs"
  ADD COLUMN IF NOT EXISTS "distance_delta" double precision,
  ADD COLUMN IF NOT EXISTS "speed_kmh" double precision,
  ADD COLUMN IF NOT EXISTS "validated" boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS "validation_reason" VARCHAR(50);

-- Add journey tracking columns
ALTER TABLE "location_logs"
  ADD COLUMN IF NOT EXISTS "journey_id" uuid,
  ADD COLUMN IF NOT EXISTS "transport_mode" VARCHAR(50);

-- Add travel_log table for validated journeys
CREATE TABLE IF NOT EXISTS "travel_logs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "journey_id" uuid,
  "session_id" uuid,
  "start_location" JSONB NOT NULL,
  "end_location" JSONB,
  "distance_km" numeric NOT NULL,
  "transport_mode" VARCHAR(50),
  "started_at" TIMESTAMPTZ NOT NULL,
  "ended_at" TIMESTAMPTZ,
  "validated" boolean DEFAULT false,
  "validation_reason" VARCHAR(50),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_travel_logs_user_dates"
  ON "travel_logs" ("user_id", "started_at", "ended_at");

-- Add train stations reference table
CREATE TABLE IF NOT EXISTS "train_stations" (
  "id" SERIAL PRIMARY KEY,
  "station_code" VARCHAR(20),
  "station_name" VARCHAR(255) NOT NULL,
  "city" VARCHAR(100),
  "state" VARCHAR(100),
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_train_stations_spatial"
  ON "train_stations" USING gist (ll_to_earth("latitude", "longitude"));