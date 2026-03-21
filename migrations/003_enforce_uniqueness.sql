
-- Migration 003: Enforce Uniqueness and Consolidate Test Data
-- Date: 2026-03-20

-- 1. Identify companies using 'test' subdomain
-- Company with all data: 04d533c4-3cc1-4d1a-a83b-1edd199b9e29 ('Lodha Supremus Enterprises')
-- Empty company: 44b95f9b-6086-4dca-9d88-21b861c243c0 ('Test Production Co')

-- 2. Consolidate: Move any leftover data (if any existed, but we checked and it's 0)
-- Just in case some logs were created while we were planning:
UPDATE location_logs SET company_id = '04d533c4-3cc1-4d1a-a83b-1edd199b9e29' WHERE company_id = '44b95f9b-6086-4dca-9d88-21b861c243c0';
UPDATE clients SET company_id = '04d533c4-3cc1-4d1a-a83b-1edd199b9e29' WHERE company_id = '44b95f9b-6086-4dca-9d88-21b861c243c0';
UPDATE users SET company_id = '04d533c4-3cc1-4d1a-a83b-1edd199b9e29' WHERE company_id = '44b95f9b-6086-4dca-9d88-21b861c243c0' AND email NOT IN (SELECT email FROM users WHERE company_id = '04d533c4-3cc1-4d1a-a83b-1edd199b9e29');

-- 3. Delete the empty company and its users
-- Cascade will handle profiles/sessions
DELETE FROM users WHERE company_id = '44b95f9b-6086-4dca-9d88-21b861c243c0';
DELETE FROM companies WHERE id = '44b95f9b-6086-4dca-9d88-21b861c243c0';

-- 4. Clean up any other duplicates if they exist (general cleanup)
-- Keep only the oldest user for each email (if duplicates exist outside of test)
DELETE FROM users u1 USING users u2
WHERE u1.id > u2.id AND u1.email = u2.email;

-- 5. Add UNIQUE constraints to prevent this from happening again
ALTER TABLE companies ADD CONSTRAINT unique_subdomain UNIQUE (subdomain);
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);

-- 6. Ensure 'Lodha Supremus Enterprises' has 'test' subdomain (it already does, but just in case)
UPDATE companies SET subdomain = 'test' WHERE id = '04d533c4-3cc1-4d1a-a83b-1edd199b9e29';
