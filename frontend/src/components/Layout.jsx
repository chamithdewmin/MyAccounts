import React from 'react';
import { Outlet } from 'react-router-dom';
import SidebarNew, { SidebarProvider, useSidebarState } from '@/components/SidebarNew';

const MainContent = () => {
  const { collapsed } = useSidebarState();
  
  // Account for sidebar width + margins (10px left margin + 10px gap)
  const sidebarMargin = collapsed ? 88 : 280;
  
  return (
    <main 
      className="flex-1 transition-[margin] duration-300 px-6 py-2 sm:px-8 sm:py-3 lg:px-10 lg:py-4 min-w-0 max-w-full pt-[env(safe-area-inset-top)]"
      style={{ marginLeft: sidebarMargin }}
    >
      <Outlet />
    </main>
  );
};

const Layout = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <SidebarNew />
        <MainContent />
      </div>
    </SidebarProvider>
  );
};

export default Layout;
