import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useFinance } from "@/contexts/FinanceContext";
import sidebarIcon from "@/assets/logozopos.png";
import {
  Receipt,
  FileText,
  Users,
  UserPlus,
  MessageSquare,
  Bell,
  BarChart3,
  TrendingUp,
  Settings,
  CreditCard,
  Sparkles,
  LayoutDashboard,
  Calendar,
  ChevronDown,
  Menu,
  X,
  Database,
  Cog,
  HardDrive,
  Activity,
  Folder,
  Briefcase,
  ChevronsUpDown,
  LogOut,
  User,
} from "lucide-react";

// Theme-aware colors
const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    isDark,
    bg: isDark ? "#0a0a0a" : "#ffffff",
    border: isDark ? "#1e1e1e" : "#e1e1e1",
    text: isDark ? "#fff" : "#0a1420",
    textMuted: isDark ? "#8b9ab0" : "#0a1420",
    textLabel: isDark ? "#6b7280" : "#0a1420",
    hoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    activeBg: isDark ? "rgba(14,97,253,0.15)" : "#0e61fd",
    activeAccent: isDark ? "#0e61fd" : "#ffffff",
    divider: isDark ? "#1e1e1e" : "#e1e1e1",
    scrollbarThumb: isDark ? "#333333" : "#c1c1c1",
    /** Track transparent so only the thumb is visible (matches main sidebar bg). */
    scrollbarTrack: "transparent",
  };
};

const MOBILE_MAX_PX = 1023;

// Sidebar context: collapsed (desktop), mobile drawer, theme colors
const SidebarContext = createContext({
  collapsed: false,
  setCollapsed: () => {},
  colors: getColors(),
  isMobile: false,
  mobileDrawerOpen: false,
  setMobileDrawerOpen: () => {},
  openMobileDrawer: () => {},
  closeMobileDrawer: () => {},
});
export const useSidebarState = () => useContext(SidebarContext);

const ADMIN_EMAIL = "LOGOZODEV@gmail.com";

const reportSubItems = [
  { to: "/reports/overview", label: "Overview Reports" },
  { to: "/reports/storage-overview", label: "Storage Overview" },
  { to: "/reports/profit-loss", label: "Profit & Loss" },
  { to: "/reports/cash-flow", label: "Cash Flow" },
  { to: "/reports/balance-sheet", label: "Balance Sheet" },
];

const settingsSubItems = [
  { to: "/settings", label: "System Settings", icon: Cog },
  { to: "/backup-restore", label: "Backup & Restore", icon: HardDrive },
];

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "AI Insights", href: "/ai-insights", icon: Sparkles },
  { divider: true },
  { label: "Payments", href: "/income", icon: CreditCard },
  { label: "Invoices", href: "/invoices", icon: FileText },
  { label: "Estimates", href: "/estimates", icon: FileText },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Projects", href: "/projects", icon: Briefcase },
  { label: "File Manager", href: "/file-manager", icon: Folder },
  { divider: true },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  { label: "Cash Flow", href: "/cash-flow", icon: TrendingUp },
  { label: "Calendar", href: "/calendar", icon: Calendar },
  { label: "Analytics", icon: BarChart3, href: "/reports/overview", items: reportSubItems },
  { divider: true },
  { label: "Reminders", href: "/reminders", icon: Bell },
  { label: "Messages", href: "/sms", icon: MessageSquare },
  { divider: true },
  { label: "Users", href: "/users", icon: UserPlus, adminOnly: true },
  { label: "Login Activity", href: "/login-activity", icon: Activity, adminOnly: true },
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

const ACCOUNT_MENU_MIN_W = 248;

/** Rows for the sidebar account popup (solid label + icon color like the reference UI). */
function AccountMenuRow({ icon, label, onClick, isDark }) {
  const [hovered, setHovered] = useState(false);
  const fg = isDark ? "#ffffff" : "#0f172a";
  const hoverBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        border: "none",
        borderRadius: 8,
        cursor: "pointer",
        background: hovered ? hoverBg : "transparent",
        color: fg,
        fontSize: 14,
        fontWeight: 500,
        textAlign: "left",
        fontFamily: "inherit",
        transition: "background 0.15s",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", color: fg, flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
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
        fontSize: 16.5,
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
      {Icon && <Icon size={20} style={{ flexShrink: 0 }} />}
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
          gap: mini ? 0 : 13,
          padding: mini ? "11px 0" : "11px 13px",
          borderRadius: 8,
          cursor: "pointer",
          transition: "all 0.2s",
          position: "relative",
          color: active ? c.activeAccent : hovered ? c.text : c.textMuted,
          fontSize: 17,
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
            width: 24,
            height: 24,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: active ? c.activeAccent : "inherit",
          }}
        >
          <Icon size={24} />
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

