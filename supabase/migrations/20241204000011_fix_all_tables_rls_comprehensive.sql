-- Comprehensive RLS Policy Fix for All Tables
-- This migration fixes all tables that use "FOR ALL" policies by separating them
-- into individual INSERT, UPDATE, DELETE policies to avoid conflicts

-- ============================================================================
-- Helper: Function to drop all policies for a table
-- ============================================================================
CREATE OR REPLACE FUNCTION drop_all_policies_for_table(table_name text)
RETURNS void AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = table_name
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, table_name);
  END LOOP;
END $$ LANGUAGE plpgsql;

-- ============================================================================
-- ADMIN_ACTIONS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('admin_actions');
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert admin actions"
  ON public.admin_actions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update admin actions"
  ON public.admin_actions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete admin actions"
  ON public.admin_actions FOR DELETE
  USING (public.is_admin());

CREATE POLICY "Admins can view admin actions"
  ON public.admin_actions FOR SELECT
  USING (public.is_admin());

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('bookings');
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own bookings"
  ON public.bookings FOR SELECT
  USING (customer_id = (select auth.uid()));

CREATE POLICY "Influencers can view own bookings"
  ON public.bookings FOR SELECT
  USING (influencer_id = (select auth.uid()));

CREATE POLICY "Admins can view all bookings"
  ON public.bookings FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Customers can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (customer_id = (select auth.uid()) AND public.is_customer());

CREATE POLICY "Admins can insert bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Customers can update own bookings"
  ON public.bookings FOR UPDATE
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Influencers can update own bookings"
  ON public.bookings FOR UPDATE
  USING (influencer_id = (select auth.uid()))
  WITH CHECK (influencer_id = (select auth.uid()));

CREATE POLICY "Admins can update bookings"
  ON public.bookings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CONTRACT_INSTANCES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('contract_instances');
ALTER TABLE public.contract_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contracts"
  ON public.contract_instances FOR SELECT
  USING (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

CREATE POLICY "Admins can view all contracts"
  ON public.contract_instances FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can create contracts"
  ON public.contract_instances FOR INSERT
  WITH CHECK (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

CREATE POLICY "Admins can insert contracts"
  ON public.contract_instances FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own contracts"
  ON public.contract_instances FOR UPDATE
  USING (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

CREATE POLICY "Admins can update contracts"
  ON public.contract_instances FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete contracts"
  ON public.contract_instances FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CONTRACT_SIGNATURES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('contract_signatures');
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures on own contracts"
  ON public.contract_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contract_instances ci
      WHERE ci.id = contract_signatures.contract_instance_id
      AND (ci.customer_id = (select auth.uid()) OR ci.influencer_id = (select auth.uid()))
    )
  );

CREATE POLICY "Admins can view all signatures"
  ON public.contract_signatures FOR SELECT
  USING (public.is_admin());

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

CREATE POLICY "Admins can insert signatures"
  ON public.contract_signatures FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update signatures"
  ON public.contract_signatures FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete signatures"
  ON public.contract_signatures FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CONTRACT_AMENDMENTS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('contract_amendments');
ALTER TABLE public.contract_amendments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view amendments to own contracts"
  ON public.contract_amendments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contract_instances ci
      WHERE ci.id = contract_amendments.contract_instance_id
      AND (ci.customer_id = (select auth.uid()) OR ci.influencer_id = (select auth.uid()))
    )
  );

CREATE POLICY "Admins can view all amendments"
  ON public.contract_amendments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert amendments"
  ON public.contract_amendments FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update amendments"
  ON public.contract_amendments FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete amendments"
  ON public.contract_amendments FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CONTRACT_TEMPLATES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('contract_templates');
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active templates"
  ON public.contract_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all templates"
  ON public.contract_templates FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert templates"
  ON public.contract_templates FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update templates"
  ON public.contract_templates FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete templates"
  ON public.contract_templates FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- COUPON_USAGE_LOG TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('coupon_usage_log');
ALTER TABLE public.coupon_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coupon usage"
  ON public.coupon_usage_log FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all coupon usage"
  ON public.coupon_usage_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "System can log coupon usage"
  ON public.coupon_usage_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can insert coupon usage"
  ON public.coupon_usage_log FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update coupon usage"
  ON public.coupon_usage_log FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete coupon usage"
  ON public.coupon_usage_log FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- DISCOUNT_COUPONS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('discount_coupons');
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active public coupons"
  ON public.discount_coupons FOR SELECT
  USING (is_active = true AND is_public = true);

