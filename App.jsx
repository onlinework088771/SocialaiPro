import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

import AuthPage from './pages/AuthPage';
import NewDashboard from './pages/NewDashboard';
import Dashboard from './pages/Dashboard';
import History from './pages/History';
import ScheduledPosts from './pages/ScheduledPosts';
import CalendarPage from './pages/CalendarPage';
import MediaLibrary from './pages/MediaLibrary';
import Analytics from './pages/Analytics';
import FacebookCallback from './pages/FacebookCallback';
import AccountsPage from './pages/AccountsPage';

function App() {
  return (
    <AuthProvider>
      <div className="App bg-[#0a0a0a] min-h-screen">
        <Toaster position="top-right" theme="dark" />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route 
              path="/auth/callback" 
              element={
                <ProtectedRoute>
                  <FacebookCallback />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <NewDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/post"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <AccountsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scheduled"
              element={
                <ProtectedRoute>
                  <ScheduledPosts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <CalendarPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/media"
              element={
                <ProtectedRoute>
                  <MediaLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;