function initialsFromUser(name, email) {
  const n = String(name || "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts[0]?.length >= 2) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] || "?").toUpperCase();
  }
  const local = String(email || "").split("@")[0] || "";
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return "?";
}

function SidebarProfileFooter({ user, logout, navigate, colors, expanded }) {
  const { settings } = useFinance();
  const profileAvatar = settings?.profileAvatar || null;
  const c = colors || getColors();
  const isDark =
    typeof c.isDark === "boolean" ? c.isDark : document.documentElement.classList.contains("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuLayout, setMenuLayout] = useState(null);
  const pillRef = useRef(null);
  const menuRef = useRef(null);

  const displayName = String(user?.name || "").trim() || "User";
  const email = String(user?.email || "").trim();
  const initials = initialsFromUser(user?.name, user?.email);
  const shortSingle = displayName.length > 0 && displayName.length <= 11 && !displayName.includes(" ");
  const avatarLabel = shortSingle ? displayName : initials;
  const avatarFontSize = shortSingle ? (displayName.length > 8 ? 9 : 10.5) : 12;

  const pillBg = isDark ? "#111111" : "#f4f4f5";
  const pillBorder = isDark ? "#1e1e1e" : "#e1e1e1";
  const avatarBg = isDark ? "#000000" : "#18181b";
  const secondary = isDark ? "#999999" : "#71717a";
  const statusGreen = "#4ade80";

  const updateMenuLayout = useCallback(() => {
    const el = pillRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(ACCOUNT_MENU_MIN_W, rect.width);
    let left = rect.left;
    if (left + width > window.innerWidth - 12) left = window.innerWidth - width - 12;
    if (left < 12) left = 12;
    setMenuLayout({
      left,
      width,
      bottom: window.innerHeight - rect.top + 8,
    });
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    updateMenuLayout();
    const onResize = () => updateMenuLayout();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [menuOpen, updateMenuLayout]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e) => {
      const t = e.target;
      if (pillRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const toggleMenu = () => {
    setMenuOpen((o) => !o);
  };

  const pillButton = (
    <button
      type="button"
      ref={pillRef}
      onClick={toggleMenu}
      aria-expanded={menuOpen}
      aria-haspopup="menu"
      style={{
        display: "flex",
        alignItems: "center",
        gap: expanded ? 10 : 0,
        width: "100%",
        justifyContent: expanded ? "flex-start" : "center",
        padding: expanded ? "10px 12px" : "10px 8px",
        borderRadius: 14,
        border: `1px solid ${pillBorder}`,
        background: pillBg,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
        fontFamily: "inherit",
      }}
    >
      <span style={{ position: "relative", width: 36, height: 36, flexShrink: 0 }}>
        {profileAvatar ? (
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: avatarBg,
              overflow: "hidden",
            }}
          >
            <img
              src={profileAvatar}
              alt=""
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </span>
        ) : (
          <span
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: avatarBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: avatarFontSize,
              fontWeight: 600,
              lineHeight: 1,
              textAlign: "center",
              padding: 2,
              overflow: "hidden",
              wordBreak: "break-all",
            }}
          >
            {avatarLabel}
          </span>
        )}
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            width: 11,
            height: 11,
            borderRadius: "50%",
            background: statusGreen,
            border: `2px solid ${pillBg}`,
            boxSizing: "border-box",
          }}
          title="Online"
        />
      </span>
      {expanded && (
        <>
          <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                minWidth: 0,
                fontSize: 14,
                fontWeight: 700,
                color: isDark ? "#ffffff" : "#18181b",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Verified account"
                role="img"
                style={{ flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" fill="#1D9BF0" />
                <path
                  d="M7.9 12.3L10.5 14.9L16.1 9.3"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            {email ? (
              <span
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 400,
                  color: secondary,
                  marginTop: 2,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {email}
              </span>
            ) : null}
          </span>
          <ChevronsUpDown size={16} color={secondary} style={{ flexShrink: 0 }} aria-hidden />
        </>
      )}
    </button>
  );

  return (
    <div
      style={{
        padding: expanded ? "10px 10px 12px" : "10px 8px 12px",
        borderTop: `1px solid ${c.divider}`,
        flexShrink: 0,
      }}
    >
      {pillButton}
      {menuOpen && menuLayout && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                role="presentation"
                style={{ position: "fixed", inset: 0, zIndex: 1000 }}
                onClick={() => setMenuOpen(false)}
              />
              <div
                ref={menuRef}
                role="menu"
                aria-label="Account menu"
                style={{
                  position: "fixed",
                  left: menuLayout.left,
                  width: menuLayout.width,
                  bottom: menuLayout.bottom,
                  background: isDark ? "#0a0a0a" : "#ffffff",
                  border: `1px solid ${isDark ? "#1e1e1e" : "#e1e1e1"}`,
                  borderRadius: 12,
                  padding: "4px 4px 6px",
                  zIndex: 1001,
                  boxShadow: isDark
                    ? "0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)"
                    : "0 16px 48px rgba(15,23,42,0.12)",
                }}
              >
                <div style={{ padding: "14px 14px 12px" }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: isDark ? "#ffffff" : "#0f172a",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    My Account
                  </div>
                  {email ? (
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 400,
                        color: isDark ? "#94a3b8" : "#64748b",
                        marginTop: 6,
                        lineHeight: 1.35,
                        wordBreak: "break-all",
                      }}
                    >
                      {email}
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    height: 1,
                    margin: "0 10px 4px",
                    background: isDark ? "#1e1e1e" : "#e1e1e1",
                  }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "2px 0" }}>
                  <AccountMenuRow
                    isDark={isDark}
                    icon={<User size={18} strokeWidth={2} />}
                    label="Profile"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/settings?tab=profile");
                    }}
                  />
                  <AccountMenuRow
                    isDark={isDark}
                    icon={<LogOut size={18} strokeWidth={2} />}
                    label="Log out"
                    onClick={async () => {
                      setMenuOpen(false);
                      await logout();
                      navigate("/login");
                    }}
                  />
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </div>
  );
}

