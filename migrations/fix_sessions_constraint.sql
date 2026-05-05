-- Fix double CLOCK_IN issue: Enforce single active session per user
-- Run this migration on PostgreSQL

-- 1. First, clean up any existing duplicate active sessions
-- Keep the earliest active session per user, close the rest
WITH ranked_sessions AS (
  SELECT id, user_id, 
         ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at ASC) as rn
  FROM user_tracking_sessions 
  WHERE session_state = 'ACTIVE' AND ended_at IS NULL
)
UPDATE user_tracking_sessions 
SET session_state = 'ENDED', 
    ended_at = started_at,
    clock_out_location = clock_in_location
WHERE id IN (SELECT id FROM ranked_sessions WHERE rn > 1);

-- 2. Add partial unique index to prevent multiple active sessions per user
-- Note: PostgreSQL supports partial indexes with WHERE clause
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_session 
ON user_tracking_sessions (user_id, company_id) 
WHERE session_state = 'ACTIVE';

-- 3. Also add a regular index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_active 
ON user_tracking_sessions (user_id, session_state, started_at DESC);

-- 4. Add comment explaining the constraint
COMMENT ON INDEX idx_unique_active_session IS 
  'Prevents multiple active sessions per user. Only one ACTIVE session allowed per (user_id, company_id).';
