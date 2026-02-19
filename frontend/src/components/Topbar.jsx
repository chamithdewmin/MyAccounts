import React, { useState } from 'react';
import { Search, Menu, Bell } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeTogglerButton } from '@/components/ThemeTogglerButton';
import { useAuth } from '@/contexts/AuthContext';

const Topbar = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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

        {/* Right: user name/email (left-aligned) + theme + notification */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex flex-col items-start text-left min-w-0 max-w-[140px] md:max-w-[180px]">
            <span className="text-sm font-medium text-foreground truncate w-full">{user?.name || 'User'}</span>
            <span className="text-xs text-muted-foreground truncate w-full">{user?.email || ''}</span>
          </div>
          <ThemeTogglerButton variant="ghost" size="icon" className="min-w-[44px] min-h-[44px] touch-manipulation" />
          <button type="button" aria-label="Notifications" className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-secondary rounded-lg transition-colors relative touch-manipulation">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;