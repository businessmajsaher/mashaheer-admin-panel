-- Cash out uses admin-selected date ranges, not weekly/monthly buckets.
-- Normalize existing rows and allow 'custom' alongside legacy values.
--
-- Order matters: drop the old CHECK first, then UPDATE rows to 'custom',
-- then add the widened CHECK (otherwise UPDATE violates the old constraint).

ALTER TABLE public.settlements
  DROP CONSTRAINT IF EXISTS settlements_period_type_check;

UPDATE public.settlements
SET period_type = 'custom'
WHERE period_type IN ('weekly', 'monthly');

ALTER TABLE public.settlements
  ADD CONSTRAINT settlements_period_type_check
  CHECK (period_type = ANY (ARRAY['weekly'::text, 'monthly'::text, 'custom'::text]));

COMMENT ON COLUMN public.settlements.period_type IS 'Settlement bucket: custom = admin date range; weekly/monthly retained for legacy.';
