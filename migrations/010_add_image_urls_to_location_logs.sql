-- Migration: Add image_urls column to location_logs table
-- Date: 2026-05-06
-- Description: Adds support for storing image URLs in location logs for expense and meeting activities

ALTER TABLE location_logs ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN location_logs.image_urls IS 'Array of image URLs attached to this location log (for expense receipts, meeting photos, etc.)';
