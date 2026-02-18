import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden min-w-0">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 min-w-0 w-full">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-3 sm:p-4 lg:p-6 min-w-0 max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;