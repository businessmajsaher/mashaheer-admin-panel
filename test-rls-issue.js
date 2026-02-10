// Test script to diagnose RLS policy issue
// Run this in the browser console

const testRLSIssue = async () => {
  console.log('🔍 Testing RLS Policy Issue...');
  
  try {
    // Test 1: Check current user
    console.log('📋 Test 1: Checking current user...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ User check failed:', userError);
      return;
    }
    
    console.log('✅ Current user:', userData.user);
    console.log('✅ User ID:', userData.user.id);
    console.log('✅ User role:', userData.user.user_metadata?.role);
    
    // Test 2: Check if we can access the profiles table
    console.log('📋 Test 2: Checking profiles table access...');
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', userData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile check failed:', profileError);
    } else {
      console.log('✅ Profile data:', profileData);
      console.log('✅ Profile role:', profileData.role);
    }
    
    // Test 3: Test direct insert to influencer_media table
    console.log('📋 Test 3: Testing direct insert to influencer_media...');
    
    const testMediaData = {
      influencer_id: '6bad78ff-d5ca-438b-9ead-61d2bc889cee', // Use the existing influencer ID
      file_url: 'https://example.com/test.jpg',
      file_type: 'image',
      file_name: 'test.jpg',
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
      console.error('❌ Error details:', JSON.stringify(insertError, null, 2));
      
      if (insertError.message && insertError.message.includes('row-level security policy')) {
        console.error('❌ RLS POLICY ISSUE DETECTED!');
        console.error('❌ The row-level security policy is blocking the insert');
        console.error('❌ Solution: Run the disable-rls-for-testing.sql script in Supabase SQL Editor');
      }
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
    
    // Test 4: Check table structure
    console.log('📋 Test 4: Checking table structure...');
    const { data: structure, error: structureError } = await supabase
      .from('influencer_media')
      .select('*')
      .limit(0);
    
    if (structureError) {
      console.error('❌ Structure check failed:', structureError);
    } else {
      console.log('✅ Table structure is valid');
    }
    
    console.log('🎉 RLS test completed!');
    
  } catch (error) {
    console.error('❌ RLS test failed:', error);
  }
};

// Run the test
testRLSIssue(); 