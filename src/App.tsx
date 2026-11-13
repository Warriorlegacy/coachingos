// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';

import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { StudentsView } from './views/StudentsView';
import { StudentDetailView } from './views/StudentDetailView';
import { BatchesView } from './views/BatchesView';
import { AttendanceView } from './views/AttendanceView';
import { HomeworkView } from './views/HomeworkView';
import { AssessmentsView } from './views/AssessmentsView';
import { FeesView } from './views/FeesView';
import { NoticesView } from './views/NoticesView';
import { AIAssistantView } from './views/AIAssistantView';
import { AuditLogView } from './views/AuditLogView';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-xs text-zinc-500">
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <AppShell>{children}</AppShell>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginView />} />

          <Route
            path="/"
            element={
              <ProtectedLayout>
                <DashboardView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/students"
            element={
              <ProtectedLayout>
                <StudentsView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/students/:id"
            element={
              <ProtectedLayout>
                <StudentDetailView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/batches"
            element={
              <ProtectedLayout>
                <BatchesView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/attendance"
            element={
              <ProtectedLayout>
                <AttendanceView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/homework"
            element={
              <ProtectedLayout>
                <HomeworkView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/assessments"
            element={
              <ProtectedLayout>
                <AssessmentsView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/fees"
            element={
              <ProtectedLayout>
                <FeesView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/notices"
            element={
              <ProtectedLayout>
                <NoticesView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/ai"
            element={
              <ProtectedLayout>
                <AIAssistantView />
              </ProtectedLayout>
            }
          />

          <Route
            path="/audit"
            element={
              <ProtectedLayout>
                <AuditLogView />
              </ProtectedLayout>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};
