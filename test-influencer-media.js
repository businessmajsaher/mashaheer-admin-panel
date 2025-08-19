// Test script for influencer_media table functionality
// Run this in the browser console to test the table operations

const testInfluencerMediaTable = async () => {
  console.log('🧪 Testing Influencer Media Table...');
  
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
        console.error('❌ Please run the create_influencer_media_table.sql script in your Supabase database');
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
    
    // Test 4: Test insert (if we have a test influencer)
    console.log('📋 Test 4: Testing insert operation...');
    
    // First, get a test influencer
    const { data: influencers, error: influencerError } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'influencer')
      .limit(1);
    
    if (influencerError) {
      console.error('❌ Failed to get test influencer:', influencerError);
      return;
    }
    
    if (!influencers || influencers.length === 0) {
      console.log('⚠️ No influencers found to test with');
      return;
    }
    
    const testInfluencer = influencers[0];
    console.log('📝 Using test influencer:', testInfluencer);
    
    // Test insert with dummy data
    const testMediaData = {
      influencer_id: testInfluencer.id,
      file_url: 'https://example.com/test-image.jpg',
      file_type: 'image',
      file_name: 'test-image.jpg',
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
    
    console.log('🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testInfluencerMediaTable(); 