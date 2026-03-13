import React from 'react';
import { Outlet } from 'react-router-dom';
import SidebarNew from '@/components/SidebarNew';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarNew />
      <main className="flex-1 lg:ml-[260px] transition-[margin] duration-300 px-6 py-2 sm:px-8 sm:py-3 lg:px-10 lg:py-4 min-w-0 max-w-full pt-[env(safe-area-inset-top)]">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
