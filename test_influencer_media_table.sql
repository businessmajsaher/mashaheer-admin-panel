-- Test if influencer_media table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'influencer_media';

-- If table exists, show its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'influencer_media'
ORDER BY ordinal_position;

-- Check if there are any existing records
SELECT COUNT(*) as record_count 
FROM public.influencer_media; 