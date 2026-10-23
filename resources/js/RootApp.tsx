import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeActivityPage from './pages/employee/EmployeeActivityPage';
import CaseListPage from './pages/employee/CaseListPage';
import CaseCreatePage from './pages/employee/CaseCreatePage';
import CaseEditPage from './pages/employee/CaseEditPage';
import ImportBatchPage from './pages/employee/ImportBatchPage';
import ImportExcelPage from './pages/employee/ImportExcelPage';
import AdminManagersPage from './pages/admin/AdminManagersPage';
import ManagerBranchesPage from './pages/manager/ManagerBranchesPage';
import ManagerEmployeesPage from './pages/manager/ManagerEmployeesPage';
import ManagerBranchPage from './pages/manager/ManagerBranchPage';
import ManagerDashboardPage from './pages/manager/ManagerDashboardPage';
import ManagerFinancePage from './pages/manager/ManagerFinancePage';
import { api } from './api/client';
import { cachedUser, homeFor, type Role, type SessionUser } from './lib/roles';

function Protected({ children, allowed }: { children: ReactNode; allowed: Role[] }) {
  const [state, setState] = useState<'loading' | 'allowed' | 'forbidden' | 'error'>('loading');
  const [verifiedRole, setVerifiedRole] = useState<Role | null>(null);
  useEffect(() => {
    if (!localStorage.getItem('token')) { setState('forbidden'); return; }
    let active = true;
    api.get<{ user: SessionUser }>('/auth/me').then(({ data }) => {
      if (!active) return;
      localStorage.setItem('user', JSON.stringify(data.user));
      setVerifiedRole(data.user.role);
      setState(allowed.includes(data.user.role) ? 'allowed' : 'forbidden');
    }).catch((error: unknown) => {
      if (!active) return;
      const status = (error as {response?: {status?: number}})?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setState('forbidden');
      } else {
        setState('error');
      }
    });
    return () => { active = false; };
    // `allowed` uses constant arrays in route components, guard by role signature.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed.join(',')]);

  if (state === 'loading') return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">در حال بررسی دسترسی...</div>;
  if (state === 'error') return <div className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center text-sm text-red-700">امکان بررسی دسترسی با سرور وجود ندارد. اتصال را بررسی و صفحه را دوباره بارگذاری کنید.</div>;
  if (state === 'forbidden') {
    if (!localStorage.getItem('token')) return <Navigate to="/login" replace />;
    const role = verifiedRole || cachedUser()?.role;
    return <Navigate to={homeFor(role)} replace />;
  }
  return <>{children}</>;
}

const Staff = ({ children }: { children: ReactNode }) => <Protected allowed={['employee', 'surveyor']}>{children}</Protected>;
const Admin = ({ children }: { children: ReactNode }) => <Protected allowed={['admin']}>{children}</Protected>;
const Manager = ({ children }: { children: ReactNode }) => <Protected allowed={['manager']}>{children}</Protected>;

export default function RootApp() {
  return <BrowserRouter>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<Navigate to="/admin/managers" replace />} />
      <Route path="/admin/managers" element={<Admin><AdminManagersPage/></Admin>} />
      <Route path="/manager" element={<Navigate to="/manager/dashboard" replace />} />
      <Route path="/manager/dashboard" element={<Manager><ManagerDashboardPage/></Manager>} />
      <Route path="/manager/finance" element={<Manager><ManagerFinancePage/></Manager>} />
      <Route path="/manager/branches" element={<Manager><ManagerBranchesPage/></Manager>} />
      <Route path="/manager/branches/:id" element={<Manager><ManagerBranchPage/></Manager>} />
      <Route path="/manager/employees" element={<Manager><ManagerEmployeesPage/></Manager>} />
      <Route path="/employee/dashboard" element={<Staff><EmployeeDashboard/></Staff>} />
      <Route path="/employee/activities" element={<Staff><EmployeeActivityPage/></Staff>} />
      <Route path="/employee/cases" element={<Staff><CaseListPage/></Staff>} />
      <Route path="/employee/cases/create" element={<Staff><CaseCreatePage/></Staff>} />
      <Route path="/employee/cases/:id/edit" element={<Staff><CaseEditPage/></Staff>} />
      <Route path="/employee/import" element={<Staff><ImportExcelPage/></Staff>} />
      <Route path="/employee/imports/:id" element={<Staff><ImportBatchPage/></Staff>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </BrowserRouter>;
}
