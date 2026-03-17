-- Full Schema Migration
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "client_location_cache" (
  "id" SERIAL,
  "client_id" integer NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "pincode" VARCHAR(20),
  "source" VARCHAR(50) DEFAULT 'agent_gps',
  "confidence" smallint DEFAULT 100,
  "tagged_by" integer,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "billing_transactions" (
  "id" SERIAL,
  "company_id" uuid NOT NULL,
  "transaction_type" VARCHAR(50) NOT NULL,
  "amount" numeric NOT NULL,
  "currency" VARCHAR(3) DEFAULT 'INR',
  "payment_status" VARCHAR(20) DEFAULT 'completed',
  "metadata" jsonb,
  "created_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "license_transactions" (
  "id" SERIAL,
  "company_id" uuid,
  "lms_user_id" VARCHAR(255),
  "lms_license_id" VARCHAR(255),
  "transaction_type" VARCHAR(50) NOT NULL,
  "license_key" VARCHAR(255),
  "plan_name" VARCHAR(100),
  "billing_cycle" VARCHAR(50),
  "original_amount" numeric,
  "credit_applied" numeric DEFAULT 0,
  "subtotal" numeric,
  "gst_amount" numeric,
  "total_paid" numeric,
  "currency" VARCHAR(10) DEFAULT 'INR',
  "max_users" integer,
  "max_clients" integer,
  "storage_per_user" integer,
  "api_calls_per_user" integer,
  "start_date" TIMESTAMP,
  "end_date" TIMESTAMP,
  "validity_days" integer,
  "payment_id" VARCHAR(255),
  "order_id" VARCHAR(255),
  "razorpay_payment_id" VARCHAR(255),
  "old_plan_name" VARCHAR(100),
  "old_license_key" VARCHAR(255),
  "raw_payload" jsonb,
  "created_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "tally_sync_queue" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "tally_guid" VARCHAR(255) NOT NULL,
  "operation" VARCHAR(50) NOT NULL,
  "old_data" jsonb,
  "new_data" jsonb NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending',
  "priority" integer DEFAULT 5,
  "attempts" integer DEFAULT 0,
  "max_attempts" integer DEFAULT 3,
  "last_error" text,
  "user_id" uuid,
  "company_id" uuid NOT NULL,
  "created_at" TIMESTAMP DEFAULT now(),
  "processed_at" TIMESTAMP,
  "completed_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "email" text NOT NULL,
  "password" text NOT NULL,
  "reset_token" text,
  "reset_token_expiry" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "latitude" double precision,
  "longitude" double precision,
  "pincode" VARCHAR(20),
  "is_admin" boolean DEFAULT false,
  "role" VARCHAR(20) DEFAULT 'user',
  "company_id" uuid,
  "is_super_admin" boolean DEFAULT false,
  "auth_source" text DEFAULT 'local',
  "is_trial_user" boolean DEFAULT false,
  "total_received_amount" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "tally_sync_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "queue_id" uuid,
  "client_id" uuid NOT NULL,
  "tally_guid" VARCHAR(255) NOT NULL,
  "operation" VARCHAR(50) NOT NULL,
  "old_data" jsonb,
  "new_data" jsonb NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "error_message" text,
  "tally_response" text,
  "user_id" uuid,
  "company_id" uuid NOT NULL,
  "synced_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "clients" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text,
  "phone" text,
  "address" text,
  "latitude" double precision,
  "longitude" double precision,
  "status" text DEFAULT 'active',
  "notes" text,
  "created_by" uuid,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "source" VARCHAR(50) DEFAULT 'manual',
  "pincode" VARCHAR(10),
  "tally_guid" VARCHAR(255),
  "company_id" uuid NOT NULL,
  "last_visit_date" TIMESTAMP,
  "last_visit_type" VARCHAR(50),
  "last_visit_notes" text,
  "tally_sync_status" VARCHAR(20) DEFAULT 'synced',
  "tally_sync_pending_fields" jsonb DEFAULT '{}',
  "last_tally_sync_at" TIMESTAMP,
  "tally_sync_error" text
);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "email" text,
  "full_name" text,
  "department" text,
  "work_hours_start" text,
  "work_hours_end" text,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "location_logs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "accuracy" double precision,
  "activity" text,
  "notes" text,
  "timestamp" TIMESTAMPTZ DEFAULT now(),
  "pincode" VARCHAR(10),
  "battery" integer,
  "company_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "token" text NOT NULL,
  "created_at" TIMESTAMP DEFAULT now(),
  "expires_at" TIMESTAMP,
  "company_id" uuid
);

