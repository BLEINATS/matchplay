import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import ArenaSignup from './pages/ArenaSignup';
import Dashboard from './pages/Dashboard';
import ArenaPublic from './pages/ArenaPublic';
import Settings from './pages/Settings';
import Reservations from './pages/Reservations';
import Quadras from './pages/Quadras';
import ClientProfile from './pages/ClientProfile';
import AuthPortal from './pages/AuthPortal';
import Arenas from './pages/Arenas';
import { ThemeProvider } from './context/ThemeContext';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-gray-50 dark:bg-brand-gray-900">
        <div className="w-8 h-8 border-4 border-brand-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/auth" />;
};

const AppRoutes: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthPortal />} />
        <Route path="/cadastro-arena" element={<ArenaSignup />} />
        <Route path="/arenas" element={<Arenas />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reservas"
          element={
            <ProtectedRoute>
              <Reservations />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quadras"
          element={
            <ProtectedRoute>
              <Quadras />
            </ProtectedRoute>
          }
        />
        <Route
          path="/perfil"
          element={
            <ProtectedRoute>
              <ClientProfile />
            </ProtectedRoute>
          }
        />
        <Route path="/:slug" element={<ArenaPublic />} />
      </Routes>
    </Router>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
