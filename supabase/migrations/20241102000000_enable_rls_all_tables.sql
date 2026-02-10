-- ============================================================================
-- RLS (Row Level Security) Policies for All Tables
-- ============================================================================
-- This migration enables RLS on all tables and creates comprehensive policies
-- based on user roles: admin, influencer, customer
-- ============================================================================

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role::text FROM public.profiles WHERE id = (select auth.uid());
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is influencer
CREATE OR REPLACE FUNCTION public.is_influencer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) AND role = 'influencer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function to check if user is customer
CREATE OR REPLACE FUNCTION public.is_customer()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = (select auth.uid()) AND role = 'customer'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- DROP ALL EXISTING POLICIES (to allow re-running migration)
-- ============================================================================
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
      r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = (select auth.uid()));

-- Users can view public profiles (for browsing influencers/customers)
CREATE POLICY "Users can view public profiles"
  ON public.profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- Admins can do everything
CREATE POLICY "Admins have full access to profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- ADMIN_ACTIONS TABLE
-- ============================================================================
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage admin actions"
  ON public.admin_actions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- BOOKING_STATUSES TABLE (Reference table - public read)
-- ============================================================================
ALTER TABLE public.booking_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view booking statuses"
  ON public.booking_statuses FOR SELECT
  USING (true);

CREATE POLICY "Only admins can manage booking statuses"
  ON public.booking_statuses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Customers can view their own bookings
CREATE POLICY "Customers can view own bookings"
  ON public.bookings FOR SELECT
  USING (customer_id = (select auth.uid()));

-- Influencers can view their own bookings
CREATE POLICY "Influencers can view own bookings"
  ON public.bookings FOR SELECT
  USING (influencer_id = (select auth.uid()));

-- Customers can create bookings
CREATE POLICY "Customers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (customer_id = (select auth.uid()) AND public.is_customer());

-- Customers can update their own bookings
CREATE POLICY "Customers can update own bookings"
  ON public.bookings FOR UPDATE
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

-- Influencers can update their own bookings
CREATE POLICY "Influencers can update own bookings"
  ON public.bookings FOR UPDATE
  USING (influencer_id = (select auth.uid()))
  WITH CHECK (influencer_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to bookings"
  ON public.bookings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- BOOKING_ANALYTICS TABLE
-- ============================================================================
ALTER TABLE public.booking_analytics ENABLE ROW LEVEL SECURITY;

-- Consolidated SELECT policy: Admins OR users who own the booking
CREATE POLICY "Users and admins can view analytics"
  ON public.booking_analytics FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_analytics.booking_id
      AND (b.customer_id = (select auth.uid()) OR b.influencer_id = (select auth.uid()))
    )
  );

-- Consolidated INSERT policy: Admins only (service role bypasses RLS)
CREATE POLICY "Admins and system can insert analytics"
  ON public.booking_analytics FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins have full access for UPDATE/DELETE
CREATE POLICY "Admins can update analytics"
  ON public.booking_analytics FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete analytics"
  ON public.booking_analytics FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CARTS TABLE
-- ============================================================================
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

-- Customers can view their own carts
CREATE POLICY "Customers can view own carts"
  ON public.carts FOR SELECT
  USING (customer_id = (select auth.uid()));

-- Customers can create their own carts
CREATE POLICY "Customers can create own carts"
  ON public.carts FOR INSERT
  WITH CHECK (customer_id = (select auth.uid()) AND public.is_customer());

-- Customers can update their own carts
CREATE POLICY "Customers can update own carts"
  ON public.carts FOR UPDATE
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

-- Customers can delete their own carts
CREATE POLICY "Customers can delete own carts"
  ON public.carts FOR DELETE
  USING (customer_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to carts"
  ON public.carts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CART_ITEMS TABLE
-- ============================================================================
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Customers can view items in their carts
CREATE POLICY "Customers can view own cart items"
  ON public.cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  );

-- Customers can add items to their carts
CREATE POLICY "Customers can add items to own carts"
  ON public.cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  );

-- Customers can update items in their carts
CREATE POLICY "Customers can update own cart items"
  ON public.cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  );

-- Customers can delete items from their carts
CREATE POLICY "Customers can delete own cart items"
  ON public.cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to cart items"
  ON public.cart_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CHAT_ROOMS TABLE
-- ============================================================================
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

