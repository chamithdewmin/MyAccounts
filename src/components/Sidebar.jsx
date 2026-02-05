import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Wallet,
  Receipt,
  FileText,
  Users,
  BarChart3,
  TrendingUp,
  Settings,
  X,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const reportItems = [
  { to: '/reports/overview', label: 'Overview Reports' },
  { to: '/reports/profit-loss', label: 'Profit & Loss' },
  { to: '/reports/cash-flow', label: 'Cash Flow' },
  { to: '/reports/tax', label: 'Tax Reports' },
  { to: '/reports/balance-sheet', label: 'Balance Sheet' },
];

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/income', icon: Wallet, label: 'Income' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/invoices', icon: FileText, label: 'Invoices' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/cash-flow', icon: TrendingUp, label: 'Cash Flow' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const isReportsActive = location.pathname.startsWith('/reports');
  const [reportsExpanded, setReportsExpanded] = useState(isReportsActive);

  useEffect(() => {
    if (isReportsActive) setReportsExpanded(true);
  }, [isReportsActive]);

  return (
    <>
      {/* Mobile overlay */}
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

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-64 bg-card border-r border-secondary transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b border-secondary">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">MyAccounts</span>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden p-1 hover:bg-secondary rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.slice(0, 5).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary text-white shadow-lg hover:bg-primary"
                      : "text-secondary-foreground hover:bg-secondary hover:translate-x-1"
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}

            {/* Reports expandable section */}
            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => setReportsExpanded((p) => !p)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                  isReportsActive
                    ? "bg-primary text-white shadow-lg hover:bg-primary"
                    : "text-secondary-foreground hover:bg-secondary hover:translate-x-1"
                )}
              >
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5" />
                  <span className="font-medium">Reports</span>
                </div>
                <ChevronDown
                  className={cn("w-4 h-4 transition-transform", reportsExpanded && "rotate-180")}
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
                      {reportItems.map((item) => (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => onClose()}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                              isActive
                                ? "bg-primary text-white"
                                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                            )
                          }
                        >
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {navItems.slice(5).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => onClose()}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-primary text-white shadow-lg hover:bg-primary"
                      : "text-secondary-foreground hover:bg-secondary hover:translate-x-1"
                  )
                }
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;