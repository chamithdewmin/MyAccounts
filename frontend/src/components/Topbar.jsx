import React, { useState } from 'react';
import { Search, Menu, Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeTogglerButton } from '@/components/ThemeTogglerButton';
import { AvatarLabelGroup } from '@/components/ui/avatar';

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 glass-effect border-b border-secondary pt-[env(safe-area-inset-top)]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 min-w-0">
        {/* Left: menu + search */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <SidebarTrigger>
            <Menu className="w-5 h-5 shrink-0" />
          </SidebarTrigger>
          <div className="relative flex-1 min-w-0 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-w-0 pl-9 pr-3 py-2.5 sm:pl-10 sm:pr-4 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Right: theme + notification + user */}
        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <ThemeTogglerButton variant="ghost" size="icon" className="min-w-[44px] min-h-[44px] touch-manipulation" />
          <button type="button" aria-label="Notifications" className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary rounded-lg transition-colors relative touch-manipulation">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 p-2 min-h-[44px] hover:bg-secondary rounded-lg transition-colors touch-manipulation w-full sm:w-auto">
              <AvatarLabelGroup
                size="md"
                title={user?.name || 'User'}
                subtitle={user?.email}
                online
                className="flex-1 sm:flex-initial min-w-0"
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Topbar;