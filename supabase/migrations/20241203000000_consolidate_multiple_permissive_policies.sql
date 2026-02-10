-- ============================================================================
-- Consolidate Multiple Permissive Policies
-- ============================================================================
-- This migration consolidates overlapping RLS policies to eliminate
-- multiple_permissive_policies warnings. Instead of having separate
-- "Admins have full access" policies alongside user-specific policies,
-- we consolidate them into single policies per operation that check
-- for admin OR the specific condition.
-- ============================================================================

-- ============================================================================
-- BOOKING_STATUSES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view booking statuses" ON public.booking_statuses;
DROP POLICY IF EXISTS "Only admins can manage booking statuses" ON public.booking_statuses;
DROP POLICY IF EXISTS "Only admins can insert booking statuses" ON public.booking_statuses;
DROP POLICY IF EXISTS "Only admins can update booking statuses" ON public.booking_statuses;
DROP POLICY IF EXISTS "Only admins can delete booking statuses" ON public.booking_statuses;

-- Consolidated SELECT policy: Anyone OR admins
CREATE POLICY "Anyone can view booking statuses"
  ON public.booking_statuses FOR SELECT
  USING (true);

-- Separate admin-only policies for INSERT, UPDATE, DELETE (to avoid conflicts)
CREATE POLICY "Only admins can insert booking statuses"
  ON public.booking_statuses FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can update booking statuses"
  ON public.booking_statuses FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Only admins can delete booking statuses"
  ON public.booking_statuses FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- PROFILES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- Consolidated SELECT policy: Admins OR own profile OR public profiles
CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_admin() OR
    id = (select auth.uid()) OR
    true  -- public profiles
  );

-- Consolidated UPDATE policy: Admins OR own profile
CREATE POLICY "Users can update profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin() OR id = (select auth.uid()))
  WITH CHECK (public.is_admin() OR id = (select auth.uid()));

-- Admins can INSERT and DELETE (separate policies to avoid conflicts)
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Customers can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Influencers can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customers can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Customers can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Influencers can update own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins have full access to bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON public.bookings;

-- Consolidated SELECT policy: Admins OR customer OR influencer
CREATE POLICY "Users can view bookings"
  ON public.bookings FOR SELECT
  USING (
    public.is_admin() OR
    customer_id = (select auth.uid()) OR
    influencer_id = (select auth.uid())
  );

-- Consolidated INSERT policy: Admins OR customers
CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (
    public.is_admin() OR
    (customer_id = (select auth.uid()) AND public.is_customer())
  );

-- Consolidated UPDATE policy: Admins OR customer OR influencer
CREATE POLICY "Users can update bookings"
  ON public.bookings FOR UPDATE
  USING (
    public.is_admin() OR
    customer_id = (select auth.uid()) OR
    influencer_id = (select auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR
    customer_id = (select auth.uid()) OR
    influencer_id = (select auth.uid())
  );

-- Admins can DELETE
CREATE POLICY "Admins can delete bookings"
  ON public.bookings FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CARTS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Customers can view own carts" ON public.carts;
DROP POLICY IF EXISTS "Customers can create own carts" ON public.carts;
DROP POLICY IF EXISTS "Customers can update own carts" ON public.carts;
DROP POLICY IF EXISTS "Customers can delete own carts" ON public.carts;
DROP POLICY IF EXISTS "Admins have full access to carts" ON public.carts;
DROP POLICY IF EXISTS "Users can view carts" ON public.carts;
DROP POLICY IF EXISTS "Users can create carts" ON public.carts;
DROP POLICY IF EXISTS "Users can update carts" ON public.carts;
DROP POLICY IF EXISTS "Users can delete carts" ON public.carts;

-- Consolidated SELECT policy: Admins OR own cart
CREATE POLICY "Users can view carts"
  ON public.carts FOR SELECT
  USING (
    public.is_admin() OR
    customer_id = (select auth.uid())
  );

-- Consolidated INSERT policy: Admins OR customers
CREATE POLICY "Users can create carts"
  ON public.carts FOR INSERT
  WITH CHECK (
    public.is_admin() OR
    customer_id = (select auth.uid())
  );

-- Consolidated UPDATE policy: Admins OR own cart
CREATE POLICY "Users can update carts"
  ON public.carts FOR UPDATE
  USING (
    public.is_admin() OR
    customer_id = (select auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR
    customer_id = (select auth.uid())
  );

-- Consolidated DELETE policy: Admins OR own cart
CREATE POLICY "Users can delete carts"
  ON public.carts FOR DELETE
  USING (
    public.is_admin() OR
    customer_id = (select auth.uid())
  );

-- ============================================================================
-- CART_ITEMS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Customers can view own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Customers can add items to own carts" ON public.cart_items;
DROP POLICY IF EXISTS "Customers can update own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Customers can delete own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Admins have full access to cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can view cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can add cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can delete cart items" ON public.cart_items;

-- Consolidated SELECT policy: Admins OR own cart items
CREATE POLICY "Users can view cart items"
  ON public.cart_items FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  );

-- Consolidated INSERT policy: Admins OR own cart
CREATE POLICY "Users can add cart items"
  ON public.cart_items FOR INSERT
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  );

