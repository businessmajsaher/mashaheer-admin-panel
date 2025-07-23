import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { MainLayout } from '@/layouts/MainLayout';

const Dashboard = lazy(() => import('@/pages/Dashboard/Dashboard'));
const Users = lazy(() => import('@/pages/Users/Users'));
const Influencers = lazy(() => import('@/pages/Influencers/Influencers'));
const Services = lazy(() => import('@/pages/Services/Services'));
const Orders = lazy(() => import('@/pages/Orders/Orders'));
const Wallets = lazy(() => import('@/pages/Wallets/Wallets'));
const Reviews = lazy(() => import('@/pages/Reviews/Reviews'));
const Bookings = lazy(() => import('@/pages/Bookings/Bookings'));
const Settings = lazy(() => import('@/pages/Settings/Settings'));
const Login = lazy(() => import('@/pages/Login'));
const Signup = lazy(() => import('@/pages/Signup'));

function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user /*|| user.role !== 'admin'*/) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/users" element={<Users />} />
                  <Route path="/influencers" element={<Influencers />} />
                  <Route path="/services" element={<Services />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/wallets" element={<Wallets />} />
                  <Route path="/reviews" element={<Reviews />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Route>
              </Route>
            </Routes>
          </Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
