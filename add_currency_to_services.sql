-- Add currency column to services table
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_services_currency ON services(currency);

-- Update existing services to have a default currency
UPDATE services 
SET currency = 'USD' 
WHERE currency IS NULL; 