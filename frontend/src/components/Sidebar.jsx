import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
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
  ChevronsUpDown,
  CreditCard,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';
import sidebarLogo from '@/assets/side bar logo.png';
import sidebarLogoLight from '@/assets/side-bar-light.png';
import sidebarIcon from '@/assets/icon.png';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AvatarLabelGroup, AvatarWithStatus, AvatarFallback } from '@/components/ui/avatar';

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
  const { setOpen, collapsed } = useSidebar();
  return (
    <SidebarMenuItem>
      <NavLink
        to={item.to}
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          cn(
            'flex w-full items-center gap-3 rounded-2xl px-3 py-3 min-h-[44px] transition-all duration-300 ease-sidebar touch-manipulation',
            collapsed && 'justify-center px-2',
            isActive
              ? 'bg-sidebar-active-bg text-sidebar-active-accent shadow-lg [&>svg]:text-sidebar-active-accent'
              : 'text-secondary-foreground hover:bg-secondary hover:translate-x-0.5'
          )
        }
      >
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="sidebar-label font-medium">{item.label}</span>
      </NavLink>
    </SidebarMenuItem>
  );
}

function ReportsNav() {
  const location = useLocation();
  const { setOpen, collapsed } = useSidebar();
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
            collapsed && 'justify-center px-2',
            isReportsActive
              ? 'bg-sidebar-active-bg text-sidebar-active-accent shadow-lg [&_svg]:text-sidebar-active-accent'
              : 'text-secondary-foreground hover:bg-secondary hover:translate-x-0.5'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span className="sidebar-label font-medium">Reports</span>
          </div>
          <ChevronDown
            className={cn('sidebar-label w-4 h-4 shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        </button>
        <AnimatePresence>
          {expanded && !collapsed && (
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
                          'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-sm transition-all duration-300 ease-sidebar',
                          isActive
                            ? 'bg-sidebar-active-bg text-sidebar-active-accent [&>svg]:text-sidebar-active-accent'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )
                      }
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="sidebar-label">{sub.label}</span>
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { settings } = useFinance();
  const { open, setOpen, collapsed } = useSidebar();
  const canManageUsers = user?.email === ADMIN_EMAIL;
  const logoSrc = settings?.theme === 'light' ? sidebarLogoLight : sidebarLogo;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
          <div className="flex items-center min-w-0 flex-1 justify-center">
            {collapsed ? (
              <img src={sidebarIcon} alt="MyAccounts" className="h-8 w-8 object-contain shrink-0" />
            ) : (
              <img src={logoSrc} alt="MyAccounts" className="h-8 object-contain" />
            )}
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

        <SidebarFooter>
          <div className="rounded-lg border border-secondary bg-secondary/30 px-2 py-2">
            <div className={cn('flex items-center gap-2', collapsed && 'justify-center')}>
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(
                  'flex min-w-0 flex-1 items-center gap-2 rounded-md p-1.5 hover:bg-secondary/50 transition-colors touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  collapsed && 'flex-1 justify-center'
                )}>
                  {collapsed ? (
                    <AvatarWithStatus online className="h-8 w-8">
                      <AvatarFallback>{(user?.name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </AvatarWithStatus>
                  ) : (
                    <>
                      <AvatarLabelGroup
                        size="sm"
                        title={user?.name || 'User'}
                        subtitle={user?.email}
                        online
                        className="min-w-0 flex-1"
                      />
                      <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-56">
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </SidebarFooter>

        <SidebarRail />
      </SidebarRoot>
    </>
  );
}
