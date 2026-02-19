import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import Sidebar from '@/components/Sidebar';

const Layout = () => {
  return (
    <SidebarProvider defaultCollapsed={false}>
      <Sidebar />
      <SidebarInset>
        <main className="p-3 sm:p-4 lg:p-6 min-w-0 max-w-full flex-1 pt-[env(safe-area-inset-top)]">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