-- Users can view chat rooms they're part of
CREATE POLICY "Users can view own chat rooms"
  ON public.chat_rooms FOR SELECT
  USING (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

-- Users can create chat rooms (system creates for bookings)
CREATE POLICY "Users can create chat rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

-- Users can update their chat rooms
CREATE POLICY "Users can update own chat rooms"
  ON public.chat_rooms FOR UPDATE
  USING (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to chat rooms"
  ON public.chat_rooms FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- ============================================================================
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their chat rooms
CREATE POLICY "Users can view messages in own chat rooms"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.chat_room_id
      AND (cr.customer_id = (select auth.uid()) OR cr.influencer_id = (select auth.uid()))
    )
  );

-- Users can send messages in their chat rooms
CREATE POLICY "Users can send messages in own chat rooms"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.chat_room_id
      AND (cr.customer_id = (select auth.uid()) OR cr.influencer_id = (select auth.uid()))
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update own messages"
  ON public.chat_messages FOR UPDATE
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON public.chat_messages FOR DELETE
  USING (sender_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to messages"
  ON public.chat_messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CONTACT_SUPPORT_INFO TABLE (Public read for active items)
-- ============================================================================
ALTER TABLE public.contact_support_info ENABLE ROW LEVEL SECURITY;

-- Anyone can view active support info
CREATE POLICY "Anyone can view active support info"
  ON public.contact_support_info FOR SELECT
  USING (is_active = true);

-- Only admins can manage
CREATE POLICY "Only admins can manage support info"
  ON public.contact_support_info FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CONTRACT_TEMPLATES TABLE
-- ============================================================================
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

-- Anyone can view active templates
CREATE POLICY "Anyone can view active templates"
  ON public.contract_templates FOR SELECT
  USING (is_active = true);

-- Only admins can manage templates
CREATE POLICY "Only admins can manage templates"
  ON public.contract_templates FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CONTRACT_INSTANCES TABLE
-- ============================================================================
ALTER TABLE public.contract_instances ENABLE ROW LEVEL SECURITY;

-- Users can view contracts they're part of
CREATE POLICY "Users can view own contracts"
  ON public.contract_instances FOR SELECT
  USING (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

-- Users can create contracts
CREATE POLICY "Users can create contracts"
  ON public.contract_instances FOR INSERT
  WITH CHECK (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

-- Users can update their contracts
CREATE POLICY "Users can update own contracts"
  ON public.contract_instances FOR UPDATE
  USING (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to contracts"
  ON public.contract_instances FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CONTRACT_SIGNATURES TABLE
-- ============================================================================
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view signatures on their contracts
CREATE POLICY "Users can view signatures on own contracts"
  ON public.contract_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contract_instances ci
      WHERE ci.id = contract_signatures.contract_instance_id
      AND (ci.customer_id = (select auth.uid()) OR ci.influencer_id = (select auth.uid()))
    )
  );

-- Users can sign contracts they're part of
CREATE POLICY "Users can sign own contracts"
  ON public.contract_signatures FOR INSERT
  WITH CHECK (
    signer_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.contract_instances ci
      WHERE ci.id = contract_signatures.contract_instance_id
      AND (ci.customer_id = (select auth.uid()) OR ci.influencer_id = (select auth.uid()))
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to signatures"
  ON public.contract_signatures FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- CONTRACT_AMENDMENTS TABLE
-- ============================================================================
ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

-- Users can view amendments to their contracts
CREATE POLICY "Users can view amendments to own contracts"
  ON public.contract_amendments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contract_instances ci
      WHERE ci.id = contract_amendments.contract_instance_id
      AND (ci.customer_id = (select auth.uid()) OR ci.influencer_id = (select auth.uid()))
    )
  );

-- Only admins can create/update amendments
CREATE POLICY "Only admins can manage amendments"
  ON public.contract_amendments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- DISCOUNT_COUPONS TABLE
-- ============================================================================
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can view active public coupons
CREATE POLICY "Anyone can view active public coupons"
  ON public.discount_coupons FOR SELECT
  USING (is_active = true AND is_public = true);

-- Only admins can manage coupons
CREATE POLICY "Only admins can manage coupons"
  ON public.discount_coupons FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- COUPON_USAGE_LOG TABLE
-- ============================================================================
ALTER TABLE public.coupon_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own coupon usage
CREATE POLICY "Users can view own coupon usage"
  ON public.coupon_usage_log FOR SELECT
  USING (user_id = (select auth.uid()));

-- System can log coupon usage
CREATE POLICY "System can log coupon usage"
  ON public.coupon_usage_log FOR INSERT
  WITH CHECK (true);

-- Admins have full access
CREATE POLICY "Admins have full access to coupon logs"
  ON public.coupon_usage_log FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- COUPON_CATEGORIES TABLE
-- ============================================================================
ALTER TABLE public.coupon_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view coupon categories
CREATE POLICY "Anyone can view coupon categories"
  ON public.coupon_categories FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Only admins can manage coupon categories"
  ON public.coupon_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- FAQ_ITEMS TABLE
-- ============================================================================
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active FAQs
CREATE POLICY "Anyone can view active FAQs"
  ON public.faq_items FOR SELECT
  USING (is_active = true);

-- Only admins can manage FAQs
CREATE POLICY "Only admins can manage FAQs"
  ON public.faq_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- FAVORITES TABLE
-- ============================================================================
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (user_id = (select auth.uid()));

-- Users can create their own favorites
CREATE POLICY "Users can create own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- Users can delete their own favorites
CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  USING (user_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to favorites"
  ON public.favorites FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- FCM_TOKENS TABLE
-- ============================================================================
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own FCM tokens
CREATE POLICY "Users can manage own FCM tokens"
  ON public.fcm_tokens FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to FCM tokens"
  ON public.fcm_tokens FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- GROUP_CHATS TABLE
-- ============================================================================
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;

-- Users can view groups they're members of
CREATE POLICY "Users can view groups they're in"
  ON public.group_chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members gcm
      WHERE gcm.group_chat_id = group_chats.id AND gcm.user_id = (select auth.uid())
    )
  );

