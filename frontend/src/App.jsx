import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { SubmitClaim } from './pages/SubmitClaim';
import { ClaimDetails } from './pages/ClaimDetails';
import { PolicyManagement } from './pages/PolicyManagement';
import { RoleRequestsPage } from './pages/RoleRequestsPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const MainLayout = ({ children }) => {
  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        {children}
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/submit"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <SubmitClaim />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/claims/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ClaimDetails />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/policies"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <PolicyManagement />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/role-requests"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <RoleRequestsPage />
                </MainLayout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}


export default App;
