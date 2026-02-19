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
  Sparkles,
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
      { to: '/ai-insights', icon: Sparkles, label: 'AI Insights' },
    ],
  },
  {
    title: 'SALES',
    items: [
      { to: '/income', icon: CreditCard, label: 'Payments' },
      { to: '/invoices', icon: FileText, label: 'Invoices' },
      { to: '/clients', icon: Users, label: 'Clients' },
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
      'flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-2xl transition-all duration-300 ease-sidebar touch-manipulation',
      isActive
        ? 'bg-sidebar-active-bg text-sidebar-active-accent shadow-lg hover:bg-sidebar-active-bg [&>svg]:text-sidebar-active-accent'
        : 'text-secondary-foreground hover:bg-secondary hover:translate-x-0.5 [&>svg]:transition-colors [&>svg]:duration-300 [&>svg]:ease-sidebar'
    );

  return (
    <NavLink
      to={item.to}
      onClick={onClose}
      className={linkClass}
    >
      <item.icon className="w-5 h-5 shrink-0" />
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
          'fixed top-0 left-0 z-50 h-screen w-64 max-w-[85vw] bg-card border-r border-secondary transition-transform duration-300 lg:translate-x-0 pt-[env(safe-area-inset-top)]',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-secondary shrink-0">
            <div className="flex items-center min-w-0">
              <img src={logoSrc} alt="MyAccounts" className="h-8 object-contain" />
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary rounded-md transition-colors touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 p-3 sm:p-4 space-y-0.5 overflow-y-auto overflow-x-hidden min-h-0">
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
                            'w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[44px] rounded-2xl transition-all duration-300 ease-sidebar touch-manipulation',
                            isReportsActive
                              ? 'bg-sidebar-active-bg text-sidebar-active-accent shadow-lg hover:bg-sidebar-active-bg [&_svg]:text-sidebar-active-accent'
                              : 'text-secondary-foreground hover:bg-secondary hover:translate-x-0.5'
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
                                        'flex items-center gap-3 px-3 py-2 rounded-2xl transition-all duration-300 ease-sidebar text-sm',
                                        isActive
                                          ? 'bg-sidebar-active-bg text-sidebar-active-accent [&>svg]:text-sidebar-active-accent'
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