-- Users can create groups
CREATE POLICY "Users can create groups"
  ON public.group_chats FOR INSERT
  WITH CHECK (created_by = (select auth.uid()));

-- Group creators can update
CREATE POLICY "Group creators can update groups"
  ON public.group_chats FOR UPDATE
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to groups"
  ON public.group_chats FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- GROUP_CHAT_MEMBERS TABLE
-- ============================================================================
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;

-- Users can view members of groups they're in
CREATE POLICY "Users can view members of own groups"
  ON public.group_chat_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members gcm2
      WHERE gcm2.group_chat_id = group_chat_members.group_chat_id
      AND gcm2.user_id = (select auth.uid())
    )
  );

-- Group creators can add members
CREATE POLICY "Group creators can add members"
  ON public.group_chat_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_chats gc
      WHERE gc.id = group_chat_members.group_chat_id
      AND gc.created_by = (select auth.uid())
    )
  );

-- Users can leave groups
CREATE POLICY "Users can leave groups"
  ON public.group_chat_members FOR DELETE
  USING (user_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to group members"
  ON public.group_chat_members FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- GROUP_MESSAGES TABLE
-- ============================================================================
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in groups they're members of
CREATE POLICY "Users can view messages in own groups"
  ON public.group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members gcm
      WHERE gcm.group_chat_id = group_messages.group_chat_id
      AND gcm.user_id = (select auth.uid())
    )
  );

