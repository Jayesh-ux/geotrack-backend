-- migrations/008_add_location_accuracy.sql
-- Add location_accuracy column to clients table
-- Values: 'exact' (default), 'geocoded', 'approximate'

ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS location_accuracy 
VARCHAR(20) DEFAULT 'exact';

-- Update existing records where coordinates exist to 'exact'
UPDATE clients 
SET location_accuracy = 'exact'
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND location_accuracy IS NULL;