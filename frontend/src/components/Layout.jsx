import React from 'react';
import { Outlet } from 'react-router-dom';
import SidebarNew, { SidebarProvider, useSidebarState } from '@/components/SidebarNew';

const MainContent = () => {
  const { collapsed } = useSidebarState();
  
  return (
    <main 
      className="flex-1 transition-[margin] duration-300 px-6 py-2 sm:px-8 sm:py-3 lg:px-10 lg:py-4 min-w-0 max-w-full pt-[env(safe-area-inset-top)]"
      style={{ marginLeft: collapsed ? 68 : 260 }}
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