-- Users can send messages in groups they're members of
CREATE POLICY "Users can send messages in own groups"
  ON public.group_messages FOR INSERT
  WITH CHECK (
    sender_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.group_chat_members gcm
      WHERE gcm.group_chat_id = group_messages.group_chat_id
      AND gcm.user_id = (select auth.uid())
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update own group messages"
  ON public.group_messages FOR UPDATE
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

-- Users can delete their own messages
CREATE POLICY "Users can delete own group messages"
  ON public.group_messages FOR DELETE
  USING (sender_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to group messages"
  ON public.group_messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- HELP_SECTIONS TABLE
-- ============================================================================
ALTER TABLE public.help_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can view active help sections
CREATE POLICY "Anyone can view active help sections"
  ON public.help_sections FOR SELECT
  USING (is_active = true);

-- Only admins can manage
CREATE POLICY "Only admins can manage help sections"
  ON public.help_sections FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- INFLUENCER_MEDIA TABLE
-- ============================================================================
ALTER TABLE public.influencer_media ENABLE ROW LEVEL SECURITY;

-- Anyone can view influencer media (public portfolio)
CREATE POLICY "Anyone can view influencer media"
  ON public.influencer_media FOR SELECT
  USING (true);

-- Influencers can manage their own media
CREATE POLICY "Influencers can manage own media"
  ON public.influencer_media FOR ALL
  USING (influencer_id = (select auth.uid()) AND public.is_influencer())
  WITH CHECK (influencer_id = (select auth.uid()) AND public.is_influencer());

-- Admins have full access
CREATE POLICY "Admins have full access to influencer media"
  ON public.influencer_media FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- INFLUENCER_RATINGS TABLE
-- ============================================================================
ALTER TABLE public.influencer_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view influencer ratings (public)
CREATE POLICY "Anyone can view influencer ratings"
  ON public.influencer_ratings FOR SELECT
  USING (true);

-- System can update ratings (via triggers/functions)
CREATE POLICY "System can update ratings"
  ON public.influencer_ratings FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Admins have full access
CREATE POLICY "Admins have full access to ratings"
  ON public.influencer_ratings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- LEGAL_NOTICES TABLE
-- ============================================================================
ALTER TABLE public.legal_notices ENABLE ROW LEVEL SECURITY;

-- Anyone can view active legal notices
CREATE POLICY "Anyone can view active legal notices"
  ON public.legal_notices FOR SELECT
  USING (is_active = true);

-- Only admins can manage
CREATE POLICY "Only admins can manage legal notices"
  ON public.legal_notices FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages they sent or received
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

-- Users can send messages
CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = (select auth.uid()));

-- Users can update their own sent messages
CREATE POLICY "Users can update own sent messages"
  ON public.messages FOR UPDATE
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (sender_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to messages"
  ON public.messages FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- MESSAGE_ATTACHMENTS TABLE
-- ============================================================================
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments for their messages
CREATE POLICY "Users can view own message attachments"
  ON public.message_attachments FOR SELECT
  USING (
    (message_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND (m.sender_id = (select auth.uid()) OR m.receiver_id = (select auth.uid()))
    )) OR
    (group_message_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.group_messages gm
      JOIN public.group_chat_members gcm ON gcm.group_chat_id = gm.group_chat_id
      WHERE gm.id = message_attachments.group_message_id
      AND gcm.user_id = (select auth.uid())
    ))
  );

-- Users can upload attachments for their messages
CREATE POLICY "Users can upload message attachments"
  ON public.message_attachments FOR INSERT
  WITH CHECK (true); -- Validation happens at message level

-- Admins have full access
CREATE POLICY "Admins have full access to attachments"
  ON public.message_attachments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- MODERATION_QUEUE TABLE
-- ============================================================================
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON public.moderation_queue FOR SELECT
  USING (reported_by = (select auth.uid()));

-- Users can create reports
CREATE POLICY "Users can create reports"
  ON public.moderation_queue FOR INSERT
  WITH CHECK (reported_by = (select auth.uid()));

-- Only admins can update (review)
CREATE POLICY "Only admins can review reports"
  ON public.moderation_queue FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins have full access
CREATE POLICY "Admins have full access to moderation"
  ON public.moderation_queue FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = (select auth.uid()));

-- System can create notifications
CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to notifications"
  ON public.notifications FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Users can view payments they're involved in
CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (payer_id = (select auth.uid()) OR payee_id = (select auth.uid()));

-- System can create payments
CREATE POLICY "System can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

-- Only admins can update payments
CREATE POLICY "Only admins can update payments"
  ON public.payments FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins have full access
CREATE POLICY "Admins have full access to payments"
  ON public.payments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- PLATFORM_SETTINGS TABLE
-- ============================================================================
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can view platform settings (public info)
CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Only admins can manage platform settings"
  ON public.platform_settings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- PROFILE_VIEWS TABLE
-- ============================================================================
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Users can view stats for their own profile
CREATE POLICY "Users can view own profile views"
  ON public.profile_views FOR SELECT
  USING (profile_id = (select auth.uid()));

-- System can log profile views
CREATE POLICY "System can log profile views"
  ON public.profile_views FOR INSERT
  WITH CHECK (true);

-- Admins have full access
CREATE POLICY "Admins have full access to profile views"
  ON public.profile_views FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- RATING_CATEGORIES TABLE (Reference table)
-- ============================================================================
ALTER TABLE public.rating_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active rating categories
CREATE POLICY "Anyone can view active rating categories"
  ON public.rating_categories FOR SELECT
  USING (is_active = true);

-- Only admins can manage
CREATE POLICY "Only admins can manage rating categories"
  ON public.rating_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- RATINGS TABLE
-- ============================================================================
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings (public reviews)
CREATE POLICY "Anyone can view ratings"
  ON public.ratings FOR SELECT
  USING (true);

-- Customers can create ratings for their bookings
CREATE POLICY "Customers can create ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (
    customer_id = (select auth.uid()) AND
    public.is_customer() AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = ratings.booking_id
      AND b.customer_id = (select auth.uid())
    )
  );