CREATE POLICY "Admins can view all coupons"
  ON public.discount_coupons FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert coupons"
  ON public.discount_coupons FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update coupons"
  ON public.discount_coupons FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete coupons"
  ON public.discount_coupons FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- DETAILED_RATINGS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('detailed_ratings');
ALTER TABLE public.detailed_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view detailed ratings"
  ON public.detailed_ratings FOR SELECT
  USING (true);

CREATE POLICY "Customers can create detailed ratings"
  ON public.detailed_ratings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ratings r
      WHERE r.id = detailed_ratings.rating_id
      AND r.customer_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert detailed ratings"
  ON public.detailed_ratings FOR INSERT
  WITH CHECK (public.is_admin());

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

CREATE POLICY "Admins can update detailed ratings"
  ON public.detailed_ratings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete detailed ratings"
  ON public.detailed_ratings FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- FAVORITES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('favorites');
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all favorites"
  ON public.favorites FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can create own favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can insert favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can delete favorites"
  ON public.favorites FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- FCM_TOKENS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('fcm_tokens');
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own FCM tokens"
  ON public.fcm_tokens FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all FCM tokens"
  ON public.fcm_tokens FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can insert own FCM tokens"
  ON public.fcm_tokens FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can insert FCM tokens"
  ON public.fcm_tokens FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own FCM tokens"
  ON public.fcm_tokens FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can update FCM tokens"
  ON public.fcm_tokens FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can delete own FCM tokens"
  ON public.fcm_tokens FOR DELETE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can delete FCM tokens"
  ON public.fcm_tokens FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- GROUP_CHATS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('group_chats');
