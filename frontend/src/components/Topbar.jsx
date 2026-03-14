import React, { useState } from 'react';
import { Search } from 'lucide-react';

const Topbar = () => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-30 glass-effect border-b border-border pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-2 sm:gap-4 px-3 py-2 sm:px-4 sm:py-3 lg:px-6 min-w-0">
        {/* Mobile menu button space - sidebar has its own toggle */}
        <div className="w-10 lg:hidden" />
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-w-0 pl-9 pr-3 py-2.5 sm:pl-10 sm:pr-4 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
        </div>
      </div>
    </header>
  );
};

export default Topbar;