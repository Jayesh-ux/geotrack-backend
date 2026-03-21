-- Migration: Add is_active column to users for admin control
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing users to be active by default (if they weren't already)
UPDATE users SET is_active = true WHERE is_active IS NULL;
