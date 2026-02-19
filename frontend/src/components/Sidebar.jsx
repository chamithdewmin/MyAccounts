import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
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
import {
  Sidebar as SidebarRoot,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';

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
    title: null,
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

function NavItem({ item }) {
  const { setOpen } = useSidebar();
  return (
    <SidebarMenuItem>
      <NavLink
        to={item.to}
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          cn(
            'flex w-full items-center gap-3 rounded-2xl px-3 py-3 min-h-[44px] transition-all duration-300 ease-sidebar touch-manipulation',
            isActive
              ? 'bg-sidebar-active-bg text-sidebar-active-accent shadow-lg [&>svg]:text-sidebar-active-accent'
              : 'text-secondary-foreground hover:bg-secondary hover:translate-x-0.5',
            'sidebar-label'
          )
        }
      >
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="font-medium">{item.label}</span>
      </NavLink>
    </SidebarMenuItem>
  );
}

function ReportsNav() {
  const location = useLocation();
  const { setOpen } = useSidebar();
  const isReportsActive = location.pathname.startsWith('/reports');
  const [expanded, setExpanded] = useState(isReportsActive);

  useEffect(() => {
    if (isReportsActive) setExpanded(true);
  }, [isReportsActive]);

  return (
    <SidebarMenuItem>
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 min-h-[44px] transition-all duration-300 ease-sidebar touch-manipulation text-left',
            isReportsActive
              ? 'bg-sidebar-active-bg text-sidebar-active-accent shadow-lg [&_svg]:text-sidebar-active-accent'
              : 'text-secondary-foreground hover:bg-secondary hover:translate-x-0.5'
          )}
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span className="sidebar-label font-medium">Reports</span>
          </div>
          <ChevronDown
            className={cn('w-4 h-4 shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SidebarMenuSub>
                {reportItems.map((sub) => (
                  <SidebarMenuSubItem key={sub.to}>
                    <NavLink
                      to={sub.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all duration-300 ease-sidebar sidebar-label',
                          isActive
                            ? 'bg-sidebar-active-bg text-sidebar-active-accent [&>svg]:text-sidebar-active-accent'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )
                      }
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span>{sub.label}</span>
                    </NavLink>
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SidebarMenuItem>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const { settings } = useFinance();
  const { open, setOpen } = useSidebar();
  const canManageUsers = user?.email === ADMIN_EMAIL;
  const logoSrc = settings?.theme === 'light' ? sidebarLogoLight : sidebarLogo;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            aria-hidden
          />
        )}
      </AnimatePresence>

      <SidebarRoot collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center min-w-0 flex-1">
            <img src={logoSrc} alt="MyAccounts" className="h-8 object-contain" />
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="lg:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary rounded-md transition-colors touch-manipulation"
          >
            <X className="w-5 h-5" />
          </button>
        </SidebarHeader>

        <SidebarContent>
          {SIDEBAR_SECTIONS.map((section) => (
            <SidebarGroup key={section.title || 'main'}>
              {section.title && (
                <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
              )}
              <SidebarMenu>
                {section.items.map((item) => {
                  if (item.adminOnly && !canManageUsers) return null;
                  if (item.type === 'reports') {
                    return <ReportsNav key="reports" />;
                  }
                  return <NavItem key={item.to} item={item} />;
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter />

        <SidebarRail />
      </SidebarRoot>
    </>
  );
}
