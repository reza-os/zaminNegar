import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import CaseListPage from './pages/employee/CaseListPage';
import CaseCreatePage from './pages/employee/CaseCreatePage';
import CaseEditPage from './pages/employee/CaseEditPage';
import ImportExcelPage from './pages/employee/ImportExcelPage';
import ActivityLogPage from './pages/admin/ActivityLogPage';

function Protected({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function RootApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route path="/employee/dashboard" element={<Protected><EmployeeDashboard /></Protected>} />
        <Route path="/employee/cases" element={<Protected><CaseListPage /></Protected>} />
        <Route path="/employee/cases/create" element={<Protected><CaseCreatePage /></Protected>} />
        <Route path="/employee/cases/:id/edit" element={<Protected><CaseEditPage /></Protected>} />
        <Route path="/employee/import" element={<Protected><ImportExcelPage /></Protected>} />

        <Route path="/admin/activity-logs" element={<Protected><ActivityLogPage /></Protected>} />
      </Routes>
    </BrowserRouter>
  );
}