// Provider component to wrap the app
export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= MOBILE_MAX_PX;
    }
    return false;
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth <= MOBILE_MAX_PX : false
  );
  const [colors, setColors] = useState(getColors);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_MAX_PX}px)`);
    const sync = () => {
      const mobile = mq.matches;
      setIsMobile(mobile);
      if (mobile) {
        setCollapsed(true);
        setMobileDrawerOpen(false);
      }
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Handle theme changes
  useEffect(() => {
    const updateColors = () => setColors(getColors());
    window.addEventListener('theme-change', updateColors);
    return () => window.removeEventListener('theme-change', updateColors);
  }, []);

  const openMobileDrawer = useCallback(() => setMobileDrawerOpen(true), []);
  const closeMobileDrawer = useCallback(() => setMobileDrawerOpen(false), []);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed,
        colors,
        isMobile,
        mobileDrawerOpen,
        setMobileDrawerOpen,
        openMobileDrawer,
        closeMobileDrawer,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, setCollapsed, colors, isMobile, mobileDrawerOpen, closeMobileDrawer } =
    useSidebarState();
  const c = colors;
  const effectiveCollapsed = isMobile ? false : collapsed;

  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [hoverToggle, setHoverToggle] = useState(false);
  const [miniSubmenu, setMiniSubmenu] = useState(null); // { title, items: Array<{to,label,icon?,adminOnly?}>, pos: {top,left,width} }

  const canManageUsers =
    String(user?.role || "").toLowerCase() === "admin" ||
    String(user?.email || "").toLowerCase().trim() === ADMIN_EMAIL;

  useEffect(() => {
    if (location.pathname.startsWith("/reports")) {
      setAnalyticsOpen(true);
    }
    if (location.pathname === "/settings" || location.pathname === "/backup-restore") {
      setSettingsOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (isMobile) closeMobileDrawer();
  }, [location.pathname, isMobile, closeMobileDrawer]);

  useEffect(() => {
    if (!isMobile || typeof document === "undefined") return;
    if (mobileDrawerOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isMobile, mobileDrawerOpen]);

  const isActive = (href) => location.pathname === href;
  const isAnalyticsActive = location.pathname.startsWith("/reports");
  const isSettingsActive = ["/settings", "/backup-restore"].includes(location.pathname);

  const closeMiniSubmenu = () => setMiniSubmenu(null);

  const openMiniSubmenu = (e, title, items) => {
    if (typeof window === "undefined") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = 276;
    const rowH = 40;
    const headerH = 52;
    const padding = 8;
    const desiredH = headerH + padding * 2 + items.length * rowH;
    const maxTop = Math.max(12, window.innerHeight - desiredH - 12);
    const top = Math.min(maxTop, Math.max(12, rect.top - 8));
    const left = rect.right + 12;
    setMiniSubmenu({ title, items, pos: { top, left, width } });
  };

  // Sidebar widths (mobile drawer always uses expanded width)
  const EXPANDED_WIDTH = 276;
  const COLLAPSED_WIDTH = 68;
  const currentWidth = isMobile ? EXPANDED_WIDTH : collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH;

  const desktopSidebarStyle = {
    width: currentWidth,
    minWidth: currentWidth,
    height: "calc(100vh - 40px)",
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderRadius: 16,
    display: "flex",
    flexDirection: "column",
    transition: "width 0.3s cubic-bezier(0.4,0,0.2,1), min-width 0.3s cubic-bezier(0.4,0,0.2,1)",
    overflow: "hidden",
    position: "fixed",
    top: "50%",
    left: 10,
    transform: "translateY(-50%)",
    zIndex: 50,
    fontFamily: "inherit",
  };

  const mobileSidebarStyle = {
    width: "min(296px, 88vw)",
    minWidth: "min(296px, 88vw)",
    minHeight: 0,
    height: "100%",
    maxHeight: "100dvh",
    background: c.bg,
    border: `1px solid ${c.border}`,
    borderLeft: "none",
    borderRadius: "0 16px 16px 0",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
    overflow: "hidden",
    position: "fixed",
    top: 0,
    left: 0,
    paddingTop: "env(safe-area-inset-top, 0px)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    transform: mobileDrawerOpen ? "translateX(0)" : "translateX(-105%)",
    zIndex: 101,
    fontFamily: "inherit",
    boxShadow: mobileDrawerOpen ? "8px 0 32px rgba(0,0,0,0.28)" : "none",
  };

  return (
    <>
      {/* Scrollbar styles: thin when expanded; hidden when desktop sidebar collapsed (wheel scroll still works) */}
      <style>{`
        .sidebar-nav-scroll::-webkit-scrollbar-button {
          display: none;
          width: 0;
          height: 0;
        }
        .sidebar-nav-scroll::-webkit-scrollbar {
          width: 2px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
          border-radius: 999px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb {
          background: ${c.scrollbarThumb};
          border-radius: 999px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb:hover {
          background: ${c.scrollbarThumb}cc;
        }
        .sidebar-nav-scroll-mini::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
        .sidebar-nav-scroll-mini {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>

      {isMobile && mobileDrawerOpen && (
        <div
          role="presentation"
          aria-hidden
          onClick={closeMobileDrawer}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 100,
          }}
        />
      )}

      {/* Sidebar */}
      <div style={isMobile ? mobileSidebarStyle : desktopSidebarStyle}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: effectiveCollapsed ? "center" : "space-between",
            padding: effectiveCollapsed ? "16px 12px" : "16px 16px",
            borderBottom: `1px solid ${c.border}`,
            minHeight: 68,
          }}
        >
          {!effectiveCollapsed && (
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
              <img
                src={sidebarIcon}
                alt=""
                style={{ width: 38, height: 38, objectFit: "contain", flexShrink: 0 }}
              />
              <span
                style={{
                  fontSize: 16,
                  color: c.text,
                  whiteSpace: "nowrap",
                  fontWeight: 550,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                }}
              >
                LOGOZODEV
              </span>
            </a>
          )}
          <button
            type="button"
            aria-label={isMobile ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              if (isMobile) closeMobileDrawer();
              else setCollapsed((col) => !col);
            }}
            onMouseEnter={() => setHoverToggle(true)}
            onMouseLeave={() => setHoverToggle(false)}
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
            {isMobile ? (
              <X size={22} />
            ) : collapsed ? (
              <span
                style={{
                  width: 28,
                  height: 28,
                  position: "relative",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={sidebarIcon}
                  alt=""
                  style={{
                    width: 33,
                    height: 33,
                    objectFit: "contain",
                    position: "absolute",
                    opacity: hoverToggle ? 0 : 1,
                    transition: "opacity 0.2s ease",
                  }}
                />
                <Menu
                  size={18}
                  style={{
                    position: "absolute",
                    opacity: hoverToggle ? 1 : 0,
                    transition: "opacity 0.2s ease",
                  }}
                />
              </span>
            ) : (
              <Menu size={18} />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav
          className={`sidebar-nav-scroll${effectiveCollapsed && !isMobile ? " sidebar-nav-scroll-mini" : ""}`}
          style={{
            flex: 1,
            padding: "8px 10px",
            overflowY: "auto",
            overflowX: "hidden",
            scrollbarColor:
              effectiveCollapsed && !isMobile ? "transparent transparent" : `${c.scrollbarThumb} ${c.scrollbarTrack}`,
            scrollbarWidth: effectiveCollapsed && !isMobile ? "none" : "thin",
          }}
        >
          {!effectiveCollapsed && (
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
                    mini={effectiveCollapsed}
                    chevron={analyticsOpen}
                    onChevronOpen={() => setAnalyticsOpen((o) => !o)}
                    onClick={(e) => {
                      if (effectiveCollapsed) {
                        openMiniSubmenu(e, "Analytics", item.items);
                        return;
                      }
                      setAnalyticsOpen((o) => !o);
                    }}
                    colors={c}
                  />
                  {!effectiveCollapsed && (
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
                    mini={effectiveCollapsed}
                    chevron={settingsOpen}
                    onChevronOpen={() => setSettingsOpen((o) => !o)}
                    onClick={(e) => {
                      if (effectiveCollapsed) {
                        const subItems = item.items.filter((sub) => !sub.adminOnly || canManageUsers);
                        openMiniSubmenu(e, "Settings", subItems);
                        return;
                      }
                      setSettingsOpen((o) => !o);
                    }}
                    colors={c}
                  />
                  {!effectiveCollapsed && (
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
                mini={effectiveCollapsed}
                colors={c}
              />
            );
          })}
        </nav>

        <SidebarProfileFooter
          user={user}
          logout={logout}
          navigate={navigate}
          colors={c}
          expanded={!effectiveCollapsed}
        />
      </div>

      {/* Collapsed submenu popup (portal so it won't be clipped) */}
      {miniSubmenu && typeof document !== "undefined"
        ? createPortal(
            <>
              <div
                onClick={closeMiniSubmenu}
                style={{ position: "fixed", inset: 0, zIndex: 998 }}
              />
              <div
                style={{
                  position: "fixed",
                  top: miniSubmenu.pos.top,
                  left: miniSubmenu.pos.left,
                  width: miniSubmenu.pos.width,
                  background: c.bg,
                  border: `1px solid ${c.border}`,
                  borderRadius: 12,
                  padding: 8,
                  zIndex: 999,
                  boxShadow: "0 16px 48px rgba(0,0,0,0.35)",
                }}
              >
                <div style={{ padding: "10px 10px 8px" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.text }}>
                    {miniSubmenu.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: c.textMuted, marginTop: 2 }}>
                    Select an option
                  </div>
                </div>
                <div style={{ height: 1, background: c.divider, margin: "4px 0 6px" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {miniSubmenu.items.map((sub) => (
                    <MenuPopupItem
                      key={sub.to}
                      icon={sub.icon ? <sub.icon size={16} /> : <FileText size={16} />}
                      label={sub.label}
                      onClick={() => {
                        closeMiniSubmenu();
                        navigate(sub.to);
                      }}
                      colors={c}
                    />
                  ))}
                </div>
              </div>
            </>,
            document.body
          )
        : null}
    </>
  );
}
