import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { MainLayout } from '@/layouts/MainLayout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Lazy load components
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const Dashboard = lazy(() => import('@/pages/Dashboard/Dashboard'));
const Users = lazy(() => import('@/pages/Users/Users'));
const Influencers = lazy(() => import('@/pages/Influencers/Influencers'));
const Categories = lazy(() => import('@/pages/Categories/Categories'));
const Services = lazy(() => import('@/pages/Services/Services'));
const Reviews = lazy(() => import('@/pages/Reviews/Reviews'));
const Bookings = lazy(() => import('@/pages/Bookings/Bookings'));
const Settings = lazy(() => import('@/pages/Settings/Settings'));
const Platforms = lazy(() => import('@/pages/Platforms'));
const Contracts = lazy(() => import('@/pages/Contracts/Contracts'));
const LegalNotices = lazy(() => import('@/pages/LegalNotices/LegalNotices'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy/PrivacyPolicy'));
const TermsOfService = lazy(() => import('@/pages/TermsOfService/TermsOfService'));
const ContactSupport = lazy(() => import('@/pages/ContactSupport/ContactSupport'));
const HelpSupport = lazy(() => import('@/pages/HelpSupport/HelpSupport'));
const Discounts = lazy(() => import('@/pages/Discounts/Discounts'));
const DiscountAnalytics = lazy(() => import('@/pages/Discounts/Analytics'));
const CashOut = lazy(() => import('@/pages/CashOut/CashOut'));
const SupabaseConnectionTest = lazy(() => import('@/pages/SupabaseConnectionTest'));
const AuthRouter = lazy(() => import('@/components/AuthRouter'));

// Password Reset Callback with console logging
const PasswordResetCallback = lazy(() => {
  console.log('🔍 Loading PasswordResetCallback component...');
  return import('@/pages/PasswordResetCallback');
});

export default function App() {
  console.log('🚀 App component mounted with Supabase authentication');
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '18px',
                color: '#666'
              }}>
                <div>
                  <div>Loading application...</div>
                  <div style={{ fontSize: '14px', marginTop: '10px' }}>
                    Using Supabase authentication
                  </div>
                </div>
              </div>
            }>
              <Routes>
                {/* Test routes for debugging */}
                <Route path="/test" element={
                  <div style={{padding: '20px', textAlign: 'center'}}>
                    <h1>✅ Test Route Working!</h1>
                    <p>If you can see this, routing is working.</p>
                    <p>Current path: {window.location.pathname}</p>
                    <p>Full URL: {window.location.href}</p>
                    <button onClick={() => window.location.href = '/login'}>
                      Go to Login
                    </button>
                  </div>
                } />
                <Route path="/debug" element={
                  <div style={{padding: '20px', textAlign: 'center'}}>
                    <h1>🔍 Debug Information</h1>
                    <div style={{textAlign: 'left', maxWidth: '600px', margin: '0 auto'}}>
                      <h3>Environment Variables:</h3>
                      <p>VITE_SUPABASE_URL: {import.meta.env.VITE_SUPABASE_URL || 'Not set'}</p>
                      <p>VITE_SUPABASE_ANON_KEY: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</p>
                      <h3>Current Location:</h3>
                      <p>Path: {window.location.pathname}</p>
                      <p>Full URL: {window.location.href}</p>
                      <h3>Authentication:</h3>
                      <p>Mode: Supabase Authentication</p>
                      <h3>Actions:</h3>
                      <button onClick={() => window.location.href = '/login'} style={{margin: '5px'}}>
                        Go to Login
                      </button>
                      <button onClick={() => window.location.href = '/test'} style={{margin: '5px'}}>
                        Go to Test
                      </button>
                      <button onClick={() => window.location.reload()} style={{margin: '5px'}}>
                        Reload Page
                      </button>
                    </div>
                  </div>
                } />
                
                {/* Authentication routes */}
                <Route path="/auth" element={<AuthRouter />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                
                {/* Password reset callback */}
                <Route path="/password-reset-callback" element={<PasswordResetCallback />} />
                <Route path="/password-reset-callback/*" element={<PasswordResetCallback />} />
                
                {/* Protected routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/users" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Users />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/influencers" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Influencers />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/categories" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Categories />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/services" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Services />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/contracts" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Contracts />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                
                <Route path="/reviews" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Reviews />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/bookings" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Bookings />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Settings />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/platforms" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Platforms />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/discounts" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Discounts />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/discounts/analytics" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <DiscountAnalytics />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/cash-out" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CashOut />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                {/* Legal and Support routes */}
                <Route path="/legal-notices" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <LegalNotices />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/privacy-policy" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <PrivacyPolicy />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/terms-of-service" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <TermsOfService />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/contact-support" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ContactSupport />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/help-support" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <HelpSupport />
                    </MainLayout>
                  </ProtectedRoute>
                } />
                
                {/* Supabase Connection Test */}
                <Route path="/supabase-test" element={
                  <ProtectedRoute>
                    <MainLayout>
                      <SupabaseConnectionTest />
                    </MainLayout>
                  </ProtectedRoute>
                } />

                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                
                {/* Catch-all route for SPA routing */}
                <Route path="*" element={<Navigate to="/login" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
