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

-- STEP 2: Create the pincodes lookup table
-- This is the core of our self-learning location database.
CREATE TABLE IF NOT EXISTS pincodes (
    id          SERIAL PRIMARY KEY,
    postal_code VARCHAR(20) UNIQUE NOT NULL,
    latitude    DOUBLE PRECISION   NOT NULL,
    longitude   DOUBLE PRECISION   NOT NULL,
    city        VARCHAR(100),
    state       VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 3: Create spatial index for ultra-fast nearest-pincode lookups (<5ms)
CREATE INDEX IF NOT EXISTS idx_pincodes_spatial
    ON pincodes USING gist (ll_to_earth(latitude, longitude));

-- Standard B-tree index for direct postalcode lookups
CREATE INDEX IF NOT EXISTS idx_pincodes_postalcode
    ON pincodes (postal_code);

-- STEP 4: Create client_location_cache for self-learned client positions
-- When an agent visits a client and GPS-tags them, we store it here.
-- Future lookups for the same client skip the Google API entirely.
CREATE TABLE IF NOT EXISTS client_location_cache (
    id          SERIAL PRIMARY KEY,
    client_id   INTEGER UNIQUE NOT NULL,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    pincode     VARCHAR(20),
    source      VARCHAR(50) DEFAULT 'agent_gps', -- 'agent_gps' | 'google_api' | 'manual'
    confidence  SMALLINT DEFAULT 100,            -- 0-100 confidence score
    tagged_by   INTEGER,                         -- user_id who tagged it
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_location_cache_client_id
    ON client_location_cache (client_id);

-- STEP 4.5: Add proximity columns to meetings table
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
