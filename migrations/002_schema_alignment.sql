-- Migration 002: Schema Alignment with Integration Report
-- Date: 2026-03-18
-- Author: GeoTrack Engineering

-- 1. Update users table with tracking and status fields
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS battery_percentage INTEGER,
ADD COLUMN IF NOT EXISTS current_activity VARCHAR(50);

-- 2. Add postal_code alias to pincodes table for compatibility
-- We use a generated column for automatic syncing
ALTER TABLE pincodes 
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20) GENERATED ALWAYS AS (pincode) STORED;

-- 3. Align bank accounts table (Rename and Add company_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename  = 'bank_accounts') THEN
        ALTER TABLE bank_accounts RENAME TO user_bank_accounts;
    END IF;
END $$;

-- Ensure user_bank_accounts has company_id (standardizing to UUID as per project pattern)
ALTER TABLE user_bank_accounts 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- 4. Create slot_orders table
CREATE TABLE IF NOT EXISTS slot_orders (
    id SERIAL PRIMARY KEY,
    company_id UUID NOT NULL,
    user_slots INTEGER DEFAULT 0,
    client_slots INTEGER DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    payer_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Ensure is_paid exists in trip_expenses (redundancy check)
ALTER TABLE trip_expenses 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
