
-- Migration 004: Enforce Uniqueness on Plans and Seed Defaults
-- Date: 2026-03-20

-- 1. Add UNIQUE constraint to plan_name
ALTER TABLE plan_features ADD CONSTRAINT unique_plan_name UNIQUE (plan_name);

-- 2. Seed Starter Plan
INSERT INTO plan_features (
    plan_name, display_name, price_inr, max_users, max_concurrent_sessions, 
    max_clients, client_import_batch_size, gps_tracking_enabled, 
    gps_tracking_interval_minutes, location_history_days, meeting_history_days, 
    max_meeting_attachments_per_meeting, meeting_attachment_max_size_mb, 
    services_enabled, services_history_enabled, max_services_per_client, 
    expenses_enabled, expense_history_days, max_receipt_images_per_expense, 
    receipt_image_max_size_mb, max_cloud_storage_gb, client_management_type, 
    pincode_filtering_enabled, smart_pincode_filtering_enabled, 
    advanced_search_enabled, bulk_operations_enabled, tally_sync_enabled, 
    tally_sync_frequency_minutes, api_access_enabled, api_rate_limit_per_hour, 
    webhook_enabled, basic_reports_enabled, advanced_analytics_enabled, 
    custom_reports_enabled, data_export_enabled, team_management_enabled, 
    role_based_permissions, interactive_maps_enabled, route_optimization_enabled, 
    support_level, custom_branding_enabled, white_label_enabled
) VALUES (
    'starter', 'Starter Plan', 0, 10, 1, 
    100, 50, true, 
    5, 30, 30, 
    5, 5, 
    true, true, 20, 
    true, 30, 3, 
    5, 1, 'basic', 
    false, false, 
    true, true, false, 
    NULL, true, 100, 
    false, true, true, 
    false, true, true, 
    true, true, false, 
    'community', false, false
) ON CONFLICT (plan_name) DO NOTHING;

-- 3. Seed Business Plan
INSERT INTO plan_features (
    plan_name, display_name, price_inr, max_users, max_concurrent_sessions, 
    max_clients, client_import_batch_size, gps_tracking_enabled, 
    gps_tracking_interval_minutes, location_history_days, meeting_history_days, 
    max_meeting_attachments_per_meeting, meeting_attachment_max_size_mb, 
    services_enabled, services_history_enabled, max_services_per_client, 
    expenses_enabled, expense_history_days, max_receipt_images_per_expense, 
    receipt_image_max_size_mb, max_cloud_storage_gb, client_management_type, 
    pincode_filtering_enabled, smart_pincode_filtering_enabled, 
    advanced_search_enabled, bulk_operations_enabled, tally_sync_enabled, 
    tally_sync_frequency_minutes, api_access_enabled, api_rate_limit_per_hour, 
    webhook_enabled, basic_reports_enabled, advanced_analytics_enabled, 
    custom_reports_enabled, data_export_enabled, team_management_enabled, 
    role_based_permissions, interactive_maps_enabled, route_optimization_enabled, 
    support_level, custom_branding_enabled, white_label_enabled
) VALUES (
    'business', 'Business Plan', 499, 50, 5, 
    1000, 200, true, 
    2, 90, 90, 
    10, 10, 
    true, true, 50, 
    true, 90, 5, 
    10, 10, 'advanced', 
    true, true, 
    true, true, true, 
    30, true, 500, 
    true, true, true, 
    true, true, true, 
    true, true, true, 
    'priority', true, false
) ON CONFLICT (plan_name) DO NOTHING;