-- Consolidated UPDATE policy: Admins OR own cart items
CREATE POLICY "Users can update cart items"
  ON public.cart_items FOR UPDATE
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  )
  WITH CHECK (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  );

-- Consolidated DELETE policy: Admins OR own cart items
CREATE POLICY "Users can delete cart items"
  ON public.cart_items FOR DELETE
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.carts c
      WHERE c.id = cart_items.cart_id AND c.customer_id = (select auth.uid())
    )
  );

-- ============================================================================
-- CHAT_ROOMS TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update own chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admins have full access to chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can view chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Users can update chat rooms" ON public.chat_rooms;
DROP POLICY IF EXISTS "Admins can delete chat rooms" ON public.chat_rooms;

-- Consolidated SELECT policy: Admins OR own chat rooms
CREATE POLICY "Users can view chat rooms"
  ON public.chat_rooms FOR SELECT
  USING (
    public.is_admin() OR
    customer_id = (select auth.uid()) OR
    influencer_id = (select auth.uid())
  );

-- Consolidated INSERT policy: Admins OR users
CREATE POLICY "Users can create chat rooms"
  ON public.chat_rooms FOR INSERT
  WITH CHECK (
    public.is_admin() OR
    customer_id = (select auth.uid()) OR
    influencer_id = (select auth.uid())
  );

-- Consolidated UPDATE policy: Admins OR own chat rooms
CREATE POLICY "Users can update chat rooms"
  ON public.chat_rooms FOR UPDATE
  USING (
    public.is_admin() OR
    customer_id = (select auth.uid()) OR
    influencer_id = (select auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR
    customer_id = (select auth.uid()) OR
    influencer_id = (select auth.uid())
  );

-- Admins can DELETE
CREATE POLICY "Admins can delete chat rooms"
  ON public.chat_rooms FOR DELETE
  USING (public.is_admin());

-- ============================================================================
-- CHAT_MESSAGES TABLE
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in own chat rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages in own chat rooms" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Admins have full access to messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can update chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can delete chat messages" ON public.chat_messages;

-- Consolidated SELECT policy: Admins OR messages in own chat rooms
CREATE POLICY "Users can view chat messages"
  ON public.chat_messages FOR SELECT
  USING (
    public.is_admin() OR
    EXISTS (
      SELECT 1 FROM public.chat_rooms cr
      WHERE cr.id = chat_messages.chat_room_id
      AND (cr.customer_id = (select auth.uid()) OR cr.influencer_id = (select auth.uid()))
    )
  );

-- Consolidated INSERT policy: Admins OR senders in own chat rooms
CREATE POLICY "Users can send chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    public.is_admin() OR
    (
      sender_id = (select auth.uid()) AND
      EXISTS (
        SELECT 1 FROM public.chat_rooms cr
        WHERE cr.id = chat_messages.chat_room_id
        AND (cr.customer_id = (select auth.uid()) OR cr.influencer_id = (select auth.uid()))
      )
    )
  );

-- Consolidated UPDATE policy: Admins OR own messages
CREATE POLICY "Users can update chat messages"
  ON public.chat_messages FOR UPDATE
  USING (
    public.is_admin() OR
    sender_id = (select auth.uid())
  )
  WITH CHECK (
    public.is_admin() OR
    sender_id = (select auth.uid())
  );

-- Consolidated DELETE policy: Admins OR own messages
CREATE POLICY "Users can delete chat messages"
  ON public.chat_messages FOR DELETE
  USING (
    public.is_admin() OR
    sender_id = (select auth.uid())
  );

