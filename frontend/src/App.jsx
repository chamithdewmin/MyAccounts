import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
// Auth pages — loaded immediately (needed before the app shell)
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Layout from './shared/components/layout/Layout';

// Feature pages — lazy-loaded, each lives in features/<name>/index.jsx
const Income      = lazy(() => import('./features/income'));
const Expenses    = lazy(() => import('./features/expenses'));
const Invoices    = lazy(() => import('./features/invoices'));
const Estimates   = lazy(() => import('./features/estimates'));
const Customers   = lazy(() => import('./features/customers'));
const ReportOverview  = lazy(() => import('./features/reports'));
const ReportIncome    = lazy(() => import('./features/reports/components/ReportIncome'));
const ReportExpense   = lazy(() => import('./features/reports/components/ReportExpense'));
const BalanceSheet    = lazy(() => import('./features/reports/components/BalanceSheet'));
const ReportProfitLoss= lazy(() => import('./features/reports/components/ReportProfitLoss'));
const ReportCashFlow  = lazy(() => import('./features/reports/components/ReportCashFlow'));
const StorageOverview = lazy(() => import('./features/reports/components/StorageOverview'));
const CashFlow     = lazy(() => import('./features/cash-flow'));
const Settings     = lazy(() => import('./features/settings'));
const Profile      = lazy(() => import('./pages/Profile'));
const Users        = lazy(() => import('./features/users'));
const SMS          = lazy(() => import('./features/sms'));
const Reminders    = lazy(() => import('./features/reminders'));
const AIInsights   = lazy(() => import('./features/ai-insights'));
const Dashboard    = lazy(() => import('./features/dashboard'));
const Calendar     = lazy(() => import('./features/calendar'));
const BackupRestore= lazy(() => import('./features/backup'));
const LoginActivity= lazy(() => import('./features/login-activity'));
const FileManager  = lazy(() => import('./features/files'));
const Projects     = lazy(() => import('./features/projects'));
const ProjectBoard = lazy(() => import('./features/projects/components/ProjectBoard'));

// Minimal page skeleton shown while a lazy page chunk loads
const PageSkeleton = () => (
  <div className="page-y space-y-4">
    <div className="h-8 w-48 rounded-lg bg-secondary/60 animate-pulse" />
    <div className="h-4 w-72 rounded bg-secondary/40 animate-pulse" />
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mt-2">
      {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-xl bg-secondary/60 animate-pulse" />)}
    </div>
    <div className="h-64 rounded-xl bg-secondary/40 animate-pulse" />
  </div>
);

const ADMIN_EMAIL = 'logozodev@gmail.com';
const isAdminUser = (u) =>
  String(u?.role || '').toLowerCase() === 'admin' ||
  String(u?.email || '').toLowerCase().trim() === ADMIN_EMAIL;

function App() {
  const { isAuthenticated, loading, user } = useAuth();

  useEffect(() => {
    const updateTheme = () => {
      const theme = localStorage.getItem('theme') || 'dark';
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };
    updateTheme();
    window.addEventListener('theme-change', updateTheme);
    return () => window.removeEventListener('theme-change', updateTheme);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Suspense fallback={<PageSkeleton />}>
    <Routes>
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
      <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
      <Route path="/" element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="ai-insights" element={<AIInsights />} />
        <Route path="income" element={<Income />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="estimates" element={<Estimates />} />
        <Route path="clients" element={<Customers />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/:projectId" element={<ProjectBoard />} />
        <Route path="file-manager" element={<FileManager />} />
        <Route path="cash-flow" element={<CashFlow />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="reports" element={<Navigate to="/reports/overview" replace />} />
        <Route path="reports/overview" element={<ReportOverview />} />
        <Route path="reports/profit-loss" element={<ReportProfitLoss />} />
        <Route path="reports/cash-flow" element={<ReportCashFlow />} />
        <Route path="reports/income" element={<ReportIncome />} />
        <Route path="reports/expense" element={<ReportExpense />} />
        <Route path="reports/balance-sheet" element={<BalanceSheet />} />
        <Route path="reports/storage-overview" element={<StorageOverview />} />
        <Route path="cash-flow" element={<CashFlow />} />
        <Route path="users" element={isAdminUser(user) ? <Users /> : <Navigate to="/ai-insights" replace />} />
        <Route path="sms" element={<SMS />} />
        <Route path="login-activity" element={isAdminUser(user) ? <LoginActivity /> : <Navigate to="/dashboard" replace />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
        <Route path="backup-restore" element={isAdminUser(user) ? <BackupRestore /> : <Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
    </Suspense>
  );
}

export default App;