-- Check if influencer_media table exists and create it if it doesn't
DO $$
BEGIN
    -- Check if the table exists
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'influencer_media'
    ) THEN
        -- Create the influencer_media table
        CREATE TABLE public.influencer_media (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            influencer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
            file_url TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_name TEXT NOT NULL,
            file_size BIGINT,
            mime_type TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Create indexes for better performance
        CREATE INDEX idx_influencer_media_influencer_id ON public.influencer_media(influencer_id);
        CREATE INDEX idx_influencer_media_created_at ON public.influencer_media(created_at);

        -- Add RLS (Row Level Security) policies if needed
        ALTER TABLE public.influencer_media ENABLE ROW LEVEL SECURITY;

        -- Create policy to allow authenticated users to read their own media
        CREATE POLICY "Users can view their own media" ON public.influencer_media
            FOR SELECT USING (auth.uid() = influencer_id);

        -- Create policy to allow authenticated users to insert their own media
        CREATE POLICY "Users can insert their own media" ON public.influencer_media
            FOR INSERT WITH CHECK (auth.uid() = influencer_id);

        -- Create policy to allow authenticated users to update their own media
        CREATE POLICY "Users can update their own media" ON public.influencer_media
            FOR UPDATE USING (auth.uid() = influencer_id);

        -- Create policy to allow authenticated users to delete their own media
        CREATE POLICY "Users can delete their own media" ON public.influencer_media
            FOR DELETE USING (auth.uid() = influencer_id);

        -- Create policy to allow admins to manage all media
        CREATE POLICY "Admins can manage all media" ON public.influencer_media
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE id = auth.uid() 
                    AND role = 'admin'
                )
            );

        RAISE NOTICE 'influencer_media table created successfully';
    ELSE
        RAISE NOTICE 'influencer_media table already exists';
    END IF;
END $$;

-- Check the current structure of the table
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'influencer_media'
ORDER BY ordinal_position; 