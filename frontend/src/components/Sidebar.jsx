import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  FileText,
  Users,
  User,
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
  LayoutDashboard,
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
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarDivider,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AvatarLabelGroup, AvatarWithStatus, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const reportSubItems = [
  { to: '/reports/overview', label: 'Overview Reports' },
  { to: '/reports/profit-loss', label: 'Profit & Loss' },
  { to: '/reports/cash-flow', label: 'Cash Flow' },
  { to: '/reports/tax', label: 'Tax Reports' },
  { to: '/reports/balance-sheet', label: 'Balance Sheet' },
];

const ADMIN_EMAIL = 'logozodev@gmail.com';

/** Nav config with dividers (demo-style). Use href for links, items[] for expandable sections. */
const NAV_ITEMS_WITH_DIVIDERS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'AI Insights', href: '/ai-insights', icon: Sparkles },
  { divider: true },
  { label: 'Payments', href: '/income', icon: CreditCard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Clients', href: '/clients', icon: Users },
  { divider: true },
  { label: 'Expenses', href: '/expenses', icon: Receipt },
  { label: 'Cash Flow', href: '/cash-flow', icon: TrendingUp },
  { label: 'Reports', icon: BarChart3, href: '/reports/overview', items: reportSubItems },
  { divider: true },
  { label: 'Reminders', href: '/reminders', icon: Bell },
  { label: 'Messages', href: '/sms', icon: MessageSquare },
  { divider: true },
  { label: 'Users', href: '/users', icon: UserPlus, adminOnly: true },
  { label: 'Settings', href: '/settings', icon: Settings },
];

function NavItem({ item }) {
  const { setOpen, collapsed } = useSidebar();
  return (
    <SidebarMenuItem>
      <NavLink
        to={item.href}
        onClick={() => setOpen(false)}
        className={({ isActive }) =>
          cn(
            'flex w-full items-center gap-3 rounded-md px-3 py-2.5 min-h-10 transition-[background-color,color] duration-100 ease-linear touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            collapsed && 'justify-center px-2',
            isActive
              ? 'bg-sidebar-active-bg text-sidebar-active-accent [&>svg]:text-sidebar-active-accent'
              : 'text-foreground hover:bg-secondary'
          )
        }
      >
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="sidebar-label font-medium">{item.label}</span>
      </NavLink>
    </SidebarMenuItem>
  );
}

function ExpandableNavItem({ item }) {
  const location = useLocation();
  const { setOpen, collapsed } = useSidebar();
  const basePath = item.href?.replace(/\/[^/]+$/, '') || '';
  const isActive = basePath && location.pathname.startsWith(basePath);
  const [expanded, setExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) setExpanded(true);
  }, [isActive]);

  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => setExpanded((p) => !p)}
          className={cn(
            'flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 min-h-10 transition-[background-color,color] duration-100 ease-linear touch-manipulation text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            collapsed && 'justify-center px-2',
            isActive
              ? 'bg-sidebar-active-bg text-sidebar-active-accent [&_svg]:text-sidebar-active-accent'
              : 'text-foreground hover:bg-secondary'
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Icon className="w-5 h-5 shrink-0" />
            <span className="sidebar-label font-medium">{item.label}</span>
          </div>
          <ChevronDown
            className={cn('sidebar-label w-4 h-4 shrink-0 transition-transform', expanded && 'rotate-180')}
          />
        </button>
        <AnimatePresence>
          {expanded && !collapsed && item.items?.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <SidebarMenuSub>
                {item.items.map((sub) => (
                  <SidebarMenuSubItem key={sub.to}>
                    <NavLink
                      to={sub.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive: subActive }) =>
                        cn(
                          'flex w-full items-center gap-3 rounded-md pl-9 pr-3 py-2 text-sm transition-[background-color,color] duration-100 ease-linear sidebar-label',
                          subActive
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
          <SidebarMenu>
            {NAV_ITEMS_WITH_DIVIDERS.map((entry, index) => {
              if (entry.divider) {
                return <SidebarDivider key={`divider-${index}`} />;
              }
              const item = entry;
              if (item.adminOnly && !canManageUsers) return null;
              if (item.items?.length) {
                return <ExpandableNavItem key={item.href || item.label} item={item} />;
              }
              return <NavItem key={item.href} item={item} />;
            })}
          </SidebarMenu>
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
                      {settings?.profileAvatar && <AvatarImage src={settings.profileAvatar} alt="Profile" />}
                      <AvatarFallback>{(user?.name || 'U').charAt(0).toUpperCase()}</AvatarFallback>
                    </AvatarWithStatus>
                  ) : (
                    <>
                      <AvatarLabelGroup
                        size="sm"
                        src={settings?.profileAvatar}
                        title={user?.name || 'User'}
                        subtitle={user?.email}
                        online
                        className="min-w-0 flex-1"
                      />
                      <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="top" className="w-56 p-2">
                  <div className="px-3 py-2 mb-1 border-b border-border">
                    <p className="text-sm font-semibold text-foreground">My Account</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuItem
                    onClick={() => { setOpen(false); navigate('/profile'); }}
                    className="rounded-md px-3 py-2.5 cursor-pointer focus:bg-secondary flex items-center gap-2"
                  >
                    <User className="w-4 h-4 shrink-0" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-md px-3 py-2.5 cursor-pointer focus:bg-secondary flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
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
