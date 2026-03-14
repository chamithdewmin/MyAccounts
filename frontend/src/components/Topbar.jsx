import React, { useState, useEffect } from 'react';
import { Search, Calendar, Bell } from 'lucide-react';

const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    border: isDark ? "#171717" : "#e2e8f0",
    text: isDark ? "#fff" : "#0f172a",
    textMuted: isDark ? "#8b9ab0" : "#64748b",
    inputBg: isDark ? "#1e293b" : "#f1f5f9",
    cardBg: isDark ? "#0a0a0a" : "#ffffff",
  };
};

const Topbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colors, setColors] = useState(getColors);
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
        padding: '20px 20px 12px 20px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
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

        {/* Right side - Date, Icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Date */}
          <div 
            style={{ 
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              padding: '8px 14px',
              display: 'none',
            }}
            className="sm:!flex"
          >
            <span style={{ 
              color: c.textMuted, 
              fontSize: 13, 
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}>
              {formatDate()}
            </span>
          </div>

          {/* Calendar Icon */}
          <button
            style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              padding: 10,
              cursor: 'pointer',
              color: c.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Calendar size={18} />
          </button>

          {/* Notification Icon */}
          <button
            style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 10,
              padding: 10,
              cursor: 'pointer',
              color: c.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <Bell size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Topbar;