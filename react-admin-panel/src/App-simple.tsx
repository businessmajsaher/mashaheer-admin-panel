import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Simple test component
const SimpleTest = () => (
  <div style={{ 
    padding: '20px', 
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif'
  }}>
    <h1>✅ React App is Working!</h1>
    <p>This is a simple test to verify the app loads without authentication.</p>
    <div style={{ marginTop: '20px' }}>
      <h3>Environment Check:</h3>
      <p>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</p>
      <p>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
    </div>
    <div style={{ marginTop: '20px' }}>
      <button 
        onClick={() => window.location.href = '/login'}
        style={{ padding: '10px 20px', margin: '5px' }}
      >
        Try Login Page
      </button>
      <button 
        onClick={() => window.location.reload()}
        style={{ padding: '10px 20px', margin: '5px' }}
      >
        Reload
      </button>
    </div>
  </div>
);

export default function App() {
  console.log('🚀 Simple App component mounted');
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SimpleTest />} />
        <Route path="/test" element={<SimpleTest />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