ALTER TABLE public.group_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view groups they're in"
  ON public.group_chats FOR SELECT
  USING (
    created_by = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.group_chat_members gcm
      WHERE gcm.group_chat_id = group_chats.id
      AND gcm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all groups"
  ON public.group_chats FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can create groups"
  ON public.group_chats FOR INSERT
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Admins can insert groups"
  ON public.group_chats FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Group creators can update groups"
  ON public.group_chats FOR UPDATE
  USING (created_by = (select auth.uid()))
  WITH CHECK (created_by = (select auth.uid()));

CREATE POLICY "Admins can update groups"
  ON public.group_chats FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete groups"
  ON public.group_chats FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- GROUP_CHAT_MEMBERS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('group_chat_members');
ALTER TABLE public.group_chat_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of own groups"
  ON public.group_chat_members FOR SELECT
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.group_chats gc
      WHERE gc.id = group_chat_members.group_chat_id
      AND gc.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all group members"
  ON public.group_chat_members FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Group creators can add members"
  ON public.group_chat_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.group_chats gc
      WHERE gc.id = group_chat_members.group_chat_id
      AND gc.created_by = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert group members"
  ON public.group_chat_members FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can leave groups"
  ON public.group_chat_members FOR DELETE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can delete group members"
  ON public.group_chat_members FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- GROUP_MESSAGES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('group_messages');
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own groups"
  ON public.group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.group_chat_members gcm
      WHERE gcm.group_chat_id = group_messages.group_chat_id
      AND gcm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all group messages"
  ON public.group_messages FOR SELECT
  USING (public.is_admin());

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

CREATE POLICY "Admins can insert group messages"
  ON public.group_messages FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own group messages"
  ON public.group_messages FOR UPDATE
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Admins can update group messages"
  ON public.group_messages FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can delete own group messages"
  ON public.group_messages FOR DELETE
  USING (sender_id = (select auth.uid()));

CREATE POLICY "Admins can delete group messages"
  ON public.group_messages FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- MESSAGES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('messages');
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Admins can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own sent messages"
  ON public.messages FOR UPDATE
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Admins can update messages"
  ON public.messages FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can delete own messages"
  ON public.messages FOR DELETE
  USING (sender_id = (select auth.uid()) OR receiver_id = (select auth.uid()));

CREATE POLICY "Admins can delete messages"
  ON public.messages FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- MESSAGE_ATTACHMENTS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('message_attachments');
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own message attachments"
  ON public.message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND (m.sender_id = (select auth.uid()) OR m.receiver_id = (select auth.uid()))
    ) OR
    EXISTS (
      SELECT 1 FROM public.group_messages gm
      JOIN public.group_chat_members gcm ON gcm.group_chat_id = gm.group_chat_id
      WHERE gm.id = message_attachments.group_message_id
      AND gcm.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all attachments"
  ON public.message_attachments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can upload message attachments"
  ON public.message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_attachments.message_id
      AND m.sender_id = (select auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.group_messages gm
      WHERE gm.id = message_attachments.group_message_id
      AND gm.sender_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert attachments"
  ON public.message_attachments FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update attachments"
  ON public.message_attachments FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete attachments"
  ON public.message_attachments FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- MODERATION_QUEUE TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('moderation_queue');
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON public.moderation_queue FOR SELECT
  USING (reported_by = (select auth.uid()));

CREATE POLICY "Admins can view all reports"
  ON public.moderation_queue FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can create reports"
  ON public.moderation_queue FOR INSERT
  WITH CHECK (reported_by = (select auth.uid()));

CREATE POLICY "Admins can insert reports"
  ON public.moderation_queue FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can review reports"
  ON public.moderation_queue FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete reports"
  ON public.moderation_queue FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('notifications');
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all notifications"
  ON public.notifications FOR SELECT
  USING (public.is_admin());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can update notifications"
  ON public.notifications FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can delete own notifications"
  ON public.notifications FOR DELETE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can delete notifications"
  ON public.notifications FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- PAYMENTS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('payments');
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (payer_id = (select auth.uid()) OR payee_id = (select auth.uid()));

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "System can create payments"
  ON public.payments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can insert payments"
  ON public.payments FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update payments"
  ON public.payments FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete payments"
  ON public.payments FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- RATINGS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('ratings');
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ratings"
  ON public.ratings FOR SELECT
  USING (true);

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

CREATE POLICY "Admins can insert ratings"
  ON public.ratings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Customers can update own ratings"
  ON public.ratings FOR UPDATE
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Admins can update ratings"
  ON public.ratings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete ratings"
  ON public.ratings FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SCRIPT_APPROVALS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('script_approvals');
ALTER TABLE public.script_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own script approvals"
  ON public.script_approvals FOR SELECT
  USING (customer_id = (select auth.uid()));

CREATE POLICY "Admins can view all script approvals"
  ON public.script_approvals FOR SELECT
  USING (public.is_admin());

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

CREATE POLICY "Admins can insert script approvals"
  ON public.script_approvals FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update script approvals"
  ON public.script_approvals FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete script approvals"
  ON public.script_approvals FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SERVICE_TYPES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('service_types');
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service types"
  ON public.service_types FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert service types"
  ON public.service_types FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update service types"
  ON public.service_types FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete service types"
  ON public.service_types FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SERVICE_PLATFORMS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('service_platforms');
ALTER TABLE public.service_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service platforms"
  ON public.service_platforms FOR SELECT
  USING (true);

CREATE POLICY "Influencers can insert platforms for own services"
  ON public.service_platforms FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_platforms.service_id
      AND (s.primary_influencer_id = (select auth.uid()) OR s.invited_influencer_id = (select auth.uid()))
    )
  );

CREATE POLICY "Admins can insert service platforms"
  ON public.service_platforms FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Influencers can update platforms for own services"
  ON public.service_platforms FOR UPDATE
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

CREATE POLICY "Admins can update service platforms"
  ON public.service_platforms FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Influencers can delete platforms for own services"
  ON public.service_platforms FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_platforms.service_id
      AND (s.primary_influencer_id = (select auth.uid()) OR s.invited_influencer_id = (select auth.uid()))
    )
  );

CREATE POLICY "Admins can delete service platforms"
  ON public.service_platforms FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('transactions');
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions for own bookings"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = transactions.booking_id
      AND (b.customer_id = (select auth.uid()) OR b.influencer_id = (select auth.uid()))
    )
  );

CREATE POLICY "Admins can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.is_admin());

CREATE POLICY "System can create transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can insert transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update transactions"
  ON public.transactions FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete transactions"
  ON public.transactions FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- BOOKING_ANALYTICS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('booking_analytics');
