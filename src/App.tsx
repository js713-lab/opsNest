import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';
import ProjectsPage from './pages/dashboard/ProjectsPage';
import ProjectDetailPage from './pages/dashboard/ProjectDetailPage';
import SDLCPage from './pages/dashboard/SDLCPage';
import TestingPage from './pages/dashboard/TestingPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import IntegrationsPage from './pages/dashboard/IntegrationsPage';
import GenericPage from './pages/dashboard/GenericPage';
import GitHubCallbackPage from './pages/oauth/GitHubCallbackPage';
import MarketplacePage from './pages/dashboard/MarketplacePage';
import MarketplaceCommunityPage from './pages/MarketplaceCommunityPage';
import ProfilePage from './pages/dashboard/ProfilePage';
import MessagesPage from './pages/dashboard/MessagesPage';
import RepositoriesPage from './pages/dashboard/RepositoriesPage';
import { Toaster } from 'sonner';

function App() {
  return (
    <Router>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketplace" element={<MarketplaceCommunityPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/oauth/github/callback" element={<GitHubCallbackPage />} />
        
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetailPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="repositories" element={<RepositoriesPage />} />
          <Route path="pipeline" element={<SDLCPage />} />
          <Route path="testing" element={<TestingPage />} />
          <Route path="environments" element={<GenericPage title="Environments" />} />
          <Route path="scripts" element={<GenericPage title="Scripts" />} />
          <Route path="indexing" element={<GenericPage title="Indexing" />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<GenericPage title="Settings" />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
