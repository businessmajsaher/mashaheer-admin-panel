import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Debug logging for Supabase configuration
console.log('🔧 === SUPABASE CLIENT CONFIGURATION ===');
console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Anon Key:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
console.log('Environment Variables:', {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
});

// Create a mock client for when environment variables are missing
const mockClient = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: { message: 'Missing environment variables' } }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: () => Promise.reject(new Error('Missing environment variables')),
    signOut: () => Promise.reject(new Error('Missing environment variables')),
    getUser: () => Promise.reject(new Error('Missing environment variables'))
  }
};

// Create the actual Supabase client or use mock client
let supabaseClient;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ CRITICAL: Missing Supabase environment variables!');
  console.error('Please check your .env file contains:');
  console.error('VITE_SUPABASE_URL=your_supabase_url');
  console.error('VITE_SUPABASE_ANON_KEY=your_supabase_anon_key');
  console.error('📋 See env-template.txt for instructions');
  
  // Show error message in the UI
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #ff4d4f;
    color: white;
    padding: 16px;
    text-align: center;
    z-index: 9999;
    font-family: Arial, sans-serif;
  `;
  errorDiv.innerHTML = `
    <strong>⚠️ Configuration Error:</strong> Missing Supabase environment variables. 
    Please create a .env file with your Supabase credentials. 
    See env-template.txt for instructions.
  `;
  document.body.appendChild(errorDiv);
  
  supabaseClient = mockClient as any;
} else {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = supabaseClient;

// Test the connection
supabase.auth.getSession().then(({ data, error }) => {
  if (error) {
    console.error('❌ Supabase auth test failed:', error);
  } else {
    console.log('✅ Supabase client initialized successfully');
    console.log('Session data:', data);
  }
}).catch(err => {
  console.error('❌ Supabase client initialization error:', err);
}); 