ALTER TABLE public.booking_analytics ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "Admins and system can insert analytics"
  ON public.booking_analytics FOR INSERT
  WITH CHECK (public.is_admin() OR true);

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
SELECT drop_all_policies_for_table('carts');
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own carts"
  ON public.carts FOR SELECT
  USING (customer_id = (select auth.uid()));

CREATE POLICY "Admins can view all carts"
  ON public.carts FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Customers can create own carts"
  ON public.carts FOR INSERT
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Admins can insert carts"
  ON public.carts FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Customers can update own carts"
  ON public.carts FOR UPDATE
  USING (customer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()));

CREATE POLICY "Admins can update carts"
  ON public.carts FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Customers can delete own carts"
  ON public.carts FOR DELETE
  USING (customer_id = (select auth.uid()));

CREATE POLICY "Admins can delete carts"
  ON public.carts FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CART_ITEMS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('cart_items');
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own cart items"
  ON public.cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
      AND c.customer_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all cart items"
  ON public.cart_items FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Customers can add items to own carts"
  ON public.cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
      AND c.customer_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Customers can update own cart items"
  ON public.cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
      AND c.customer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
      AND c.customer_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can update cart items"
  ON public.cart_items FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Customers can delete own cart items"
  ON public.cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id
      AND c.customer_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can delete cart items"
  ON public.cart_items FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CHAT_ROOMS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('chat_rooms');
ALTER TABLE public.chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat rooms"
  ON public.chat_rooms FOR SELECT
  USING (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

CREATE POLICY "Admins can view all chat rooms"
  ON public.chat_rooms FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can create chat rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

CREATE POLICY "Admins can insert chat rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own chat rooms"
  ON public.chat_rooms FOR UPDATE
  USING (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()))
  WITH CHECK (customer_id = (select auth.uid()) OR influencer_id = (select auth.uid()));

CREATE POLICY "Admins can update chat rooms"
  ON public.chat_rooms FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete chat rooms"
  ON public.chat_rooms FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('chat_messages');
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in own chat rooms"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.chat_room_id
      AND (cr.customer_id = (select auth.uid()) OR cr.influencer_id = (select auth.uid()))
    )
  );

CREATE POLICY "Admins can view all chat messages"
  ON public.chat_messages FOR SELECT
  USING (public.is_admin());

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

CREATE POLICY "Admins can insert chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own messages"
  ON public.chat_messages FOR UPDATE
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

CREATE POLICY "Admins can update chat messages"
  ON public.chat_messages FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can delete own messages"
  ON public.chat_messages FOR DELETE
  USING (sender_id = (select auth.uid()));

CREATE POLICY "Admins can delete chat messages"
  ON public.chat_messages FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CONTACT_SUPPORT_INFO TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('contact_support_info');
ALTER TABLE public.contact_support_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active support info"
  ON public.contact_support_info FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all support info"
  ON public.contact_support_info FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert support info"
  ON public.contact_support_info FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update support info"
  ON public.contact_support_info FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete support info"
  ON public.contact_support_info FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- FAQ_ITEMS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('faq_items');
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active FAQs"
  ON public.faq_items FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all FAQs"
  ON public.faq_items FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert FAQs"
  ON public.faq_items FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update FAQs"
  ON public.faq_items FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete FAQs"
  ON public.faq_items FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- HELP_SECTIONS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('help_sections');
ALTER TABLE public.help_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active help sections"
  ON public.help_sections FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all help sections"
  ON public.help_sections FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert help sections"
  ON public.help_sections FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update help sections"
  ON public.help_sections FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete help sections"
  ON public.help_sections FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- INFLUENCER_RATINGS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('influencer_ratings');
ALTER TABLE public.influencer_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view influencer ratings"
  ON public.influencer_ratings FOR SELECT
  USING (true);

CREATE POLICY "System can insert ratings"
  ON public.influencer_ratings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can insert ratings"
  ON public.influencer_ratings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "System can update ratings"
  ON public.influencer_ratings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can update ratings"
  ON public.influencer_ratings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete ratings"
  ON public.influencer_ratings FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- LEGAL_NOTICES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('legal_notices');
