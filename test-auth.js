// Test script for authentication debugging
// Run this in the browser console to test auth functionality

const testAuth = async () => {
  console.log('🧪 Testing Authentication...');
  
  try {
    // Test 1: Check Supabase client
    console.log('📋 Test 1: Checking Supabase client...');
    console.log('Supabase URL:', supabase.supabaseUrl);
    console.log('Supabase client initialized:', !!supabase);
    
    // Test 2: Check current session
    console.log('📋 Test 2: Checking current session...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session check failed:', sessionError);
    } else {
      console.log('✅ Session check successful');
      console.log('Session data:', sessionData);
      console.log('Has session:', !!sessionData.session);
      console.log('Has user:', !!sessionData.session?.user);
      console.log('User email:', sessionData.session?.user?.email);
    }
    
    // Test 3: Check current user
    console.log('📋 Test 3: Checking current user...');
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ User check failed:', userError);
    } else {
      console.log('✅ User check successful');
      console.log('User data:', userData);
      console.log('Has user:', !!userData.user);
      console.log('User email:', userData.user?.email);
      console.log('User role:', userData.user?.user_metadata?.role);
    }
    
    // Test 4: Test sign in with test credentials
    console.log('📋 Test 4: Testing sign in...');
    
    // You can modify these test credentials
    const testEmail = 'admin@example.com';
    const testPassword = 'password123';
    
    console.log('Attempting sign in with:', testEmail);
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });
    
    if (signInError) {
      console.error('❌ Sign in failed:', signInError);
      console.log('This is expected if the test credentials are incorrect');
    } else {
      console.log('✅ Sign in successful');
      console.log('Sign in data:', signInData);
      
      // Test sign out
      console.log('📋 Test 5: Testing sign out...');
      const { error: signOutError } = await supabase.auth.signOut();
      
      if (signOutError) {
        console.error('❌ Sign out failed:', signOutError);
      } else {
        console.log('✅ Sign out successful');
      }
    }
    
    // Test 6: Check auth state listener
    console.log('📋 Test 6: Testing auth state listener...');
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state changed:', event, session?.user?.email);
    });
    
    // Clean up listener after 5 seconds
    setTimeout(() => {
      listener?.subscription.unsubscribe();
      console.log('🔔 Auth state listener cleaned up');
    }, 5000);
    
    console.log('🎉 All auth tests completed!');
    
  } catch (error) {
    console.error('❌ Auth test failed:', error);
  }
};

// Run the test
testAuth(); 