-- Customers can update their own ratings
CREATE POLICY "Customers can update own ratings"
  ON public.ratings FOR UPDATE
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to ratings"
  ON public.ratings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- DETAILED_RATINGS TABLE
-- ============================================================================
ALTER TABLE public.detailed_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view detailed ratings
CREATE POLICY "Anyone can view detailed ratings"
  ON public.detailed_ratings FOR SELECT
  USING (true);

-- Customers can create detailed ratings for their ratings
CREATE POLICY "Customers can create detailed ratings"
  ON public.detailed_ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ratings r
      WHERE r.id = detailed_ratings.rating_id
      AND r.customer_id = (select auth.uid())
    )
  );

-- Customers can update their own detailed ratings
CREATE POLICY "Customers can update own detailed ratings"
  ON public.detailed_ratings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.ratings r
      WHERE r.id = detailed_ratings.rating_id
      AND r.customer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ratings r
      WHERE r.id = detailed_ratings.rating_id
      AND r.customer_id = (select auth.uid())
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to detailed ratings"
  ON public.detailed_ratings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews (public)
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

-- Users can create reviews
CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (reviewer_id = (select auth.uid()));

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (reviewer_id = (select auth.uid()))
  WITH CHECK (reviewer_id = (select auth.uid()));

-- Users can delete their own reviews
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (reviewer_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SCRIPT_APPROVALS TABLE
-- ============================================================================
ALTER TABLE public.script_approvals ENABLE ROW LEVEL SECURITY;

-- Customers can view approvals for their bookings
CREATE POLICY "Customers can view own script approvals"
  ON public.script_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = script_approvals.booking_id
      AND b.customer_id = (select auth.uid())
    )
  );

-- Customers can create approvals for their bookings
CREATE POLICY "Customers can create script approvals"
  ON public.script_approvals FOR INSERT
  WITH CHECK (
    customer_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = script_approvals.booking_id
      AND b.customer_id = (select auth.uid())
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to script approvals"
  ON public.script_approvals FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SERVICE_CATEGORIES TABLE
-- ============================================================================
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view service categories
CREATE POLICY "Anyone can view service categories"
  ON public.service_categories FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Only admins can manage service categories"
  ON public.service_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SERVICE_TYPES TABLE
-- ============================================================================
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- Anyone can view service types
CREATE POLICY "Anyone can view service types"
  ON public.service_types FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Only admins can manage service types"
  ON public.service_types FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SERVICE_CATEGORY_MAPPINGS TABLE
-- ============================================================================
ALTER TABLE public.service_category_mappings ENABLE ROW LEVEL SECURITY;

-- Anyone can view mappings
CREATE POLICY "Anyone can view service category mappings"
  ON public.service_category_mappings FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Only admins can manage mappings"
  ON public.service_category_mappings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SERVICE_PARTNERS TABLE
-- ============================================================================
ALTER TABLE public.service_partners ENABLE ROW LEVEL SECURITY;

-- Anyone can view service partners
CREATE POLICY "Anyone can view service partners"
  ON public.service_partners FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Only admins can manage service partners"
  ON public.service_partners FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SOCIAL_MEDIA_PLATFORMS TABLE
-- ============================================================================
ALTER TABLE public.social_media_platforms ENABLE ROW LEVEL SECURITY;

-- Anyone can view platforms
CREATE POLICY "Anyone can view social media platforms"
  ON public.social_media_platforms FOR SELECT
  USING (true);

-- Only admins can manage
CREATE POLICY "Only admins can manage platforms"
  ON public.social_media_platforms FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SOCIAL_LINKS TABLE
-- ============================================================================
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

-- Anyone can view social links (public profiles)
CREATE POLICY "Anyone can view social links"
  ON public.social_links FOR SELECT
  USING (true);

-- Users can manage their own social links
CREATE POLICY "Users can manage own social links"
  ON public.social_links FOR ALL
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to social links"
  ON public.social_links FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SOCIAL_STATS TABLE
-- ============================================================================
ALTER TABLE public.social_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can view social stats (public)
CREATE POLICY "Anyone can view social stats"
  ON public.social_stats FOR SELECT
  USING (true);

-- Users can update stats for their own social links
CREATE POLICY "Users can update own social stats"
  ON public.social_stats FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.social_links sl
      WHERE sl.id = social_stats.social_link_id
      AND sl.user_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.social_links sl
      WHERE sl.id = social_stats.social_link_id
      AND sl.user_id = (select auth.uid())
    )
  );