ALTER TABLE public.legal_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active legal notices"
  ON public.legal_notices FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all legal notices"
  ON public.legal_notices FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert legal notices"
  ON public.legal_notices FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update legal notices"
  ON public.legal_notices FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete legal notices"
  ON public.legal_notices FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- PLATFORM_SETTINGS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('platform_settings');
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete platform settings"
  ON public.platform_settings FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- PROFILE_VIEWS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('profile_views');
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile views"
  ON public.profile_views FOR SELECT
  USING (profile_id = (select auth.uid()));

CREATE POLICY "Admins can view all profile views"
  ON public.profile_views FOR SELECT
  USING (public.is_admin());

CREATE POLICY "System can log profile views"
  ON public.profile_views FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can insert profile views"
  ON public.profile_views FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update profile views"
  ON public.profile_views FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profile views"
  ON public.profile_views FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SERVICE_CATEGORY_MAPPINGS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('service_category_mappings');
ALTER TABLE public.service_category_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service category mappings"
  ON public.service_category_mappings FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert service category mappings"
  ON public.service_category_mappings FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update service category mappings"
  ON public.service_category_mappings FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete service category mappings"
  ON public.service_category_mappings FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SERVICE_PARTNERS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('service_partners');
ALTER TABLE public.service_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service partners"
  ON public.service_partners FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert service partners"
  ON public.service_partners FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update service partners"
  ON public.service_partners FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete service partners"
  ON public.service_partners FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SOCIAL_STATS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('social_stats');
ALTER TABLE public.social_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view social stats"
  ON public.social_stats FOR SELECT
  USING (true);

CREATE POLICY "Users can insert stats for own social links"
  ON public.social_stats FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.social_links sl
      WHERE sl.id = social_stats.social_link_id
      AND sl.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can insert social stats"
  ON public.social_stats FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update stats for own social links"
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

CREATE POLICY "Admins can update social stats"
  ON public.social_stats FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can delete stats for own social links"
  ON public.social_stats FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.social_links sl
      WHERE sl.id = social_stats.social_link_id
      AND sl.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can delete social stats"
  ON public.social_stats FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SUPPORT_TICKETS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('support_tickets');
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own support tickets"
  ON public.support_tickets FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can view all support tickets"
  ON public.support_tickets FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can create support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can insert support tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own support tickets"
  ON public.support_tickets FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can update support tickets"
  ON public.support_tickets FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete support tickets"
  ON public.support_tickets FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SUPPORT_TICKET_RESPONSES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('support_ticket_responses');
ALTER TABLE public.support_ticket_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view responses to own tickets"
  ON public.support_ticket_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets st
      WHERE st.id = support_ticket_responses.ticket_id
      AND st.user_id = (select auth.uid())
    ) OR
    responder_id = (select auth.uid())
  );

CREATE POLICY "Admins can view all ticket responses"
  ON public.support_ticket_responses FOR SELECT
  USING (public.is_admin());

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

CREATE POLICY "Admins can insert ticket responses"
  ON public.support_ticket_responses FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own responses"
  ON public.support_ticket_responses FOR UPDATE
  USING (responder_id = (select auth.uid()))
  WITH CHECK (responder_id = (select auth.uid()));

CREATE POLICY "Admins can update ticket responses"
  ON public.support_ticket_responses FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete ticket responses"
  ON public.support_ticket_responses FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- BOOKING_STATUSES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('booking_statuses');
ALTER TABLE public.booking_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view booking statuses"
  ON public.booking_statuses FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert booking statuses"
  ON public.booking_statuses FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update booking statuses"
  ON public.booking_statuses FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete booking statuses"
  ON public.booking_statuses FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- COUPON_CATEGORIES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('coupon_categories');
ALTER TABLE public.coupon_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view coupon categories"
  ON public.coupon_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert coupon categories"
  ON public.coupon_categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update coupon categories"
  ON public.coupon_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete coupon categories"
  ON public.coupon_categories FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- INFLUENCER_MEDIA TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('influencer_media');
ALTER TABLE public.influencer_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view influencer media"
  ON public.influencer_media FOR SELECT
  USING (true);

CREATE POLICY "Influencers can insert own media"
  ON public.influencer_media FOR INSERT
  WITH CHECK (influencer_id = (select auth.uid()));

