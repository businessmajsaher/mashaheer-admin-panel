-- 1. Add columns to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS invited_influencer_id uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS service_type public.service_type_enum;

-- 2. Drop the trigger if it exists so we can backfill without errors
DROP TRIGGER IF EXISTS enforce_dual_service_influencer ON public.bookings;

-- 3. Backfill existing bookings from services table
UPDATE public.bookings b
SET 
    service_type = s.service_type,
    invited_influencer_id = COALESCE(b.invited_influencer_id, s.invited_influencer_id)
FROM public.services s
WHERE b.service_id = s.id
AND (b.service_type IS NULL OR b.invited_influencer_id IS NULL);

-- 4. Make service_type NOT NULL
ALTER TABLE public.bookings
ALTER COLUMN service_type SET NOT NULL;

-- 4b. Ensure invited influencer is not the same as primary influencer
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS check_influencers_are_different;

ALTER TABLE public.bookings
ADD CONSTRAINT check_influencers_are_different 
CHECK (invited_influencer_id != influencer_id);

-- 5. Create table-level constraint via trigger for dual bookings
CREATE OR REPLACE FUNCTION check_dual_service_invited_influencer()
RETURNS TRIGGER AS $$
DECLARE
    v_service_type text;
BEGIN
    SELECT service_type INTO v_service_type
    FROM public.services
    WHERE id = NEW.service_id;

    IF v_service_type = 'dual' AND NEW.invited_influencer_id IS NULL THEN
        RAISE EXCEPTION 'invited_influencer_id is required for dual service bookings';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Attach the trigger
CREATE TRIGGER enforce_dual_service_influencer
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION check_dual_service_invited_influencer();
