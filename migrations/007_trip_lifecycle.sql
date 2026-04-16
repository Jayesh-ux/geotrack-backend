-- Trip Lifecycle + Active Trip Support Migration
-- Status: DRAFT, IN_PROGRESS, COMPLETED

ALTER TABLE "trip_expenses" 
ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS "current_leg_index" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "start_time" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "end_time" TIMESTAMP;

ALTER TABLE "trip_legs" 
ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "started_at" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP;

-- Add receipt linking to trip_expenses
ALTER TABLE "trip_expenses" 
ADD COLUMN IF NOT EXISTS "receipt_linked" BOOLEAN DEFAULT false;

-- Index for active trip queries
CREATE INDEX IF NOT EXISTS "idx_trip_expenses_status" 
ON "trip_expenses" ("status") WHERE "status" = 'IN_PROGRESS';

CREATE INDEX IF NOT EXISTS "idx_trip_expenses_user_active" 
ON "trip_expenses" ("user_id", "status") 
WHERE "status" IN ('DRAFT', 'IN_PROGRESS');

-- Index for location logs performance
CREATE INDEX IF NOT EXISTS "idx_location_logs_user_time" 
ON "location_logs" ("user_id", "timestamp");

-- Index for location logs company queries
CREATE INDEX IF NOT EXISTS "idx_location_logs_company" 
ON "location_logs" ("company_id", "timestamp");

-- Receipt Images Table (linked to expense/leg)
CREATE TABLE IF NOT EXISTS "trip_receipts" (
    "id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "expense_id" uuid NOT NULL,
    "leg_id" uuid,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "file_type" VARCHAR(50),
    "file_size" INTEGER,
    "uploaded_by" uuid NOT NULL,
    "company_id" uuid NOT NULL,
    "created_at" TIMESTAMP DEFAULT now()
);

-- Index for receipt queries
CREATE INDEX IF NOT EXISTS "idx_trip_receipts_expense" 
ON "trip_receipts" ("expense_id");

CREATE INDEX IF NOT EXISTS "idx_trip_receipts_leg" 
ON "trip_receipts" ("leg_id") WHERE "leg_id" IS NOT NULL;

-- Index for trips by agent (performance)
CREATE INDEX IF NOT EXISTS "idx_trip_expenses_agent_travel_date" 
ON "trip_expenses" ("user_id", "travel_date");

-- Index for pending trips
CREATE INDEX IF NOT EXISTS "idx_trip_expenses_pending" 
ON "trip_expenses" ("status", "updated_at") 
WHERE "status" IN ('DRAFT', 'IN_PROGRESS');