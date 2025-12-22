import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { STORAGE_KEYS } from '@/config/constants';

// Layout Components
import { Header } from '@/components/Layout/Header';
import { Sidebar } from '@/components/Layout/Sidebar';

// Auth Pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { VerifyEmailPage } from '@/pages/auth/Verifyemailpage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

// Dashboard
import { DashboardPage } from '@/pages/dashboard/DashboardPage';

// Products Pages
import { ItemsPage } from '@/pages/products/ItemsPage';
import { ItemVariantsPage } from '@/pages/products/ItemVariantsPage';
import { CategoriesPage } from '@/pages/products/CategoriesPage';

// Inventory Pages
import { LotsPage } from '@/pages/inventory/LotsPage';
import { SerialsPage } from '@/pages/inventory/SerialsPage';
import { InventoryPage } from '@/pages/inventory/InventoryPage';

// Locations Pages
import { SitesPage } from '@/pages/locations/SitesPage';
import { WarehousesPage } from '@/pages/locations/WarehousesPage';
import { LocationsPage } from '@/pages/locations/LocationsPage';

// Movements Pages
import MovementsPage from '@/pages/movements/MovementsPage';
// import { MovementLinesPage } from '@/pages/movements/MovementLinesPage';
// import { MovementTasksPage } from '@/pages/movements/MovementTasksPage';


// Quality Pages
import { QualityControlsPage } from '@/pages/quality/QualityControlPage';
import { QualityAttachmentsPage } from './pages/quality/QualityAttachmentsPage';
import { QuarantinesPage } from './pages/quality/QuarantinesPage';

// Alerts Pages
import { AlertsPage } from '@/pages/Alerts/AlertsPage';

// Profile Pages
import { ProfilePage } from '@/pages/profile';

// Protected Route Component - FIXED VERSION
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // FIX: Check for 'access_token' instead of 'token'
  const isAuthenticated = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Main Layout Component with Header and Sidebar
const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex min-h-screen bg-neutral-50 dark:bg-neutral-900">
      <Header />
      <Sidebar />
      <main className="flex-1 lg:ml-64 mt-16 p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <MainLayout>
                <DashboardPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Products Routes */}
        <Route
          path="/products/items"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ItemsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/products/variants"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ItemVariantsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/products/categories"
          element={
            <ProtectedRoute>
              <MainLayout>
                <CategoriesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Inventory Routes */}
        <Route
          path="/inventory/lots"
          element={
            <ProtectedRoute>
              <MainLayout>
                <LotsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/inventory/serials"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SerialsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
 <Route
          path="/inventory/Inventories"
          element={
            <ProtectedRoute>
              <MainLayout>
                <InventoryPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* Locations Routes */}
        <Route
          path="/locations/sites"
          element={
            <ProtectedRoute>
              <MainLayout>
                <SitesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/locations/warehouses"
          element={
            <ProtectedRoute>
              <MainLayout>
                <WarehousesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/locations/locations"
          element={
            <ProtectedRoute>
              <MainLayout>
                <LocationsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Movements Routes */}
        <Route
          path="/movements"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MovementsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        {/* <Route
     path="/movements/lines"
     element={
       <ProtectedRoute>
         <MainLayout>
           <MovementLinesPage />
         </MainLayout>
       </ProtectedRoute>
     }
   />

   <Route
     path="/movements/tasks"
     element={
       <ProtectedRoute>
         <MainLayout>
           <MovementTasksPage />
         </MainLayout>
       </ProtectedRoute>
     }
   /> */}

        {/* Quality Routes */}
        <Route
          path="/quality/controls"
          element={
            <ProtectedRoute>
              <MainLayout>
                <QualityControlsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/attachments"
          element={
            <ProtectedRoute>
              <MainLayout>
                <QualityAttachmentsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/quality/quarantines"
          element={
            <ProtectedRoute>
              <MainLayout>
                <QuarantinesPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Alerts Routes */}
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <MainLayout>
                <AlertsPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Profile Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProfilePage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
}

export default App;