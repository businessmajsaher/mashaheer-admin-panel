import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MainLayout } from '@/layouts/MainLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const Dashboard = lazy(() => import('@/pages/Dashboard/Dashboard'));
const Users = lazy(() => import('@/pages/Users/Users'));
const Influencers = lazy(() => import('@/pages/Influencers/Influencers'));
const Categories = lazy(() => import('@/pages/Categories/Categories'));
const Services = lazy(() => import('@/pages/Services/Services'));
const Wallets = lazy(() => import('@/pages/Wallets/Wallets'));
const Reviews = lazy(() => import('@/pages/Reviews/Reviews'));
const Bookings = lazy(() => import('@/pages/Bookings/Bookings'));
const Settings = lazy(() => import('@/pages/Settings/Settings'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));
const Platforms = lazy(() => import('@/pages/Platforms'));
const PasswordResetCallback = lazy(() => import('@/pages/PasswordResetCallback').then(module => {
  console.log('🔍 PasswordResetCallback module loaded:', module);
  return module;
}));

export default function App() {
  console.log('🔍 App component mounted, routes configured');
  
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <Suspense fallback={<div>Loading...</div>}>
              <Routes>
              <Route path="/test" element={<div style={{padding: '20px', textAlign: 'center'}}><h1>Test Route Working!</h1><p>If you can see this, routing is working.</p></div>} />
              <Route path="/routing-test" element={<div style={{padding: '20px', textAlign: 'center'}}><h1>Routing Test</h1><p>Route: {window.location.pathname}</p><p>Full URL: {window.location.href}</p></div>} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Navigate to="/dashboard" replace />
                  </MainLayout>
                </ProtectedRoute>
              } />
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
              <Route path="/platforms" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Platforms />
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
              <Route path="/wallets" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Wallets />
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
              <Route path="/password-reset-callback" element={<PasswordResetCallback />} />
              <Route path="/password-reset-callback/*" element={<PasswordResetCallback />} />
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
