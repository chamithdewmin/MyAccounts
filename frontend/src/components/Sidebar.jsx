import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileText,
  Users,
  UserPlus,
  MessageSquare,
  Bell,
  BarChart3,
  TrendingUp,
  Settings,
  X,
  ChevronDown,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import sidebarLogo from '@/assets/side bar logo.png';
import sidebarLogoLight from '@/assets/side-bar-light.png';

const reportItems = [
  { to: '/reports/overview', label: 'Overview Reports' },
  { to: '/reports/profit-loss', label: 'Profit & Loss' },
  { to: '/reports/cash-flow', label: 'Cash Flow' },
  { to: '/reports/tax', label: 'Tax Reports' },
  { to: '/reports/balance-sheet', label: 'Balance Sheet' },
];

const ADMIN_EMAIL = 'logozodev@gmail.com';

const SIDEBAR_SECTIONS = [
  {
    title: null, // Dashboard - no section
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    title: 'SALES',
    items: [
      { to: '/clients', icon: Users, label: 'Clients' },
      { to: '/invoices', icon: FileText, label: 'Invoices' },
      { to: '/income', icon: CreditCard, label: 'Payments' },
    ],
  },
  {
    title: 'FINANCE',
    items: [
      { to: '/expenses', icon: Receipt, label: 'Expenses' },
      { to: '/cash-flow', icon: TrendingUp, label: 'Cash Flow' },
      { type: 'reports', icon: BarChart3, label: 'Reports', children: reportItems },
    ],
  },
  {
    title: 'COMMUNICATION',
    items: [
      { to: '/reminders', icon: Bell, label: 'Reminders' },
      { to: '/sms', icon: MessageSquare, label: 'Messages' },
    ],
  },
  {
    title: 'ADMINISTRATION',
    items: [
      { to: '/users', icon: UserPlus, label: 'Users', adminOnly: true },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

const SectionHeader = ({ title }) => (
  <div className="px-4 py-2 mt-2 first:mt-0">
    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </span>
  </div>
);

const NavItem = ({ item, onClose }) => {
  const linkClass = ({ isActive }) =>
    cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
      isActive
        ? 'bg-primary text-white shadow-lg hover:bg-primary'
        : 'text-secondary-foreground hover:bg-secondary hover:translate-x-1'
    );

  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={linkClass}
    >
      <item.icon className="w-5 h-5" />
      <span className="font-medium">{item.label}</span>
    </NavLink>
  );
};

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user } = useAuth();
  const { settings } = useFinance();
  const canManageUsers = user?.email === ADMIN_EMAIL;
  const isReportsActive = location.pathname.startsWith('/reports');
  const [reportsExpanded, setReportsExpanded] = useState(isReportsActive);
  const logoSrc = settings?.theme === 'light' ? sidebarLogoLight : sidebarLogo;

  useEffect(() => {
    if (isReportsActive) setReportsExpanded(true);
  }, [isReportsActive]);

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-secondary transition-transform duration-300 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-secondary">
            <div className="flex items-center">
              <img src={logoSrc} alt="MyAccounts" className="h-8 object-contain" />
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-secondary rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-0.5 overflow-y-auto">
            {SIDEBAR_SECTIONS.map((section) => (
              <div key={section.title || 'main'} className="space-y-0.5">
                {section.title && <SectionHeader title={section.title} />}
                {section.items.map((item) => {
                  if (item.adminOnly && !canManageUsers) return null;
                  if (item.type === 'reports') {
                    return (
                      <div key="reports" className="space-y-0.5">
                        <button
                          type="button"
                          onClick={() => setReportsExpanded((p) => !p)}
                          className={cn(
                            'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                            isReportsActive
                              ? 'bg-primary text-white shadow-lg hover:bg-primary'
                              : 'text-secondary-foreground hover:bg-secondary hover:translate-x-1'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                          </div>
                          <ChevronDown
                            className={cn('w-4 h-4 transition-transform', reportsExpanded && 'rotate-180')}
                          />
                        </button>
                        <AnimatePresence>
                          {reportsExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-4 ml-4 border-l border-secondary space-y-0.5">
                                {item.children.map((sub) => (
                                  <NavLink
                                    key={sub.to}
                                    to={sub.to}
                                    onClick={onClose}
                                    className={({ isActive }) =>
                                      cn(
                                        'flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm',
                                        isActive
                                          ? 'bg-primary text-white'
                                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                      )
                                    }
                                  >
                                    <FileText className="w-4 h-4 flex-shrink-0" />
                                    <span>{sub.label}</span>
                                  </NavLink>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }
                  return <NavItem key={item.to} item={item} onClose={onClose} />;
                })}
              </div>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
