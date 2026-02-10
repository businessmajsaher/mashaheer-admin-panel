-- Add updated_at column to payments table
-- This column is referenced by the webhook but doesn't exist

-- Step 1: Add the column (if it doesn't exist)
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Step 2: Create or replace the function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop the trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Verify the column was added
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'payments'
  AND column_name = 'updated_at';
