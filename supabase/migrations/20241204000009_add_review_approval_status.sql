-- Add approval status fields to reviews table
-- This allows admins to approve or reject reviews

-- Add approval status fields if they don't exist
ALTER TABLE public.reviews 
ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS is_rejected boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejected_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add comment
COMMENT ON COLUMN public.reviews.is_approved IS 'Whether the review has been approved by an admin';
COMMENT ON COLUMN public.reviews.is_rejected IS 'Whether the review has been rejected by an admin';
COMMENT ON COLUMN public.reviews.approved_by IS 'Admin who approved the review';