CREATE POLICY "Admins can insert influencer media"
  ON public.influencer_media FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Influencers can update own media"
  ON public.influencer_media FOR UPDATE
  USING (influencer_id = (select auth.uid()))
  WITH CHECK (influencer_id = (select auth.uid()));

CREATE POLICY "Admins can update influencer media"
  ON public.influencer_media FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Influencers can delete own media"
  ON public.influencer_media FOR DELETE
  USING (influencer_id = (select auth.uid()));

CREATE POLICY "Admins can delete influencer media"
  ON public.influencer_media FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- RATING_CATEGORIES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('rating_categories');
ALTER TABLE public.rating_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rating categories"
  ON public.rating_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all rating categories"
  ON public.rating_categories FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert rating categories"
  ON public.rating_categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update rating categories"
  ON public.rating_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete rating categories"
  ON public.rating_categories FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('reviews');
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved reviews"
  ON public.reviews FOR SELECT
  USING (is_approved = true OR public.is_admin());

CREATE POLICY "Users can view own reviews"
  ON public.reviews FOR SELECT
  USING (reviewer_id = (select auth.uid()));

CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (reviewer_id = (select auth.uid()));

CREATE POLICY "Admins can insert reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  USING (reviewer_id = (select auth.uid()) AND (is_approved IS NULL OR is_approved = false))
  WITH CHECK (reviewer_id = (select auth.uid()));

CREATE POLICY "Admins can update reviews"
  ON public.reviews FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  USING (reviewer_id = (select auth.uid()) AND (is_approved IS NULL OR is_approved = false));

CREATE POLICY "Admins can delete reviews"
  ON public.reviews FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SERVICE_CATEGORIES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('service_categories');
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view service categories"
  ON public.service_categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert service categories"
  ON public.service_categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update service categories"
  ON public.service_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete service categories"
  ON public.service_categories FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SERVICES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('services');
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view services"
  ON public.services FOR SELECT
  USING (true);

CREATE POLICY "Influencers can insert own services"
  ON public.services FOR INSERT
  WITH CHECK (primary_influencer_id = (select auth.uid()));

CREATE POLICY "Admins can insert services"
  ON public.services FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Influencers can update own services"
  ON public.services FOR UPDATE
  USING (primary_influencer_id = (select auth.uid()) OR invited_influencer_id = (select auth.uid()))
  WITH CHECK (primary_influencer_id = (select auth.uid()) OR invited_influencer_id = (select auth.uid()));

CREATE POLICY "Admins can update services"
  ON public.services FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Influencers can delete own services"
  ON public.services FOR DELETE
  USING (primary_influencer_id = (select auth.uid()));

CREATE POLICY "Admins can delete services"
  ON public.services FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SOCIAL_LINKS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('social_links');
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view social links"
  ON public.social_links FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own social links"
  ON public.social_links FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can insert social links"
  ON public.social_links FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can update own social links"
  ON public.social_links FOR UPDATE
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Admins can update social links"
  ON public.social_links FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Users can delete own social links"
  ON public.social_links FOR DELETE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Admins can delete social links"
  ON public.social_links FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SOCIAL_MEDIA_PLATFORMS TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('social_media_platforms');
ALTER TABLE public.social_media_platforms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view social media platforms"
  ON public.social_media_platforms FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert social media platforms"
  ON public.social_media_platforms FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update social media platforms"
  ON public.social_media_platforms FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete social media platforms"
  ON public.social_media_platforms FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- SUPPORT_CATEGORIES TABLE
-- ============================================================================
SELECT drop_all_policies_for_table('support_categories');
ALTER TABLE public.support_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active support categories"
  ON public.support_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can view all support categories"
  ON public.support_categories FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can insert support categories"
  ON public.support_categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update support categories"
  ON public.support_categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete support categories"
  ON public.support_categories FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- PROFILES TABLE (Special handling - keep existing user policies)
-- ============================================================================
-- Note: Profiles table has special policies for users to view/update their own profiles
-- We'll keep those but ensure admin policies are separated
SELECT drop_all_policies_for_table('profiles');
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (id = (select auth.uid()));

CREATE POLICY "Users can view public profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- Clean up helper function
-- ============================================================================
DROP FUNCTION IF EXISTS drop_all_policies_for_table(text);