CREATE TABLE IF NOT EXISTS "tally_sync_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sync_started_at" TIMESTAMP NOT NULL,
  "sync_completed_at" TIMESTAMP,
  "total_records" integer DEFAULT 0,
  "new_records" integer DEFAULT 0,
  "updated_records" integer DEFAULT 0,
  "failed_records" integer DEFAULT 0,
  "errors" text,
  "status" VARCHAR(20) NOT NULL DEFAULT 'running',
  "triggered_by" VARCHAR(50) NOT NULL,
  "created_at" TIMESTAMP DEFAULT now(),
  "duplicates_removed" integer DEFAULT 0,
  "company_id" uuid,
  "sync_direction" VARCHAR(20) DEFAULT 'tally_to_backend',
  "items_pushed_to_tally" integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "pincodes" (
  "id" SERIAL PRIMARY KEY,
  "postal_code" VARCHAR(20) UNIQUE NOT NULL,
  "latitude" double precision NOT NULL,
  "longitude" double precision NOT NULL,
  "city" VARCHAR(100),
  "state" VARCHAR(100),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

-- Spatial index for nearest-pincode lookups
CREATE INDEX IF NOT EXISTS "idx_pincodes_spatial"
  ON "pincodes" USING gist (ll_to_earth("latitude", "longitude"));

-- Standard index for direct portalcode lookups
CREATE INDEX IF NOT EXISTS "idx_pincodes_postal_code"
  ON "pincodes" ("postal_code");

CREATE TABLE IF NOT EXISTS "tally_sync_conflicts" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "tally_guid" VARCHAR(255) NOT NULL,
  "field_name" VARCHAR(100) NOT NULL,
  "backend_value" text NOT NULL,
  "tally_value" text NOT NULL,
  "backend_updated_at" TIMESTAMP,
  "tally_updated_at" TIMESTAMP,
  "resolution_status" VARCHAR(20) DEFAULT 'pending',
  "resolved_by" uuid,
  "resolved_at" TIMESTAMP,
  "resolution_notes" text,
  "company_id" uuid NOT NULL,
  "detected_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "trip_expenses" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "start_location" VARCHAR(255) NOT NULL,
  "end_location" VARCHAR(255),
  "travel_date" bigint NOT NULL,
  "distance_km" numeric NOT NULL,
  "transport_mode" VARCHAR(50) NOT NULL,
  "amount_spent" numeric NOT NULL,
  "currency" VARCHAR(10) DEFAULT '₹',
  "notes" text,
  "client_id" uuid,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now(),
  "receipt_images" TEXT[],
  "trip_name" VARCHAR(255),
  "is_multi_leg" boolean NOT NULL DEFAULT false,
  "company_id" uuid NOT NULL,
  "payment_status" VARCHAR(50) DEFAULT 'PENDING',
  "payment_initiated_at" TIMESTAMP,
  "payment_completed_at" TIMESTAMP,
  "paid_amount" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "quota_drift_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "company_id" uuid,
  "drift_type" VARCHAR(50),
  "expected_value" integer,
  "actual_value" integer,
  "corrected_at" TIMESTAMP DEFAULT now(),
  "notes" text
);

