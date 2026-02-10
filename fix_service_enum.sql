-- Check current service_type enum values
SELECT unnest(enum_range(NULL::service_type_enum)) as enum_values;

-- If the enum doesn't exist or has wrong values, create/update it
-- First, let's see what values are currently in the services table
SELECT DISTINCT service_type FROM services;

-- Update the enum if needed (run this if the enum values are wrong)
-- ALTER TYPE service_type_enum RENAME VALUE 'old_value' TO 'new_value';

-- Or create the enum if it doesn't exist
-- CREATE TYPE service_type_enum AS ENUM ('normal', 'dual', 'flash'); 