import { useState, useEffect, createContext, useContext } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import sidebarIcon from "@/assets/icon.png";
import {
  Receipt,
  FileText,
  Users,
  User,
  UserPlus,
  MessageSquare,
  Bell,
  BarChart3,
  TrendingUp,
  Settings,
  CreditCard,
  Sparkles,
  LogOut,
  LayoutDashboard,
  Calendar,
  ChevronDown,
  ChevronsUpDown,
  Menu,
  X,
  Database,
  Cog,
  HardDrive,
} from "lucide-react";

// Theme-aware colors
const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    bg: isDark ? "#0a0a0a" : "#ffffff",
    border: isDark ? "#171717" : "#e2e8f0",
    text: isDark ? "#fff" : "#0f172a",
    textMuted: isDark ? "#8b9ab0" : "#64748b",
    textLabel: isDark ? "#6b7280" : "#64748b",
    hoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    activeBg: isDark ? "rgba(14,92,255,0.15)" : "rgba(14,92,255,0.1)",
    activeAccent: "#0e5cff",
    divider: isDark ? "#171717" : "#e2e8f0",
  };
};

// Sidebar context to share collapsed state
const SidebarContext = createContext({ collapsed: false, setCollapsed: () => {}, colors: getColors() });
export const useSidebarState = () => useContext(SidebarContext);

const ADMIN_EMAIL = "logozodev@gmail.com";

const reportSubItems = [
  { to: "/reports/overview", label: "Overview Reports" },
  { to: "/reports/profit-loss", label: "Profit & Loss" },
  { to: "/reports/cash-flow", label: "Cash Flow" },
  { to: "/reports/tax", label: "Tax Reports" },
  { to: "/reports/balance-sheet", label: "Balance Sheet" },
];

const settingsSubItems = [
  { to: "/users", label: "Users", icon: UserPlus, adminOnly: true },
  { to: "/settings", label: "System Settings", icon: Cog },
  { to: "/backup-restore", label: "Backup & Restore", icon: HardDrive },
];

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Insights", href: "/ai-insights", icon: Sparkles },
  { divider: true },
  { label: "Payments", href: "/income", icon: CreditCard },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Clients", href: "/clients", icon: Users },
  { divider: true },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Cash Flow", href: "/cash-flow", icon: TrendingUp },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Analytics", icon: BarChart3, href: "/reports/overview", items: reportSubItems },
  { divider: true },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Messages", href: "/sms", icon: MessageSquare },
  { divider: true },
  { label: "Settings", icon: Settings, href: "/settings", items: settingsSubItems },
];

function MenuPopupItem({ icon, label, onClick, colors }) {
  const [hovered, setHovered] = useState(false);
  const c = colors || getColors();
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        borderRadius: 7,
        cursor: "pointer",
        background: hovered ? c.hoverBg : "transparent",
        color: hovered ? c.text : c.textMuted,
        fontSize: 14.5,
        transition: "all 0.15s",
      }}
    >
      <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
      {label}
    </div>
  );
}

function SubItem({ to, label, icon: Icon, colors }) {
  const location = useLocation();
  const isActive = location.pathname === to;
  const [hovered, setHovered] = useState(false);
  const c = colors || getColors();

  return (
    <NavLink
      to={to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px 8px 36px",
        fontSize: 14.5,
        color: isActive ? c.activeAccent : hovered ? c.text : c.textMuted,
        cursor: "pointer",
        borderRadius: 6,
        marginBottom: 1,
        background: isActive
          ? c.activeBg
          : hovered
          ? c.hoverBg
          : "transparent",
        whiteSpace: "nowrap",
        transition: "all 0.2s",
        textDecoration: "none",
      }}
    >
      {Icon && <Icon size={17} style={{ flexShrink: 0 }} />}
      {label}
    </NavLink>
  );
}

