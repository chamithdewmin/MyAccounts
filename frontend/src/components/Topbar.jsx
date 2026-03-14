import React, { useState, useEffect } from 'react';
import { Search, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFinance } from '@/contexts/FinanceContext';

// Theme-aware colors
const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    bg: isDark ? "#0a0a0a" : "#ffffff",
    border: isDark ? "#171717" : "#e2e8f0",
    text: isDark ? "#fff" : "#0f172a",
    textMuted: isDark ? "#8b9ab0" : "#64748b",
    inputBg: isDark ? "#111111" : "#f8fafc",
    placeholder: isDark ? "#6b7280" : "#94a3b8",
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

  return (
    <header 
      style={{
        background: c.bg,
        borderBottom: `1px solid ${c.border}`,
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
      }}
    >
      {/* Search */}
      <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
        <Search 
          size={16} 
          style={{ 
            position: "absolute", 
            left: 12, 
            top: "50%", 
            transform: "translateY(-50%)", 
            color: c.placeholder,
            pointerEvents: "none",
          }} 
        />
        <input
          type="text"
          placeholder="Search campaign, customer, etc..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px 10px 38px",
            background: c.inputBg,
            border: `1px solid ${c.border}`,
            borderRadius: 8,
            fontSize: 14,
            color: c.text,
            outline: "none",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => e.target.style.borderColor = "#0e5cff"}
          onBlur={(e) => e.target.style.borderColor = c.border}
        />
      </div>

      {/* User Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: settings?.profileAvatar
              ? `url(${settings.profileAvatar}) center/cover`
              : "linear-gradient(135deg, #0e5cff, #0839a3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            flexShrink: 0,
          }}
        >
          {!settings?.profileAvatar && (user?.name || "U").charAt(0).toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <span style={{ 
            fontSize: 14, 
            fontWeight: 600, 
            color: c.text,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {user?.name || "User"}
          </span>
          <span style={{ 
            fontSize: 12, 
            color: c.textMuted,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {settings?.businessName || "Admin"}
          </span>
        </div>
        <button
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 4,
            color: c.textMuted,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </header>
  );
};

export default Topbar;