-- Deadlines from platform_settings + customer timezone (appointment / auto-approval)
-- payment_deadline set when primary influencer signs contract (separate trigger)

CREATE OR REPLACE FUNCTION public.calculate_booking_deadlines()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  days_between numeric;
  ps_influencer_hours numeric := 12;
  ps_end_h integer := 23;
  ps_end_m integer := 59;
  ps_auto_h integer := 22;
  ps_auto_m integer := 30;
  cust_tz text := 'UTC';
  v_local timestamp without time zone;
  v_y integer;
  v_mo integer;
  v_d integer;
BEGIN
  ps_influencer_hours := COALESCE(
    (SELECT ps.influencer_approval_hours FROM public.platform_settings ps ORDER BY ps.updated_at DESC NULLS LAST LIMIT 1),
    12
  );
  ps_end_h := COALESCE(
    (SELECT ps.appointment_end_hour FROM public.platform_settings ps ORDER BY ps.updated_at DESC NULLS LAST LIMIT 1),
    23
  )::integer;
  ps_end_m := COALESCE(
    (SELECT ps.appointment_end_minute FROM public.platform_settings ps ORDER BY ps.updated_at DESC NULLS LAST LIMIT 1),
    59
  )::integer;
  ps_auto_h := COALESCE(
    (SELECT ps.auto_approval_hour FROM public.platform_settings ps ORDER BY ps.updated_at DESC NULLS LAST LIMIT 1),
    22
  )::integer;
  ps_auto_m := COALESCE(
    (SELECT ps.auto_approval_minute FROM public.platform_settings ps ORDER BY ps.updated_at DESC NULLS LAST LIMIT 1),
    30
  )::integer;

  IF ps_influencer_hours IS NULL OR ps_influencer_hours <= 0 THEN
    ps_influencer_hours := 12;
  END IF;

  SELECT NULLIF(TRIM(p.timezone), '') INTO cust_tz
  FROM public.profiles p
  WHERE p.id = NEW.customer_id;

  IF cust_tz IS NULL THEN
    cust_tz := 'UTC';
  END IF;

  IF NEW.scheduled_time IS NOT NULL THEN
    days_between := EXTRACT(EPOCH FROM (NEW.scheduled_time - NEW.created_at)) / 86400;
    NEW.days_gap := GREATEST(1, days_between::integer);

    BEGIN
      v_local := NEW.scheduled_time AT TIME ZONE cust_tz;
    EXCEPTION WHEN OTHERS THEN
      cust_tz := 'UTC';
      v_local := NEW.scheduled_time AT TIME ZONE 'UTC';
    END;

    v_y := EXTRACT(YEAR FROM v_local)::integer;
    v_mo := EXTRACT(MONTH FROM v_local)::integer;
    v_d := EXTRACT(DAY FROM v_local)::integer;

    BEGIN
      NEW.appointment_end_time := make_timestamptz(
        v_y, v_mo, v_d, ps_end_h, ps_end_m, 0::double precision, cust_tz
      );
    EXCEPTION WHEN OTHERS THEN
      NEW.appointment_end_time := make_timestamptz(
        v_y, v_mo, v_d, ps_end_h, ps_end_m, 0::double precision, 'UTC'
      );
    END;

    BEGIN
      NEW.auto_approval_deadline := make_timestamptz(
        v_y, v_mo, v_d, ps_auto_h, ps_auto_m, 0::double precision, cust_tz
      );
    EXCEPTION WHEN OTHERS THEN
      NEW.auto_approval_deadline := make_timestamptz(
        v_y, v_mo, v_d, ps_auto_h, ps_auto_m, 0::double precision, 'UTC'
      );
    END;
  END IF;

  IF NEW.influencer_approval_deadline IS NULL AND NEW.created_at IS NOT NULL THEN
    NEW.influencer_approval_deadline :=
      NEW.created_at + ((ps_influencer_hours::text || ' hours')::interval);
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_booking_deadlines() IS
  'Sets days_gap, appointment_end_time, auto_approval_deadline from platform_settings and customer profiles.timezone; influencer_approval_deadline = created_at + influencer_approval_hours.';

-- Primary influencer contract signature -> payment_deadline (first set only)
CREATE OR REPLACE FUNCTION public.set_booking_payment_deadline_on_primary_influencer_sign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b_id uuid;
  hours numeric := 12;
  anchor timestamptz;
BEGIN
  IF NEW.signer_type IS DISTINCT FROM 'influencer' THEN
    RETURN NEW;
  END IF;

  SELECT ci.booking_id INTO b_id
  FROM public.contract_instances ci
  WHERE ci.id = NEW.contract_instance_id;

  IF b_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.bookings b
    WHERE b.id = b_id
      AND b.influencer_id = NEW.signer_id
  ) THEN
    RETURN NEW;
  END IF;

  hours := COALESCE(
    (SELECT ps.payment_deadline_hours FROM public.platform_settings ps ORDER BY ps.updated_at DESC NULLS LAST LIMIT 1),
    12
  );

  IF hours IS NULL OR hours <= 0 THEN
    hours := 12;
  END IF;

  anchor := COALESCE(NEW.signed_at, now());

  UPDATE public.bookings b
  SET
    payment_deadline = anchor + ((hours::text || ' hours')::interval),
    updated_at = now()
  WHERE b.id = b_id
    AND b.payment_deadline IS NULL;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_booking_payment_deadline_on_primary_influencer_sign() IS
  'When primary booking influencer signs (contract_signatures), set payment_deadline = signed_at + payment_deadline_hours if not already set.';

DROP TRIGGER IF EXISTS trigger_payment_deadline_on_influencer_sign ON public.contract_signatures;

CREATE TRIGGER trigger_payment_deadline_on_influencer_sign
  AFTER INSERT ON public.contract_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.set_booking_payment_deadline_on_primary_influencer_sign();