CREATE TABLE IF NOT EXISTS "password_reset_otps" (
  "id" SERIAL,
  "email" VARCHAR(255) NOT NULL,
  "otp" text NOT NULL,
  "attempts" integer DEFAULT 0,
  "created_at" TIMESTAMP DEFAULT now(),
  "expires_at" TIMESTAMP NOT NULL,
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "geocoding_failures" (
  "id" SERIAL,
  "client_id" uuid,
  "address" text,
  "pincode" VARCHAR(10),
  "error" text,
  "attempt_count" integer DEFAULT 1,
  "attempted_at" TIMESTAMP DEFAULT now(),
  "created_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "trial_devices" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "device_id" VARCHAR(255) NOT NULL,
  "user_id" uuid,
  "trial_start" TIMESTAMP NOT NULL DEFAULT now(),
  "accounts_created" integer DEFAULT 1,
  "last_login" TIMESTAMP DEFAULT now(),
  "is_blocked" boolean DEFAULT false,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "trip_legs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "expense_id" uuid NOT NULL,
  "leg_number" integer NOT NULL,
  "start_location" VARCHAR(255) NOT NULL,
  "end_location" VARCHAR(255) NOT NULL,
  "distance_km" numeric NOT NULL,
  "transport_mode" VARCHAR(50) NOT NULL,
  "amount_spent" numeric NOT NULL,
  "notes" text,
  "created_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "companies" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "subdomain" VARCHAR(100) NOT NULL,
  "email_domain" VARCHAR(255),
  "settings" jsonb DEFAULT '{}',
  "is_active" boolean DEFAULT true,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now(),
  "tally_company_name" VARCHAR(255),
  "tally_username" VARCHAR(255),
  "tally_password_encrypted" text,
  "tally_auto_sync_enabled" boolean DEFAULT false,
  "tally_sync_interval_minutes" integer DEFAULT 30,
  "total_paid_amount" numeric DEFAULT 0,
  "total_pending_amount" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "plan_features" (
  "id" SERIAL,
  "plan_name" VARCHAR(50) NOT NULL,
  "display_name" VARCHAR(100) NOT NULL,
  "price_inr" integer NOT NULL,
  "max_users" integer NOT NULL,
  "max_concurrent_sessions" integer NOT NULL,
  "max_clients" integer,
  "client_import_batch_size" integer NOT NULL,
  "gps_tracking_enabled" boolean DEFAULT true,
  "gps_tracking_interval_minutes" integer,
  "location_history_days" integer NOT NULL,
  "meeting_history_days" integer NOT NULL,
  "max_meeting_attachments_per_meeting" integer NOT NULL,
  "meeting_attachment_max_size_mb" integer NOT NULL,
  "services_enabled" boolean DEFAULT false,
  "services_history_enabled" boolean DEFAULT false,
  "max_services_per_client" integer,
  "expenses_enabled" boolean DEFAULT true,
  "expense_history_days" integer NOT NULL,
  "max_receipt_images_per_expense" integer NOT NULL,
  "receipt_image_max_size_mb" integer NOT NULL,
  "max_cloud_storage_gb" integer NOT NULL,
  "client_management_type" VARCHAR(50) DEFAULT 'basic',
  "pincode_filtering_enabled" boolean DEFAULT false,
  "smart_pincode_filtering_enabled" boolean DEFAULT false,
  "advanced_search_enabled" boolean DEFAULT false,
  "bulk_operations_enabled" boolean DEFAULT false,
  "tally_sync_enabled" boolean DEFAULT false,
  "tally_sync_frequency_minutes" integer,
  "api_access_enabled" boolean DEFAULT false,
  "api_rate_limit_per_hour" integer,
  "webhook_enabled" boolean DEFAULT false,
  "basic_reports_enabled" boolean DEFAULT false,
  "advanced_analytics_enabled" boolean DEFAULT false,
  "custom_reports_enabled" boolean DEFAULT false,
  "data_export_enabled" boolean DEFAULT false,
  "data_export_formats" TEXT[],
  "team_management_enabled" boolean DEFAULT false,
  "role_based_permissions" boolean DEFAULT false,
  "interactive_maps_enabled" boolean DEFAULT false,
  "route_optimization_enabled" boolean DEFAULT false,
  "support_level" VARCHAR(50) DEFAULT 'community',
  "custom_branding_enabled" boolean DEFAULT false,
  "white_label_enabled" boolean DEFAULT false,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "company_licenses" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "company_id" uuid,
  "license_key" text NOT NULL,
  "plan" text NOT NULL,
  "max_users" integer,
  "expires_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "lms_user_id" VARCHAR(255),
  "lms_license_id" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "company_usage_stats" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL,
  "current_users" integer DEFAULT 0,
  "current_clients" integer DEFAULT 0,
  "current_active_services" integer DEFAULT 0,
  "storage_used_mb" numeric DEFAULT 0,
  "api_calls_this_month" integer DEFAULT 0,
  "tally_syncs_this_month" integer DEFAULT 0,
  "data_exports_this_month" integer DEFAULT 0,
  "last_calculated_at" TIMESTAMP DEFAULT now(),
  "created_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "feature_usage_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "company_id" uuid NOT NULL,
  "user_id" uuid,
  "feature_name" VARCHAR(100) NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "metadata" jsonb,
  "created_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "quick_visits" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "visit_type" VARCHAR(50) NOT NULL,
  "latitude" double precision,
  "longitude" double precision,
  "accuracy" double precision,
  "notes" text,
  "company_id" uuid NOT NULL,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "bank_accounts" (
  "user_id" uuid NOT NULL,
  "account_number" VARCHAR(50),
  "ifsc_code" VARCHAR(20),
  "account_holder_name" VARCHAR(200),
  "bank_name" VARCHAR(200),
  "upi_id" VARCHAR(100),
  "is_verified" boolean DEFAULT false,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "client_services" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "client_id" uuid NOT NULL,
  "service_name" VARCHAR(255) NOT NULL,
  "description" text,
  "status" VARCHAR(50) DEFAULT 'active',
  "start_date" TIMESTAMP DEFAULT now(),
  "expiry_date" TIMESTAMP,
  "price" numeric,
  "notes" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now(),
  "company_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "client_service_history" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "service_id" uuid NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "changed_by" uuid,
  "changes" jsonb,
  "created_at" TIMESTAMP DEFAULT now(),
  "company_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS "user_sessions" (
  "id" SERIAL,
  "user_id" uuid,
  "token" text NOT NULL,
  "created_at" TIMESTAMP DEFAULT now(),
  "expires_at" TIMESTAMP,
  "company_id" uuid
);

CREATE TABLE IF NOT EXISTS "tally_client_mapping" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "tally_ledger_id" VARCHAR(255) NOT NULL,
  "client_id" uuid,
  "last_synced_at" TIMESTAMP DEFAULT now(),
  "sync_status" VARCHAR(20) DEFAULT 'synced',
  "created_at" TIMESTAMP DEFAULT now(),
  "updated_at" TIMESTAMP DEFAULT now(),
  "company_id" uuid
);

CREATE TABLE IF NOT EXISTS "payments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "expense_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "company_id" uuid NOT NULL,
  "amount" numeric NOT NULL,
  "currency" VARCHAR(10) DEFAULT 'INR',
  "payment_mode" VARCHAR(50),
  "razorpay_payout_id" VARCHAR(200),
  "razorpay_fund_account_id" VARCHAR(200),
  "transaction_id" VARCHAR(200),
  "status" VARCHAR(50) DEFAULT 'PENDING',
  "notes" text,
  "failure_reason" text,
  "initiated_by" uuid,
  "created_at" TIMESTAMP DEFAULT now(),
  "completed_at" TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "payment_activities" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "payment_id" uuid,
  "expense_id" uuid,
  "user_id" uuid,
  "company_id" uuid,
  "activity_type" VARCHAR(50) NOT NULL,
  "amount" numeric NOT NULL,
  "performed_by" uuid,
  "details" jsonb,
  "created_at" TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "meetings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "client_id" uuid NOT NULL,
  "start_time" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "start_latitude" numeric,
  "start_longitude" numeric,
  "start_accuracy" numeric,
  "end_time" TIMESTAMPTZ,
  "end_latitude" numeric,
  "end_longitude" numeric,
  "end_accuracy" numeric,
  "status" VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  "comments" text,
  "attachments" jsonb DEFAULT '[]',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "company_id" uuid NOT NULL,
  "proximity_verified" boolean DEFAULT false,
  "proximity_distance" double precision,
  "proximity_reason" VARCHAR(50)
);

