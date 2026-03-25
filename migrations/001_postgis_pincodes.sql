-- ============================================================
-- MIGRATION 001: PostGIS-First Foundation
-- Run this ONCE against your production and local databases.
-- Date: 2026-03-09
-- Author: GeoTrack Engineering
-- ============================================================

-- STEP 1: Enable spatial math extensions (no PostGIS license needed!)
-- These are built-in to standard PostgreSQL.
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STEP 4.5: Add proximity columns to meetings table (if not in main schema)
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS proximity_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS proximity_distance DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS proximity_reason VARCHAR(50);

-- STEP 5: Verification queries - run these to confirm setup
-- SELECT * FROM pg_extension WHERE extname IN ('cube', 'earthdistance');
-- SELECT COUNT(*) FROM pincodes;

-- ============================================================
-- USAGE NOTES:
-- After running this migration, seed the pincodes table with:
--   node utils/seedPincodes.js
-- Or import the CSV from Open Government Data sources.
-- ============================================================
