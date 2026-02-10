// Test script to verify the constraint fix
// Run this in the browser console

const testFixedConstraint = async () => {
  console.log('🔍 Testing Fixed Constraint...');
  
  try {
    // Test 1: Test insert with 'image' type
    console.log('📋 Test 1: Testing insert with image type...');
    
    const imageTestData = {
      influencer_id: '6bad78ff-d5ca-438b-9ead-61d2bc889cee',
      file_url: 'https://example.com/test-image.jpg',
      file_type: 'image',
      file_name: 'test-image.jpg',
      file_size: 1024,
      mime_type: 'image/jpeg',
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Image test data:', imageTestData);
    
    const { data: imageInsertData, error: imageInsertError } = await supabase
      .from('influencer_media')
      .insert(imageTestData)
      .select();
    
    if (imageInsertError) {
      console.error('❌ Image insert failed:', imageInsertError);
    } else {
      console.log('✅ Image insert successful:', imageInsertData);
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('influencer_media')
        .delete()
        .eq('id', imageInsertData[0].id);
      
      if (deleteError) {
        console.warn('⚠️ Failed to clean up image test data:', deleteError);
      } else {
        console.log('✅ Image test data cleaned up successfully');
      }
    }
    
    // Test 2: Test insert with 'video' type
    console.log('📋 Test 2: Testing insert with video type...');
    
    const videoTestData = {
      influencer_id: '6bad78ff-d5ca-438b-9ead-61d2bc889cee',
      file_url: 'https://example.com/test-video.mp4',
      file_type: 'video',
      file_name: 'test-video.mp4',
      file_size: 2048,
      mime_type: 'video/mp4',
      created_at: new Date().toISOString()
    };
    
    console.log('📝 Video test data:', videoTestData);
    
    const { data: videoInsertData, error: videoInsertError } = await supabase
      .from('influencer_media')
      .insert(videoTestData)
      .select();
    
    if (videoInsertError) {
      console.error('❌ Video insert failed:', videoInsertError);
    } else {
      console.log('✅ Video insert successful:', videoInsertData);
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('influencer_media')
        .delete()
        .eq('id', videoInsertData[0].id);
      
      if (deleteError) {
        console.warn('⚠️ Failed to clean up video test data:', deleteError);
      } else {
        console.log('✅ Video test data cleaned up successfully');
      }
    }
    
    console.log('🎉 Constraint fix test completed!');
    console.log('✅ If both tests passed, the constraint issue is fixed!');
    
  } catch (error) {
    console.error('❌ Constraint fix test failed:', error);
  }
};

// Run the test
testFixedConstraint(); 