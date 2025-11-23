-- ============================================================================
-- Add Indexes for Unindexed Foreign Keys
-- ============================================================================
-- This migration adds indexes on foreign key columns to improve query
-- performance. Foreign keys are frequently used in JOINs and WHERE clauses,
-- and having indexes on them significantly improves query performance.
-- ============================================================================

-- BOOKINGS TABLE
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON public.bookings(service_id);

-- CART_ITEMS TABLE
CREATE INDEX IF NOT EXISTS idx_cart_items_service_id ON public.cart_items(service_id);

-- CONTACT_SUPPORT_INFO TABLE
CREATE INDEX IF NOT EXISTS idx_contact_support_info_updated_by ON public.contact_support_info(updated_by);

-- CONTRACT_AMENDMENTS TABLE
CREATE INDEX IF NOT EXISTS idx_contract_amendments_approved_by ON public.contract_amendments(approved_by);
CREATE INDEX IF NOT EXISTS idx_contract_amendments_contract_instance_id ON public.contract_amendments(contract_instance_id);

-- COUPON_USAGE_LOG TABLE
CREATE INDEX IF NOT EXISTS idx_coupon_usage_log_coupon_id ON public.coupon_usage_log(coupon_id);

-- FAQ_ITEMS TABLE
CREATE INDEX IF NOT EXISTS idx_faq_items_updated_by ON public.faq_items(updated_by);

-- HELP_SECTIONS TABLE
CREATE INDEX IF NOT EXISTS idx_help_sections_updated_by ON public.help_sections(updated_by);

-- LEGAL_NOTICES TABLE
CREATE INDEX IF NOT EXISTS idx_legal_notices_updated_by ON public.legal_notices(updated_by);

-- MODERATION_QUEUE TABLE
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reported_by ON public.moderation_queue(reported_by);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_reviewed_by ON public.moderation_queue(reviewed_by);

-- PLATFORM_SETTINGS TABLE
CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by ON public.platform_settings(updated_by);

-- PROFILES TABLE
CREATE INDEX IF NOT EXISTS idx_profiles_created_by_admin_id ON public.profiles(created_by_admin_id);

-- SERVICE_CATEGORIES TABLE
CREATE INDEX IF NOT EXISTS idx_service_categories_created_by_admin_id ON public.service_categories(created_by_admin_id);

-- SERVICE_PARTNERS TABLE
CREATE INDEX IF NOT EXISTS idx_service_partners_created_by_admin_id ON public.service_partners(created_by_admin_id);

-- SERVICE_TYPES TABLE
CREATE INDEX IF NOT EXISTS idx_service_types_created_by_admin_id ON public.service_types(created_by_admin_id);

-- SERVICES TABLE
CREATE INDEX IF NOT EXISTS idx_services_category_id ON public.services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_invited_influencer_id ON public.services(invited_influencer_id);
CREATE INDEX IF NOT EXISTS idx_services_platform_id ON public.services(platform_id);

-- SOCIAL_MEDIA_PLATFORMS TABLE
CREATE INDEX IF NOT EXISTS idx_social_media_platforms_created_by_admin_id ON public.social_media_platforms(created_by_admin_id);

-- SOCIAL_STATS TABLE
CREATE INDEX IF NOT EXISTS idx_social_stats_last_updated_by ON public.social_stats(last_updated_by);

-- SUPPORT_TICKET_RESPONSES TABLE
CREATE INDEX IF NOT EXISTS idx_support_ticket_responses_responder_id ON public.support_ticket_responses(responder_id);

-- SUPPORT_TICKETS TABLE
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);





