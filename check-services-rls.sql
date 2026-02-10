-- Check current RLS policies on services table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'services';

-- Check if RLS is enabled on services table
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'services';

-- Create or update RLS policy to allow admin users to update services
-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can update services" ON services;

-- Create new policy for admin users
CREATE POLICY "Admins can update services" ON services
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Also create a policy for all operations if needed
DROP POLICY IF EXISTS "Admins can manage all services" ON services;

CREATE POLICY "Admins can manage all services" ON services
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Check the updated policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'services'; 