function NavItem({
  icon: Icon,
  label,
  href,
  active,
  mini,
  chevron,
  onChevronOpen,
  onClick,
  colors,
}) {
  const [hovered, setHovered] = useState(false);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const c = colors || getColors();

  const handleMouseEnter = (e) => {
    setHovered(true);
    if (mini) {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
      setTooltipVisible(true);
    }
  };
  const handleMouseLeave = () => {
    setHovered(false);
    setTooltipVisible(false);
  };

  const content = (
    <>
      <div
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        style={{
          display: "flex",
          alignItems: "center",
          gap: mini ? 0 : 12,
          padding: mini ? "10px 0" : "10px 12px",
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.2s",
          position: "relative",
          color: hovered || active ? c.text : c.textMuted,
          fontSize: 15,
          fontWeight: active ? 500 : 400,
          whiteSpace: "nowrap",
          overflow: "hidden",
          marginBottom: 2,
          background: active
            ? c.activeBg
            : hovered
            ? c.hoverBg
            : "transparent",
          justifyContent: mini ? "center" : "flex-start",
          userSelect: "none",
          textDecoration: "none",
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: active ? c.activeAccent : "inherit",
          }}
        >
          <Icon size={21} />
        </span>
        {!mini && (
          <span style={{ flex: 1, overflow: "hidden", color: active ? c.activeAccent : "inherit" }}>
            {label}
          </span>
        )}
        {!mini && chevron !== undefined && (
          <span
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onChevronOpen();
            }}
            style={{
              transition: "transform 0.2s ease",
              transform: chevron ? "rotate(180deg)" : "rotate(0deg)",
              flexShrink: 0,
              color: c.textMuted,
              display: "flex",
            }}
          >
            <ChevronDown size={16} />
          </span>
        )}
      </div>
      {mini && tooltipVisible && (
        <div
          style={{
            position: "fixed",
            background: c.bg,
            color: c.text,
            fontSize: 12,
            padding: "6px 12px",
            borderRadius: 6,
            pointerEvents: "none",
            border: `1px solid ${c.border}`,
            zIndex: 9999,
            whiteSpace: "nowrap",
            top: tooltipPos.y,
            left: tooltipPos.x,
            transform: "translateY(-50%)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          {label}
        </div>
      )}
    </>
  );

  if (href && !chevron) {
    return (
      <NavLink to={href} style={{ textDecoration: "none" }}>
        {content}
      </NavLink>
    );
  }

  return content;
}

// Provider component to wrap the app
export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    // Start collapsed on mobile/tablet screens
    if (typeof window !== 'undefined') {
      return window.innerWidth < 1024;
    }
    return false;
  });
  const [colors, setColors] = useState(getColors);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle theme changes
  useEffect(() => {
    const updateColors = () => setColors(getColors());
    window.addEventListener('theme-change', updateColors);
    return () => window.removeEventListener('theme-change', updateColors);
  }, []);
  
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, colors }}>
      {children}
    </SidebarContext.Provider>
  );
}

