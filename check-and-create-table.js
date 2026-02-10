// Script to check and create influencer_media table
// Run this in the browser console

const checkAndCreateTable = async () => {
  console.log('🔍 Checking influencer_media table...');
  
  try {
    // Test 1: Check if table exists
    console.log('📋 Test 1: Checking if influencer_media table exists...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('influencer_media')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Table check failed:', tableError);
      
      if (tableError.message && tableError.message.includes('relation "influencer_media" does not exist')) {
        console.error('❌ CRITICAL: influencer_media table does not exist!');
        console.error('❌ This is why media files are not being saved!');
        console.error('❌ Please run the create_influencer_media_table.sql script in your Supabase database');
        
        // Show the SQL to run
        console.log('📝 SQL to run in Supabase SQL Editor:');
        console.log(`
-- Run this in your Supabase SQL Editor:

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
        `);
        
        return;
      }
      
      console.error('❌ Other table error:', tableError);
      return;
    }
    
    console.log('✅ influencer_media table exists and is accessible');
    
    // Test 2: Check table structure
    console.log('📋 Test 2: Checking table structure...');
    const { data: structure, error: structureError } = await supabase
      .from('influencer_media')
      .select('*')
      .limit(0);
    
    if (structureError) {
      console.error('❌ Structure check failed:', structureError);
    } else {
      console.log('✅ Table structure is valid');
    }
    
    // Test 3: Check existing records
    console.log('📋 Test 3: Checking existing records...');
    const { data: records, error: recordsError } = await supabase
      .from('influencer_media')
      .select('*')
      .limit(10);
    
    if (recordsError) {
      console.error('❌ Records check failed:', recordsError);
    } else {
      console.log(`✅ Found ${records.length} existing records:`, records);
    }
    
    // Test 4: Test insert with the recently created influencer
    console.log('📋 Test 4: Testing insert with recent influencer...');
    
    // Get the recently created influencer from the logs
    const testInfluencerId = '6bad78ff-d5ca-438b-9ead-61d2bc889cee';
    
    const testMediaData = {
      influencer_id: testInfluencerId,
      file_url: 'https://wilshhncdehbnyldsjzs.supabase.co/storage/v1/object/public/influencer-media/influencer-media/1755597876904-ob2.jpg',
      file_type: 'image',
      file_name: 'ob2.jpg',
      file_size: 1024,
      mime_type: 'image/jpeg',
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Test insert data:', testMediaData);
    
    const { data: insertData, error: insertError } = await supabase
      .from('influencer_media')
      .insert(testMediaData)
      .select();
    
    if (insertError) {
      console.error('❌ Insert test failed:', insertError);
    } else {
      console.log('✅ Insert test successful:', insertData);
      
      // Clean up test data
      const { error: deleteError } = await supabase
        .from('influencer_media')
        .delete()
        .eq('id', insertData[0].id);
      
      if (deleteError) {
        console.warn('⚠️ Failed to clean up test data:', deleteError);
      } else {
        console.log('✅ Test data cleaned up successfully');
      }
    }
    
    console.log('🎉 Table check completed!');
    
  } catch (error) {
    console.error('❌ Table check failed:', error);
  }
};

// Run the check
checkAndCreateTable(); 