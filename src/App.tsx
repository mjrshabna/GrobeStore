/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { SettingsProvider } from './contexts/SettingsContext';
import LandingPage from './pages/LandingPage';
import ProductDetails from './components/ProductDetails';
import AdminDashboard from './components/AdminDashboard';
import CartPage from './pages/CartPage';
import CatalogPage from './pages/CatalogPage';
import LoginPage from './pages/LoginPage';
import BlogPage from './pages/BlogPage';
import BlogPostDetails from './pages/BlogPostDetails';
import PolicyPage from './pages/PolicyPage';
import MaintenancePage from './pages/MaintenancePage';
import ScrollToTop from './components/ScrollToTop';
import PageTransition from './components/PageTransition';
import { useSettings } from './contexts/SettingsContext';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { settings, loading: settingsLoading } = useSettings();
  const { isAdmin, loading: authLoading } = useAuth();
  const location = useLocation();

  if (settingsLoading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Allow admin to bypass maintenance mode
  if (settings.maintenanceMode && !isAdmin && location.pathname !== '/login' && !location.pathname.startsWith('/admin')) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <MaintenanceGuard>
      <AnimatePresence mode="wait">
        <div key={location.pathname}>
          <Routes location={location}>
            <Route path="/" element={<PageTransition><LandingPage /></PageTransition>} />
          <Route path="/catalog" element={<PageTransition><CatalogPage /></PageTransition>} />
          <Route path="/blog" element={<PageTransition><BlogPage /></PageTransition>} />
          <Route path="/blog/:id" element={<PageTransition><BlogPostDetails /></PageTransition>} />
          <Route path="/product" element={<PageTransition><ProductDetails /></PageTransition>} />
          <Route path="/product/:id" element={<PageTransition><ProductDetails /></PageTransition>} />
          <Route path="/cart" element={<PageTransition><CartPage /></PageTransition>} />
          <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
          <Route path="/policy/:id" element={<PageTransition><PolicyPage /></PageTransition>} />
          <Route path="/admin" element={
            <AdminRoute>
              <PageTransition><AdminDashboard /></PageTransition>
            </AdminRoute>
          } />
        </Routes>
        </div>
      </AnimatePresence>
    </MaintenanceGuard>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <CartProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Toaster position="top-center" />
            <AnimatedRoutes />
          </BrowserRouter>
        </CartProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}




