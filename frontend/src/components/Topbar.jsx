import React, { useState, useEffect } from 'react';
import { Search, Calendar, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';

const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    bg: isDark ? "#0a0a0a" : "#ffffff",
    border: isDark ? "#171717" : "#e2e8f0",
    text: isDark ? "#fff" : "#0f172a",
    textMuted: isDark ? "#8b9ab0" : "#64748b",
    inputBg: isDark ? "#1e293b" : "#f1f5f9",
  };
};

const Topbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colors, setColors] = useState(getColors);
  const { user } = useAuth();
  const { settings } = useFinance();
  const c = colors;

  useEffect(() => {
    const updateColors = () => setColors(getColors());
    window.addEventListener('theme-change', updateColors);
    return () => window.removeEventListener('theme-change', updateColors);
  }, []);

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <header 
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        background: c.bg,
        borderBottom: `1px solid ${c.border}`,
        borderRadius: 12,
        margin: '10px 10px 0 10px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 20px',
        gap: 16,
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search 
            size={16} 
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: c.textMuted,
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: 14,
              paddingTop: 10,
              paddingBottom: 10,
              background: c.inputBg,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              fontSize: 14,
              color: c.text,
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
            }}
          />
        </div>

        {/* Right side - Date, Icons, Avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Date */}
          <span style={{ 
            color: c.textMuted, 
            fontSize: 13, 
            fontWeight: 500,
            whiteSpace: 'nowrap',
            display: 'none',
          }}
          className="sm:!flex"
          >
            {formatDate()}
          </span>

          {/* Calendar Icon */}
          <button
            style={{
              background: 'transparent',
              border: 'none',
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer',
              color: c.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={20} />
          </button>

          {/* Notification Icon */}
          <button
            style={{
              background: 'transparent',
              border: 'none',
              padding: 8,
              borderRadius: 8,
              cursor: 'pointer',
              color: c.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Bell size={20} />
          </button>

          {/* User Avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: settings?.profileAvatar
                ? `url(${settings.profileAvatar}) center/cover`
                : 'linear-gradient(135deg, #0e5cff, #0839a3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 13,
              fontWeight: 600,
              color: '#fff',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {!settings?.profileAvatar && (user?.name || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;