-- System can insert stats
CREATE POLICY "System can insert social stats"
  ON public.social_stats FOR INSERT
  WITH CHECK (true);

-- Admins have full access
CREATE POLICY "Admins have full access to social stats"
  ON public.social_stats FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SERVICES TABLE
-- ============================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Anyone can view services (public marketplace)
CREATE POLICY "Anyone can view services"
  ON public.services FOR SELECT
  USING (true);

-- Influencers can create services
CREATE POLICY "Influencers can create services"
  ON public.services FOR INSERT
  WITH CHECK (
    primary_influencer_id = (select auth.uid()) AND
    public.is_influencer()
  );

-- Influencers can update their own services
CREATE POLICY "Influencers can update own services"
  ON public.services FOR UPDATE
  USING (primary_influencer_id = (select auth.uid()) OR invited_influencer_id = (select auth.uid()))
  WITH CHECK (primary_influencer_id = (select auth.uid()) OR invited_influencer_id = (select auth.uid()));

-- Influencers can delete their own services
CREATE POLICY "Influencers can delete own services"
  ON public.services FOR DELETE
  USING (primary_influencer_id = (select auth.uid()));

-- Admins have full access
CREATE POLICY "Admins have full access to services"
  ON public.services FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SERVICE_PLATFORMS TABLE
-- ============================================================================
ALTER TABLE public.service_platforms ENABLE ROW LEVEL SECURITY;

-- Anyone can view service platforms
CREATE POLICY "Anyone can view service platforms"
  ON public.service_platforms FOR SELECT
  USING (true);

-- Influencers can manage platforms for their services
CREATE POLICY "Influencers can manage platforms for own services"
  ON public.service_platforms FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_platforms.service_id
      AND (s.primary_influencer_id = (select auth.uid()) OR s.invited_influencer_id = (select auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_platforms.service_id
      AND (s.primary_influencer_id = (select auth.uid()) OR s.invited_influencer_id = (select auth.uid()))
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to service platforms"
  ON public.service_platforms FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SUPPORT_CATEGORIES TABLE
-- ============================================================================
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view active support categories
CREATE POLICY "Anyone can view active support categories"
  ON public.support_categories FOR SELECT
  USING (is_active = true);

-- Only admins can manage
CREATE POLICY "Only admins can manage support categories"
  ON public.support_categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SUPPORT_TICKETS TABLE
-- ============================================================================
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Users can view their own tickets
CREATE POLICY "Users can view own support tickets"
  ON public.support_tickets FOR SELECT
  USING (user_id = (select auth.uid()) OR assigned_to = (select auth.uid()));

-- Users can create tickets
CREATE POLICY "Users can create support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- Users can update their own tickets
CREATE POLICY "Users can update own tickets"
  ON public.support_tickets FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- Admins can update any ticket
CREATE POLICY "Admins can update any ticket"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins have full access
CREATE POLICY "Admins have full access to tickets"
  ON public.support_tickets FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- SUPPORT_TICKET_RESPONSES TABLE
-- ============================================================================
ALTER TABLE public.support_ticket_responses ENABLE ROW LEVEL SECURITY;

-- Users can view responses to their tickets
CREATE POLICY "Users can view responses to own tickets"
  ON public.support_ticket_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_ticket_responses.ticket_id
      AND (st.user_id = (select auth.uid()) OR st.assigned_to = (select auth.uid()))
    )
  );

-- Users can respond to their tickets
CREATE POLICY "Users can respond to own tickets"
  ON public.support_ticket_responses FOR INSERT
  WITH CHECK (
    responder_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_ticket_responses.ticket_id
      AND st.user_id = (select auth.uid())
    )
  );

-- Admins can respond to any ticket
CREATE POLICY "Admins can respond to any ticket"
  ON public.support_ticket_responses FOR INSERT
  WITH CHECK (public.is_admin());

-- Admins have full access
CREATE POLICY "Admins have full access to ticket responses"
  ON public.support_ticket_responses FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Users can view transactions for their bookings
CREATE POLICY "Users can view transactions for own bookings"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = transactions.booking_id
      AND (b.customer_id = (select auth.uid()) OR b.influencer_id = (select auth.uid()))
    )
  );

-- System can create transactions
CREATE POLICY "System can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

-- Only admins can update transactions
CREATE POLICY "Only admins can update transactions"
  ON public.transactions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admins have full access
CREATE POLICY "Admins have full access to transactions"
  ON public.transactions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================

