-- Refunds RLS: align with public.is_admin() so admins with role in auth metadata
-- (not only profiles.role) can read/write refunds from the admin panel.

DROP POLICY IF EXISTS "Admins can view all refunds" ON public.refunds;
DROP POLICY IF EXISTS "Admins can create refunds" ON public.refunds;
DROP POLICY IF EXISTS "Admins can update refunds" ON public.refunds;

CREATE POLICY "Admins can view all refunds" ON public.refunds
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can create refunds" ON public.refunds
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update refunds" ON public.refunds
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
