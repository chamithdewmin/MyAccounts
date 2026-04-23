import React, { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
// Auth pages — loaded immediately (needed before the app shell)
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import Layout from './components/Layout';

// All other pages are lazy-loaded — only downloaded when the user navigates there
const POS = lazy(() => import('./pages/POS'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Orders = lazy(() => import('./pages/Orders'));
const Estimates = lazy(() => import('./pages/Estimates'));
const Customers = lazy(() => import('./pages/Customers'));
const ReportOverview = lazy(() => import('./pages/reports/ReportOverview'));
const ReportIncome = lazy(() => import('./pages/reports/ReportIncome'));
const ReportExpense = lazy(() => import('./pages/reports/ReportExpense'));
const BalanceSheet = lazy(() => import('./pages/reports/BalanceSheet'));
const ReportProfitLoss = lazy(() => import('./pages/reports/ReportProfitLoss'));
const ReportCashFlow = lazy(() => import('./pages/reports/ReportCashFlow'));
const StorageOverview = lazy(() => import('./pages/reports/StorageOverview'));
const CashFlow = lazy(() => import('./pages/CashFlow'));
const Settings = lazy(() => import('./pages/Settings'));
const Profile = lazy(() => import('./pages/Profile'));
const Users = lazy(() => import('./pages/Users'));
const SMS = lazy(() => import('./pages/SMS'));
const Reminders = lazy(() => import('./pages/Reminders'));
const AIInsights = lazy(() => import('./pages/AIInsights'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Calendar = lazy(() => import('./pages/Calendar'));
const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const LoginActivity = lazy(() => import('./pages/LoginActivity'));
const FileManager = lazy(() => import('./pages/FileManager'));
const Projects = lazy(() => import('./pages/Projects'));
const ProjectBoard = lazy(() => import('./pages/ProjectBoard'));

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
        <Route path="income" element={<POS />} />
        <Route path="expenses" element={<Inventory />} />
        <Route path="invoices" element={<Orders />} />
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