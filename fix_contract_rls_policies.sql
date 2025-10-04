-- Fix RLS policies for contract tables
-- Run these commands in your Supabase SQL Editor

-- 1. First, let's check if RLS is enabled on the tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('contract_templates', 'contract_instances', 'contract_signatures', 'contract_amendments');

-- 2. Enable RLS on all contract tables (if not already enabled)
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_amendments ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies (if any) to start fresh
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON contract_templates;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON contract_instances;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON contract_signatures;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON contract_amendments;

-- 4. Create comprehensive RLS policies for contract_templates
CREATE POLICY "Allow all operations for authenticated users" ON contract_templates
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 5. Create comprehensive RLS policies for contract_instances
CREATE POLICY "Allow all operations for authenticated users" ON contract_instances
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 6. Create comprehensive RLS policies for contract_signatures
CREATE POLICY "Allow all operations for authenticated users" ON contract_signatures
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 7. Create comprehensive RLS policies for contract_amendments
CREATE POLICY "Allow all operations for authenticated users" ON contract_amendments
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 8. Alternative: If you want to disable RLS temporarily for testing
-- (Uncomment the lines below if you want to disable RLS completely)
-- ALTER TABLE contract_templates DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE contract_instances DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE contract_signatures DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE contract_amendments DISABLE ROW LEVEL SECURITY;

-- 9. Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('contract_templates', 'contract_instances', 'contract_signatures', 'contract_amendments');

-- 10. Test the policies by trying to insert a test record
-- (This should work after applying the policies above)
INSERT INTO contract_templates (title, template_type, content, variables, is_active)
VALUES (
    'Test Template', 
    'advertising', 
    '<h1>Test Contract</h1><p>This is a test contract template.</p>', 
    ARRAY['test_variable'], 
    true
);

-- 11. Clean up the test record
DELETE FROM contract_templates WHERE title = 'Test Template';


