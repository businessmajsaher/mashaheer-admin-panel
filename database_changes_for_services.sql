-- Database changes for Services improvements

-- 1. Check and fix service_type enum values
-- First, check what enum values currently exist
SELECT unnest(enum_range(NULL::service_type_enum)) as enum_values;

-- If the enum doesn't exist, create it
-- CREATE TYPE service_type_enum AS ENUM ('normal', 'dual', 'flash');

-- If the enum exists but has wrong values, update them
-- ALTER TYPE service_type_enum RENAME VALUE 'old_value' TO 'new_value';

-- 2. For multiselect platforms, we need to change the platform_id field
-- Option A: Change platform_id to platform_ids (array of UUIDs)
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS platform_ids UUID[];

-- Update existing single platform_id to platform_ids array
UPDATE services 
SET platform_ids = ARRAY[platform_id] 
WHERE platform_id IS NOT NULL AND platform_ids IS NULL;

-- Option B: Create a separate service_platforms junction table (recommended)
CREATE TABLE IF NOT EXISTS service_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  platform_id UUID NOT NULL REFERENCES social_media_platforms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service_id, platform_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_service_platforms_service_id ON service_platforms(service_id);
CREATE INDEX IF NOT EXISTS idx_service_platforms_platform_id ON service_platforms(platform_id);

-- 3. Add currency field if not already added
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';

-- 4. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_services_currency ON services(currency);
CREATE INDEX IF NOT EXISTS idx_services_service_type ON services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_primary_influencer_id ON services(primary_influencer_id);

-- 5. Check current data
SELECT 
  service_type,
  COUNT(*) as count
FROM services 
GROUP BY service_type;

-- 6. Update any invalid service_type values
-- UPDATE services SET service_type = 'normal' WHERE service_type NOT IN ('normal', 'dual', 'flash'); 