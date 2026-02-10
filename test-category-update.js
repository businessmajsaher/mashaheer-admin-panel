// Test script for category update functionality
// Run this in the browser console to test the category operations

const testCategoryOperations = async () => {
  console.log('🧪 Testing Category Operations...');
  
  try {
    // Test 1: Fetch categories
    console.log('📋 Test 1: Fetching categories...');
    const { data: categories, error: fetchError } = await supabase
      .from('service_categories')
      .select('*')
      .limit(5);
    
    if (fetchError) {
      console.error('❌ Fetch error:', fetchError);
      return;
    }
    
    console.log('✅ Categories fetched:', categories);
    
    if (categories && categories.length > 0) {
      const testCategory = categories[0];
      console.log('📝 Test category:', testCategory);
      
      // Test 2: Update category (name only)
      console.log('✏️ Test 2: Updating category name...');
      const newName = `Test Update ${Date.now()}`;
      const { data: updateData, error: updateError } = await supabase
        .from('service_categories')
        .update({ name: newName })
        .eq('id', testCategory.id)
        .select();
      
      if (updateError) {
        console.error('❌ Update error:', updateError);
        return;
      }
      
      console.log('✅ Category updated:', updateData);
      
      // Test 3: Revert the change
      console.log('🔄 Test 3: Reverting change...');
      const { error: revertError } = await supabase
        .from('service_categories')
        .update({ name: testCategory.name })
        .eq('id', testCategory.id);
      
      if (revertError) {
        console.error('❌ Revert error:', revertError);
      } else {
        console.log('✅ Change reverted successfully');
      }
    } else {
      console.log('⚠️ No categories found to test with');
    }
    
    // Test 4: Storage bucket test
    console.log('📦 Test 4: Testing storage buckets...');
    const { data: thumbnailsList, error: thumbnailsError } = await supabase.storage.from('thumbnails').list();
    if (thumbnailsError) {
      console.error('❌ Thumbnails bucket error:', thumbnailsError);
    } else {
      console.log('✅ Thumbnails bucket accessible:', thumbnailsList);
    }
    
    const { data: categoryList, error: categoryError } = await supabase.storage.from('category').list();
    if (categoryError) {
      console.error('❌ Category bucket error:', categoryError);
    } else {
      console.log('✅ Category bucket accessible:', categoryList);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
testCategoryOperations(); 