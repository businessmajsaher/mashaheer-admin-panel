// Test script to diagnose constraint issue
// Run this in the browser console

const testConstraintIssue = async () => {
  console.log('🔍 Testing Constraint Issue...');
  
  try {
    // Test 1: Check what file types are being sent
    console.log('📋 Test 1: Checking file type values...');
    
    const testCases = [
      { file_type: 'image/jpeg', expected: 'image' },
      { file_type: 'image/png', expected: 'image' },
      { file_type: 'video/mp4', expected: 'video' },
      { file_type: 'audio/mp3', expected: 'audio' },
      { file_type: 'application/pdf', expected: 'document' },
      { file_type: 'text/plain', expected: 'other' }
    ];
    
    testCases.forEach(testCase => {
      let fileType = 'other';
      if (testCase.file_type.startsWith('image/')) {
        fileType = 'image';
      } else if (testCase.file_type.startsWith('video/')) {
        fileType = 'video';
      } else if (testCase.file_type.startsWith('audio/')) {
        fileType = 'audio';
      } else if (testCase.file_type.includes('pdf') || testCase.file_type.includes('document')) {
        fileType = 'document';
      }
      
      console.log(`📝 ${testCase.file_type} -> ${fileType} (expected: ${testCase.expected})`);
    });
    
    // Test 2: Test insert with different file types
    console.log('📋 Test 2: Testing insert with different file types...');
    
    const testData = [
      {
        influencer_id: '6bad78ff-d5ca-438b-9ead-61d2bc889cee',
        file_url: 'https://example.com/test1.jpg',
        file_type: 'image',
        file_name: 'test1.jpg',
        file_size: 1024,
        mime_type: 'image/jpeg',
        created_at: new Date().toISOString()
      },
      {
        influencer_id: '6bad78ff-d5ca-438b-9ead-61d2bc889cee',
        file_url: 'https://example.com/test2.mp4',
        file_type: 'video',
        file_name: 'test2.mp4',
        file_size: 2048,
        mime_type: 'video/mp4',
        created_at: new Date().toISOString()
      }
    ];
    
    for (let i = 0; i < testData.length; i++) {
      const testItem = testData[i];
      console.log(`📝 Testing insert ${i + 1}:`, testItem);
      
      const { data: insertData, error: insertError } = await supabase
        .from('influencer_media')
        .insert(testItem)
        .select();
      
      if (insertError) {
        console.error(`❌ Insert ${i + 1} failed:`, insertError);
        console.error(`❌ Error details:`, JSON.stringify(insertError, null, 2));
        
        if (insertError.message && insertError.message.includes('check constraint')) {
          console.error('❌ CONSTRAINT ISSUE DETECTED!');
          console.error('❌ The check constraint is blocking the insert');
          console.error('❌ Solution: Run the fix-file-type-constraint.sql script in Supabase SQL Editor');
        }
      } else {
        console.log(`✅ Insert ${i + 1} successful:`, insertData);
        
        // Clean up test data
        const { error: deleteError } = await supabase
          .from('influencer_media')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.warn(`⚠️ Failed to clean up test data ${i + 1}:`, deleteError);
        } else {
          console.log(`✅ Test data ${i + 1} cleaned up successfully`);
        }
      }
    }
    
    console.log('🎉 Constraint test completed!');
    
  } catch (error) {
    console.error('❌ Constraint test failed:', error);
  }
};

// Run the test
testConstraintIssue(); 