import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import LandingPage from './pages/LandingPage';
import ReceptionistView from './pages/ReceptionistView';
import PatientView from './pages/PatientView';
import Login from './pages/Login';
import KioskView from './pages/KioskView';
import JoinView from './pages/JoinView';
import AnalyticsView from './pages/AnalyticsView';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const passcode = localStorage.getItem('clinic-auth-passcode');
  if (!passcode) {
    localStorage.setItem('redirect-after-login', window.location.pathname);
    return <Navigate to="/login" replace />;
  }
  return children;
};

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/kiosk" element={<KioskView />} />
        <Route path="/join" element={<JoinView />} />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <AnalyticsView />
          </ProtectedRoute>
        } />
        <Route path="/receptionist" element={
          <ProtectedRoute>
            <ReceptionistView />
          </ProtectedRoute>
        } />
        <Route path="/patient" element={<PatientView />} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-canvas-soft font-sans">
        <AnimatedRoutes />
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  );
}

export default App;
