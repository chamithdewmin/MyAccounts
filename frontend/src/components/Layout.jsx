import React from 'react';
import { Outlet } from 'react-router-dom';
import SidebarNew, { SidebarProvider, useSidebarState } from '@/components/SidebarNew';
import Topbar from '@/components/Topbar';

const MainContent = () => {
  const { collapsed, isMobile } = useSidebarState();

  // Desktop: sidebar width + margins (10px left + ~10px gap). Mobile: full width — drawer overlays.
  const sidebarMargin = isMobile ? 0 : collapsed ? 88 : 280;

  return (
    <div
      className="flex-1 flex flex-col transition-[margin] duration-300 min-w-0 max-w-full"
      style={{ marginLeft: sidebarMargin }}
    >
      {/* Fixed Header */}
      <div
        className="fixed top-0 right-0 z-40 transition-[left] duration-300 max-lg:z-[60]"
        style={{ left: sidebarMargin }}
      >
        <Topbar />
      </div>
      {/* Main: tighter padding on small screens; desktop unchanged at lg+ */}
      <main
        className="flex-1 w-full min-w-0 px-3 py-2 sm:px-5 sm:py-3 lg:px-10 lg:py-4"
        style={{ marginTop: 60 }}
      >
        <Outlet />
      </main>
    </div>
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