export default function SidebarNew() {
  const { user, logout } = useAuth();
  const { settings } = useFinance();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, setCollapsed, colors } = useSidebarState();
  const c = colors;

  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hoverUser, setHoverUser] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const canManageUsers = user?.email === ADMIN_EMAIL;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    if (location.pathname.startsWith("/reports")) {
      setAnalyticsOpen(true);
    }
    if (location.pathname === "/settings" || location.pathname === "/users" || location.pathname === "/backup-restore") {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  const isActive = (href) => location.pathname === href;
  const isAnalyticsActive = location.pathname.startsWith("/reports");
  const isSettingsActive = ["/settings", "/users", "/backup-restore"].includes(location.pathname);

  // Sidebar widths
  const EXPANDED_WIDTH = 260;
  const COLLAPSED_WIDTH = 68;
  const currentWidth = collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  return (
    <>
      {/* Sidebar */}
      <div
        style={{
          width: currentWidth,
          minWidth: currentWidth,
          height: "calc(100vh - 20px)",
          background: c.bg,
          border: `1px solid ${c.border}`,
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)",
          overflow: "hidden",
          position: "fixed",
          top: 10,
          left: 10,
          zIndex: 50,
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "space-between",
            padding: collapsed ? "16px 12px" : "16px 16px",
            borderBottom: `1px solid ${c.border}`,
            minHeight: 64,
          }}
        >
          {!collapsed && (
            <a
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                textDecoration: "none",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(14,92,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <img src={sidebarIcon} alt="" style={{ width: 18, height: 18, objectFit: "contain" }} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 600, color: c.text, whiteSpace: "nowrap" }}>
                MyAccounts
              </span>
            </a>
          )}
          <button
            onClick={() => setCollapsed((col) => !col)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
              color: c.textMuted,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Menu size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "8px 10px", overflowY: "auto", overflowX: "hidden" }}>
          {!collapsed && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: c.textLabel,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                padding: "8px 12px 6px",
              }}
            >
              Menu
            </div>
          )}
          {NAV_ITEMS.map((item, i) => {
            if (item.divider) {
              return (
                <div
                  key={i}
                  style={{ height: 1, background: c.divider, margin: "8px 8px" }}
                />
              );
            }
            if (item.adminOnly && !canManageUsers) return null;
            
            // Analytics sub-items
            if (item.label === "Analytics" && item.items) {
              return (
                <div key={item.label}>
                  <NavItem
                    icon={item.icon}
                    label={item.label}
                    active={isAnalyticsActive}
                    mini={collapsed}
                    chevron={analyticsOpen}
                    onChevronOpen={() => setAnalyticsOpen((o) => !o)}
                    onClick={() => {
                      if (!collapsed) setAnalyticsOpen((o) => !o);
                    }}
                    colors={c}
                  />
                  {!collapsed && (
                    <div
                      style={{
                        overflow: "hidden",
                        maxHeight: analyticsOpen ? 300 : 0,
                        opacity: analyticsOpen ? 1 : 0,
                        transition: "max-height 0.25s ease, opacity 0.2s ease",
                      }}
                    >
                      {item.items.map((sub) => (
                        <SubItem
                          key={sub.to}
                          to={sub.to}
                          label={sub.label}
                          icon={sub.icon}
                          colors={c}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            }
            
            // Settings sub-items
            if (item.label === "Settings" && item.items) {
              return (
                <div key={item.label}>
                  <NavItem
                    icon={item.icon}
                    label={item.label}
                    active={isSettingsActive}
                    mini={collapsed}
                    chevron={settingsOpen}
                    onChevronOpen={() => setSettingsOpen((o) => !o)}
                    onClick={() => {
                      if (!collapsed) setSettingsOpen((o) => !o);
                    }}
                    colors={c}
                  />
                  {!collapsed && (
                    <div
                      style={{
                        overflow: "hidden",
                        maxHeight: settingsOpen ? 300 : 0,
                        opacity: settingsOpen ? 1 : 0,
                        transition: "max-height 0.25s ease, opacity 0.2s ease",
                      }}
                    >
                      {item.items
                        .filter((sub) => !sub.adminOnly || canManageUsers)
                        .map((sub) => (
                          <SubItem
                            key={sub.to}
                            to={sub.to}
                            label={sub.label}
                            icon={sub.icon}
                            colors={c}
                          />
                        ))}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <NavItem
                key={item.label}
                icon={item.icon}
                label={item.label}
                href={item.href}
                active={isActive(item.href)}
                mini={collapsed}
                colors={c}
              />
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: 10, borderTop: `1px solid ${c.border}`, position: "relative" }}>
          {/* Popup Menu */}
          {userMenuOpen && (
            <>
              <div
                onClick={() => setUserMenuOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 998 }}
              />
              <div
                style={{
                  position: "fixed",
                  bottom: 80,
                  left: collapsed ? 20 : 20,
                  width: collapsed ? 220 : currentWidth - 30,
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 10,
                  padding: 4,
                  zIndex: 999,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                }}
              >
                <div style={{ padding: "10px 12px 8px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>My Account</div>
                  <div style={{ fontSize: 12, color: c.textMuted, marginTop: 2, wordBreak: "break-all" }}>{user?.email}</div>
                </div>
                <div style={{ height: 1, background: c.divider, margin: "4px 0" }} />
                <MenuPopupItem
                  icon={<User size={16} />}
                  label="Profile"
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate("/profile");
                  }}
                  colors={c}
                />
                <MenuPopupItem
                  icon={<LogOut size={16} />}
                  label="Log out"
                  onClick={() => {
                    setUserMenuOpen(false);
                    handleLogout();
                  }}
                  colors={c}
                />
              </div>
            </>
          )}

          <div
            onClick={() => setUserMenuOpen((o) => !o)}
            onMouseEnter={() => setHoverUser(true)}
            onMouseLeave={() => setHoverUser(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: 10,
              borderRadius: 8,
              cursor: "pointer",
              background: userMenuOpen || hoverUser ? c.hoverBg : "transparent",
              transition: "background 0.2s",
              overflow: "hidden",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: settings?.profileAvatar
                  ? `url(${settings.profileAvatar}) center/cover`
                  : "linear-gradient(135deg, #0e5cff, #0839a3)",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                fontWeight: 600,
                color: "#fff",
                position: "relative",
              }}
            >
              {!settings?.profileAvatar && (user?.name || "U").charAt(0).toUpperCase()}
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  width: 10,
                  height: 10,
                  background: "#22c55e",
                  borderRadius: "50%",
                  border: `2px solid ${c.bg}`,
                }}
              />
            </div>
            {!collapsed && (
              <>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: c.text,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user?.name || "User"}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: c.textMuted,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {user?.email}
                  </div>
                </div>
                <span style={{ color: c.textMuted, flexShrink: 0 }}>
                  <ChevronsUpDown size={16} />
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
