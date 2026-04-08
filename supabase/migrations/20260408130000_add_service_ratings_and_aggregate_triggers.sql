-- Aggregate ratings for influencers and services.
-- - `ratings` are per-booking (unique booking_id).
-- - For dual services, the invited influencer should receive the same rating impact as the primary.
--
-- This migration:
-- 1) Creates `service_ratings` aggregate table
-- 2) Creates a SECURITY DEFINER function to recompute aggregates for a booking
-- 3) Adds trigger on `ratings` to recompute on insert/update/delete

-- -----------------------------------------------------------------------------
-- 1) Service ratings aggregate
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_ratings (
  service_id uuid NOT NULL,
  average_rating numeric NOT NULL DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT service_ratings_pkey PRIMARY KEY (service_id),
  CONSTRAINT service_ratings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE
);

ALTER TABLE public.service_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view service ratings" ON public.service_ratings;
CREATE POLICY "Anyone can view service ratings"
  ON public.service_ratings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage service ratings" ON public.service_ratings;
CREATE POLICY "Admins can manage service ratings"
  ON public.service_ratings FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2) Recompute function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.recompute_ratings_aggregates_for_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_id uuid;
  v_invited_influencer_id uuid;
  v_primary_influencer_id uuid;
BEGIN
  -- Get booking service
  SELECT b.service_id INTO v_service_id
  FROM public.bookings b
  WHERE b.id = p_booking_id;

  IF v_service_id IS NULL THEN
    RETURN;
  END IF;

  -- Get invited influencer for dual services (if any)
  SELECT s.invited_influencer_id INTO v_invited_influencer_id
  FROM public.services s
  WHERE s.id = v_service_id;

  -- Primary influencer id for this booking rating row (if present)
  SELECT r.influencer_id INTO v_primary_influencer_id
  FROM public.ratings r
  WHERE r.booking_id = p_booking_id;

  -- 2a) Recompute service aggregate
  INSERT INTO public.service_ratings(service_id, average_rating, review_count, updated_at)
  SELECT
    v_service_id,
    COALESCE(AVG(r.rating)::numeric, 0),
    COALESCE(COUNT(*)::int, 0),
    now()
  FROM public.ratings r
  JOIN public.bookings b ON b.id = r.booking_id
  WHERE b.service_id = v_service_id
  ON CONFLICT (service_id) DO UPDATE
    SET average_rating = EXCLUDED.average_rating,
        review_count = EXCLUDED.review_count,
        updated_at = EXCLUDED.updated_at;

  -- 2b) Recompute primary influencer aggregate (if known)
  IF v_primary_influencer_id IS NOT NULL THEN
    INSERT INTO public.influencer_ratings(influencer_id, average_rating, review_count, updated_at)
    SELECT
      v_primary_influencer_id,
      COALESCE(AVG(r.rating)::numeric, 0),
      COALESCE(COUNT(*)::int, 0),
      now()
    FROM public.ratings r
    JOIN public.bookings b ON b.id = r.booking_id
    JOIN public.services s ON s.id = b.service_id
    WHERE
      r.influencer_id = v_primary_influencer_id
      OR (s.service_type = 'dual' AND s.invited_influencer_id = v_primary_influencer_id)
    ON CONFLICT (influencer_id) DO UPDATE
      SET average_rating = EXCLUDED.average_rating,
          review_count = EXCLUDED.review_count,
          updated_at = EXCLUDED.updated_at;
  END IF;

  -- 2c) Recompute invited influencer aggregate (if present)
  IF v_invited_influencer_id IS NOT NULL THEN
    INSERT INTO public.influencer_ratings(influencer_id, average_rating, review_count, updated_at)
    SELECT
      v_invited_influencer_id,
      COALESCE(AVG(r.rating)::numeric, 0),
      COALESCE(COUNT(*)::int, 0),
      now()
    FROM public.ratings r
    JOIN public.bookings b ON b.id = r.booking_id
    JOIN public.services s ON s.id = b.service_id
    WHERE
      r.influencer_id = v_invited_influencer_id
      OR (s.service_type = 'dual' AND s.invited_influencer_id = v_invited_influencer_id)
    ON CONFLICT (influencer_id) DO UPDATE
      SET average_rating = EXCLUDED.average_rating,
          review_count = EXCLUDED.review_count,
          updated_at = EXCLUDED.updated_at;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3) Trigger on ratings table
-- -----------------------------------------------------------------------------
-- Helper trigger function (separate to handle OLD/NEW)
CREATE OR REPLACE FUNCTION public._trg_recompute_ratings_aggregates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_ratings_aggregates_for_booking(OLD.booking_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_ratings_aggregates_for_booking(NEW.booking_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_recompute_ratings_aggregates ON public.ratings;

CREATE TRIGGER trg_recompute_ratings_aggregates
AFTER INSERT OR UPDATE OR DELETE
ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION public._trg_recompute_ratings_aggregates();

-- -----------------------------------------------------------------------------
-- 4) Backfill aggregates from existing ratings
-- -----------------------------------------------------------------------------
-- Service aggregates
INSERT INTO public.service_ratings(service_id, average_rating, review_count, updated_at)
SELECT
  b.service_id,
  COALESCE(AVG(r.rating)::numeric, 0) AS average_rating,
  COUNT(*)::int AS review_count,
  now() AS updated_at
FROM public.ratings r
JOIN public.bookings b ON b.id = r.booking_id
GROUP BY b.service_id
ON CONFLICT (service_id) DO UPDATE
  SET average_rating = EXCLUDED.average_rating,
      review_count = EXCLUDED.review_count,
      updated_at = EXCLUDED.updated_at;

-- Influencer aggregates (includes dual invited influencer)
WITH rating_with_service AS (
  SELECT
    r.rating,
    r.influencer_id AS primary_influencer_id,
    s.invited_influencer_id,
    s.service_type
  FROM public.ratings r
  JOIN public.bookings b ON b.id = r.booking_id
  JOIN public.services s ON s.id = b.service_id
),
expanded AS (
  SELECT primary_influencer_id AS influencer_id, rating FROM rating_with_service
  UNION ALL
  SELECT invited_influencer_id AS influencer_id, rating
  FROM rating_with_service
  WHERE service_type = 'dual' AND invited_influencer_id IS NOT NULL
)
INSERT INTO public.influencer_ratings(influencer_id, average_rating, review_count, updated_at)
SELECT
  influencer_id,
  COALESCE(AVG(rating)::numeric, 0) AS average_rating,
  COUNT(*)::int AS review_count,
  now() AS updated_at
FROM expanded
WHERE influencer_id IS NOT NULL
GROUP BY influencer_id
ON CONFLICT (influencer_id) DO UPDATE
  SET average_rating = EXCLUDED.average_rating,
      review_count = EXCLUDED.review_count,
      updated_at = EXCLUDED.updated_at;

