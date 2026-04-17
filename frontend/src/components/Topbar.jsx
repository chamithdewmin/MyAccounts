import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  Bell,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  Receipt,
  CreditCard,
  X,
  Clock,
  ArrowRight,
  Menu,
  ChevronsUpDown,
  User,
  LogOut,
} from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarState } from '@/components/SidebarNew';

const TOPBAR_TRANSITION = 'all 0.2s ease';

const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  const accent = '#0e5cff';
  const base = {
    blue: accent,
    green: '#22c55e',
    red: '#ef4444',
    yellow: '#eab308',
    purple: '#a78bfa',
    todayBg: accent,
  };
  if (isDark) {
    return {
      ...base,
      border: '#171717',
      text: '#fff',
      textMuted: '#8b9ab0',
      inputBg: '#1e293b',
      cardBg: '#0f172a',
      pageBg: '#0f172a',
      hoverBg: 'rgba(255,255,255,0.08)',
      headerGlassBg: '#0f172a',
      headerBorderBottom: '1px solid rgba(255, 255, 255, 0.06)',
      headerTopLine: 'rgba(255, 255, 255, 0.08)',
      searchBg: 'linear-gradient(145deg, #1e293b, #0f172a)',
      searchInset: 'inset 0 1px 2px rgba(255, 255, 255, 0.05)',
      searchBorderIdle: '1px solid rgba(148, 163, 184, 0.14)',
      searchBorderFocus: '1px solid rgba(14, 92, 255, 0.55)',
      searchGlowFocus: '0 0 0 3px rgba(14, 92, 255, 0.2), 0 0 22px rgba(14, 92, 255, 0.14)',
      topbarIconBg: 'rgba(255, 255, 255, 0.04)',
      topbarIconBorder: 'rgba(255, 255, 255, 0.08)',
      topbarIconInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      datePillBg: 'rgba(255, 255, 255, 0.04)',
      datePillBgHover: 'rgba(255, 255, 255, 0.09)',
      datePillBorder: '1px solid rgba(255, 255, 255, 0.06)',
      profileBg: 'rgba(255, 255, 255, 0.03)',
      profileBorder: 'rgba(255, 255, 255, 0.06)',
      profileHoverGlow: '0 0 0 1px rgba(59, 130, 246, 0.35), 0 8px 28px rgba(0, 0, 0, 0.18)',
      avatarStatusRing: 'rgba(15, 23, 42, 0.96)',
    };
  }
  return {
    ...base,
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#64748b',
    inputBg: '#f1f5f9',
    cardBg: '#ffffff',
    pageBg: '#f8fafc',
    hoverBg: 'rgba(0, 0, 0, 0.05)',
    headerGlassBg: '#f8fafc',
    headerBorderBottom: '1px solid rgba(15, 23, 42, 0.08)',
    headerTopLine: 'rgba(15, 23, 42, 0.06)',
    searchBg: 'linear-gradient(145deg, #ffffff, #f1f5f9)',
    searchInset: 'inset 0 1px 2px rgba(255, 255, 255, 0.95)',
    searchBorderIdle: '1px solid rgba(148, 163, 184, 0.28)',
    searchBorderFocus: '1px solid rgba(14, 92, 255, 0.45)',
    searchGlowFocus: '0 0 0 3px rgba(14, 92, 255, 0.16), 0 0 18px rgba(14, 92, 255, 0.1)',
    topbarIconBg: 'rgba(255, 255, 255, 0.92)',
    topbarIconBorder: 'rgba(148, 163, 184, 0.35)',
    topbarIconInset: 'inset 0 1px 0 rgba(255, 255, 255, 0.98)',
    datePillBg: 'rgba(15, 23, 42, 0.04)',
    datePillBgHover: 'rgba(15, 23, 42, 0.08)',
    datePillBorder: '1px solid rgba(148, 163, 184, 0.32)',
    profileBg: 'rgba(255, 255, 255, 0.92)',
    profileBorder: 'rgba(15, 23, 42, 0.1)',
    profileHoverGlow: '0 0 0 1px rgba(14, 92, 255, 0.32), 0 8px 22px rgba(15, 23, 42, 0.08)',
    avatarStatusRing: '#ffffff',
  };
};

/** Circular header control: soft pill, icon opacity / scale on hover & press */
function TopbarIconButton({ ariaLabel, onClick, colors: c, notificationDot, active, children }) {
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const scale = down ? 0.96 : hover ? 1.08 : 1;
  const ring = active ? `, 0 0 0 2px rgba(14, 92, 255, 0.28)` : '';
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setDown(false);
      }}
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
      style={{
        background: c.topbarIconBg,
        border: `1px solid ${c.topbarIconBorder}`,
        borderRadius: 9999,
        padding: 10,
        cursor: 'pointer',
        color: c.textMuted,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        transition: TOPBAR_TRANSITION,
        boxShadow: `${c.topbarIconInset}${ring}`,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: hover ? 1 : 0.7,
          transform: `scale(${scale})`,
          transition: TOPBAR_TRANSITION,
          color: 'inherit',
        }}
      >
        {children}
      </span>
      {notificationDot ? (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 6,
            height: 6,
            background: '#ef4444',
            borderRadius: '50%',
            boxShadow: '0 0 6px rgba(239, 68, 68, 0.6)',
            pointerEvents: 'none',
          }}
        />
      ) : null}
    </button>
  );
}

const MiniCalendar = ({ colors, onClose }) => {
  const c = colors;
  const [currentDate, setCurrentDate] = useState(new Date());
  const today = new Date();
  
  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };
  
  const isToday = (day) => {
    return day === today.getDate() && 
           currentDate.getMonth() === today.getMonth() && 
           currentDate.getFullYear() === today.getFullYear();
  };
  
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 8,
      background: c.cardBg,
      border: `1px solid ${c.border}`,
      borderRadius: 16,
      padding: 16,
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      zIndex: 100,
      minWidth: 280,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <button 
          onClick={prevMonth}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            color: c.textMuted,
            padding: 4,
            borderRadius: 6,
            display: 'flex',
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <span style={{ color: c.text, fontSize: 14, fontWeight: 600 }}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </span>
        <button 
          onClick={nextMonth}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer', 
            color: c.textMuted,
            padding: 4,
            borderRadius: 6,
            display: 'flex',
          }}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      
      {/* Days of week */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
        {daysOfWeek.map(day => (
          <div key={day} style={{ 
            textAlign: 'center', 
            color: c.textMuted, 
            fontSize: 11, 
            fontWeight: 600,
            padding: '4px 0',
          }}>
            {day}
          </div>
        ))}
      </div>
      
      {/* Days */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {getDaysInMonth(currentDate).map((day, index) => (
          <div
            key={index}
            style={{
              textAlign: 'center',
              padding: '8px 0',
              fontSize: 13,
              fontWeight: isToday(day) ? 600 : 400,
              color: day ? (isToday(day) ? '#fff' : c.text) : 'transparent',
              background: isToday(day) ? c.todayBg : 'transparent',
              borderRadius: 8,
              cursor: day ? 'pointer' : 'default',
            }}
          >
            {day || ''}
          </div>
        ))}
      </div>
    </div>
  );
};

// Search Results Dropdown Component
const SearchResults = ({ query, colors, onClose, onSelect }) => {
  const c = colors;
  const navigate = useNavigate();
  const { incomes, expenses, clients, invoices } = useFinance();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  });

  const searchResults = React.useMemo(() => {
    if (!query || query.length < 2) return { clients: [], invoices: [], incomes: [], expenses: [], total: 0 };
    
    const q = query.toLowerCase();
    
    const matchedClients = clients.filter(client => 
      client.name?.toLowerCase().includes(q) ||
      client.email?.toLowerCase().includes(q) ||
      client.phone?.includes(q)
    ).slice(0, 3);
    
    const matchedInvoices = invoices.filter(inv => 
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.clientName?.toLowerCase().includes(q) ||
      String(inv.total).includes(q)
    ).slice(0, 3);
    
    const matchedIncomes = incomes.filter(inc => 
      inc.clientName?.toLowerCase().includes(q) ||
      inc.serviceType?.toLowerCase().includes(q) ||
      inc.description?.toLowerCase().includes(q) ||
      String(inc.amount).includes(q)
    ).slice(0, 3);
    
    const matchedExpenses = expenses.filter(exp => 
      exp.category?.toLowerCase().includes(q) ||
      exp.description?.toLowerCase().includes(q) ||
      exp.vendor?.toLowerCase().includes(q) ||
      String(exp.amount).includes(q)
    ).slice(0, 3);
    
    return {
      clients: matchedClients,
      invoices: matchedInvoices,
      incomes: matchedIncomes,
      expenses: matchedExpenses,
      total: matchedClients.length + matchedInvoices.length + matchedIncomes.length + matchedExpenses.length
    };
  }, [query, clients, invoices, incomes, expenses]);

  const allResults = React.useMemo(() => {
    const results = [];
    searchResults.clients.forEach(item => results.push({ type: 'client', item }));
    searchResults.invoices.forEach(item => results.push({ type: 'invoice', item }));
    searchResults.incomes.forEach(item => results.push({ type: 'income', item }));
    searchResults.expenses.forEach(item => results.push({ type: 'expense', item }));
    return results;
  }, [searchResults]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && allResults[selectedIndex]) {
        e.preventDefault();
        handleResultClick(allResults[selectedIndex]);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, allResults]);

  const saveRecentSearch = (text) => {
    const updated = [text, ...recentSearches.filter(s => s !== text)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleResultClick = (result) => {
    saveRecentSearch(query);
    onClose();
    switch (result.type) {
      case 'client':
        navigate('/clients');
        break;
      case 'invoice':
        navigate('/invoices');
        break;
      case 'income':
        navigate('/income');
        break;
      case 'expense':
        navigate('/expenses');
        break;
    }
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  const getIcon = (type) => {
    switch (type) {
      case 'client': return <Users size={16} style={{ color: c.blue }} />;
      case 'invoice': return <FileText size={16} style={{ color: c.purple }} />;
      case 'income': return <CreditCard size={16} style={{ color: c.green }} />;
      case 'expense': return <Receipt size={16} style={{ color: c.red }} />;
      default: return <Search size={16} />;
    }
  };

  const formatAmount = (amount) => `LKR ${(amount || 0).toLocaleString()}`;

  let currentIndex = -1;

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      marginTop: 8,
      background: c.cardBg,
      border: `1px solid ${c.border}`,
      borderRadius: 16,
      boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      zIndex: 100,
      maxHeight: 420,
      overflowY: 'auto',
    }}>
      {/* Show recent searches when no query */}
      {(!query || query.length < 2) && recentSearches.length > 0 && (
        <div style={{ padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: c.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Recent Searches
            </span>
            <button 
              onClick={clearRecentSearches}
              style={{ background: 'none', border: 'none', color: c.textMuted, fontSize: 11, cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
          {recentSearches.map((search, i) => (
            <div
              key={i}
              onClick={() => onSelect(search)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: 'transparent',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = c.hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Clock size={14} style={{ color: c.textMuted }} />
              <span style={{ color: c.text, fontSize: 13 }}>{search}</span>
            </div>
          ))}
        </div>
      )}

      {/* Keyboard hint */}
      {(!query || query.length < 2) && recentSearches.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: c.textMuted, fontSize: 13, margin: 0 }}>
            Type to search clients, invoices, payments, and expenses
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            <kbd style={{ 
              background: c.hoverBg, 
              border: `1px solid ${c.border}`, 
              borderRadius: 4, 
              padding: '2px 6px', 
              fontSize: 11, 
              color: c.textMuted 
            }}>↑↓</kbd>
            <span style={{ color: c.textMuted, fontSize: 11 }}>Navigate</span>
            <kbd style={{ 
              background: c.hoverBg, 
              border: `1px solid ${c.border}`, 
              borderRadius: 4, 
              padding: '2px 6px', 
              fontSize: 11, 
              color: c.textMuted,
              marginLeft: 8,
            }}>Enter</kbd>
            <span style={{ color: c.textMuted, fontSize: 11 }}>Select</span>
            <kbd style={{ 
              background: c.hoverBg, 
              border: `1px solid ${c.border}`, 
              borderRadius: 4, 
              padding: '2px 6px', 
              fontSize: 11, 
              color: c.textMuted,
              marginLeft: 8,
            }}>Esc</kbd>
            <span style={{ color: c.textMuted, fontSize: 11 }}>Close</span>
          </div>
        </div>
      )}

      {/* Search Results */}
      {query && query.length >= 2 && searchResults.total === 0 && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: c.textMuted, fontSize: 13, margin: 0 }}>
            No results found for "{query}"
          </p>
        </div>
      )}

      {query && query.length >= 2 && searchResults.total > 0 && (
        <div style={{ padding: 8 }}>
          {/* Clients */}
          {searchResults.clients.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ padding: '8px 12px', color: c.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Clients
              </div>
              {searchResults.clients.map((client, i) => {
                currentIndex++;
                const isSelected = currentIndex === selectedIndex;
                return (
                  <div
                    key={client._id || i}
                    onClick={() => handleResultClick({ type: 'client', item: client })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected ? c.hoverBg : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = c.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? c.hoverBg : 'transparent'}
                  >
                    {getIcon('client')}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: c.text, fontSize: 13, fontWeight: 500 }}>{client.name}</div>
                      <div style={{ color: c.textMuted, fontSize: 11 }}>{client.email || client.phone}</div>
                    </div>
                    <ArrowRight size={14} style={{ color: c.textMuted }} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Invoices */}
          {searchResults.invoices.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ padding: '8px 12px', color: c.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Invoices
              </div>
              {searchResults.invoices.map((inv, i) => {
                currentIndex++;
                const isSelected = currentIndex === selectedIndex;
                return (
                  <div
                    key={inv._id || i}
                    onClick={() => handleResultClick({ type: 'invoice', item: inv })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected ? c.hoverBg : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = c.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? c.hoverBg : 'transparent'}
                  >
                    {getIcon('invoice')}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: c.text, fontSize: 13, fontWeight: 500 }}>{inv.invoiceNumber}</div>
                      <div style={{ color: c.textMuted, fontSize: 11 }}>{inv.clientName}</div>
                    </div>
                    <span style={{ color: c.text, fontSize: 12, fontWeight: 600 }}>{formatAmount(inv.total)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Payments */}
          {searchResults.incomes.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ padding: '8px 12px', color: c.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Payments
              </div>
              {searchResults.incomes.map((inc, i) => {
                currentIndex++;
                const isSelected = currentIndex === selectedIndex;
                return (
                  <div
                    key={inc._id || i}
                    onClick={() => handleResultClick({ type: 'income', item: inc })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected ? c.hoverBg : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = c.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? c.hoverBg : 'transparent'}
                  >
                    {getIcon('income')}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: c.text, fontSize: 13, fontWeight: 500 }}>{inc.clientName || inc.serviceType}</div>
                      <div style={{ color: c.textMuted, fontSize: 11 }}>{inc.serviceType}</div>
                    </div>
                    <span style={{ color: c.green, fontSize: 12, fontWeight: 600 }}>+{formatAmount(inc.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Expenses */}
          {searchResults.expenses.length > 0 && (
            <div>
              <div style={{ padding: '8px 12px', color: c.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Expenses
              </div>
              {searchResults.expenses.map((exp, i) => {
                currentIndex++;
                const isSelected = currentIndex === selectedIndex;
                return (
                  <div
                    key={exp._id || i}
                    onClick={() => handleResultClick({ type: 'expense', item: exp })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 12px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: isSelected ? c.hoverBg : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = c.hoverBg}
                    onMouseLeave={(e) => e.currentTarget.style.background = isSelected ? c.hoverBg : 'transparent'}
                  >
                    {getIcon('expense')}
                    <div style={{ flex: 1 }}>
                      <div style={{ color: c.text, fontSize: 13, fontWeight: 500 }}>{exp.category}</div>
                      <div style={{ color: c.textMuted, fontSize: 11 }}>{exp.description || exp.vendor}</div>
                    </div>
                    <span style={{ color: c.red, fontSize: 12, fontWeight: 600 }}>-{formatAmount(exp.amount)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const Topbar = () => {
  const { user, logout } = useAuth();
  const { settings } = useFinance();
  const navigate = useNavigate();
  const { isMobile, openMobileDrawer, closeMobileDrawer } = useSidebarState();
  const [searchQuery, setSearchQuery] = useState('');
  const [colors, setColors] = useState(getColors);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuPos, setUserMenuPos] = useState({ top: 0, left: 0, width: 224 });
  const [userChipHover, setUserChipHover] = useState(false);
  const [searchInputFocused, setSearchInputFocused] = useState(false);
  const [dateHover, setDateHover] = useState(false);
  const calendarRef = useRef(null);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const userTriggerRef = useRef(null);
  const userDropdownRef = useRef(null);
  const c = colors;

  const MENU_W = 224;

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  useLayoutEffect(() => {
    if (!userMenuOpen || !userTriggerRef.current) return;
    const r = userTriggerRef.current.getBoundingClientRect();
    const left = Math.min(
      Math.max(12, r.right - MENU_W),
      (typeof window !== 'undefined' ? window.innerWidth : 0) - MENU_W - 12
    );
    setUserMenuPos({ top: r.bottom + 8, left, width: MENU_W });
  }, [userMenuOpen]);

  useEffect(() => {
    const updateColors = () => setColors(getColors());
    window.addEventListener('theme-change', updateColors);
    return () => window.removeEventListener('theme-change', updateColors);
  }, []);

  // Keyboard shortcut: Ctrl+K or Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery('');
        inputRef.current?.blur();
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      const target = event.target;
      if (calendarRef.current && !calendarRef.current.contains(target)) {
        setCalendarOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false);
      }
      if (userMenuOpen) {
        const inTrigger = userTriggerRef.current?.contains(target);
        const inMenu = userDropdownRef.current?.contains(target);
        if (!inTrigger && !inMenu) setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const formatDate = () => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handleSearchFocus = () => {
    setSearchOpen(true);
  };

  const handleSearchSelect = (text) => {
    setSearchQuery(text);
    inputRef.current?.focus();
  };

  const searchRimActive = searchInputFocused;

  return (
    <header
      className="max-lg:min-h-[56px]"
      style={{
        position: 'relative',
        isolation: 'isolate',
        background: c.headerGlassBg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: c.headerBorderBottom,
        boxSizing: 'border-box',
        padding: isMobile
          ? `max(10px, env(safe-area-inset-top, 0px)) 16px 10px 16px`
          : '10px 16px',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 1,
          background: c.headerTopLine,
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {isMobile && (
          <TopbarIconButton ariaLabel="Open menu" onClick={openMobileDrawer} colors={c}>
            <Menu size={20} />
          </TopbarIconButton>
        )}
        {/* Search */}
        <div ref={searchRef} style={{ position: 'relative', flex: 1, maxWidth: 420, minWidth: 0 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: c.textMuted,
              pointerEvents: 'none',
              opacity: searchRimActive ? 1 : 0.7,
              transition: TOPBAR_TRANSITION,
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder={isMobile ? 'Search…' : 'Search clients, invoices, payments...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={(e) => {
              handleSearchFocus();
              setSearchInputFocused(true);
            }}
            onBlur={() => setSearchInputFocused(false)}
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: 70,
              paddingTop: 10,
              paddingBottom: 10,
              background: c.searchBg,
              border: searchRimActive ? c.searchBorderFocus : c.searchBorderIdle,
              borderRadius: 9999,
              fontSize: 14,
              color: c.text,
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
              transition: TOPBAR_TRANSITION,
              boxShadow: searchRimActive ? `${c.searchInset}, ${c.searchGlowFocus}` : c.searchInset,
            }}
          />
          {/* Keyboard shortcut hint (desktop) */}
          {!searchOpen && !isMobile && (
            <div style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              pointerEvents: 'none',
            }}>
              <kbd
                style={{
                  background: c.topbarIconBg,
                  border: `1px solid ${c.topbarIconBorder}`,
                  borderRadius: 4,
                  padding: '2px 5px',
                  fontSize: 10,
                  color: c.textMuted,
                  fontFamily: 'system-ui, sans-serif',
                  opacity: 0.75,
                  transition: TOPBAR_TRANSITION,
                }}
              >
                ⌘
              </kbd>
              <kbd
                style={{
                  background: c.topbarIconBg,
                  border: `1px solid ${c.topbarIconBorder}`,
                  borderRadius: 4,
                  padding: '2px 5px',
                  fontSize: 10,
                  color: c.textMuted,
                  fontFamily: 'system-ui, sans-serif',
                  opacity: 0.75,
                  transition: TOPBAR_TRANSITION,
                }}
              >
                K
              </kbd>
            </div>
          )}
          {/* Clear button */}
          {searchOpen && searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                inputRef.current?.focus();
              }}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: c.textMuted,
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                opacity: 0.7,
                transition: TOPBAR_TRANSITION,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7';
              }}
            >
              <X size={14} />
            </button>
          )}
          {/* Search Results Dropdown */}
          {searchOpen && (
            <SearchResults 
              query={searchQuery} 
              colors={c} 
              onClose={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              onSelect={handleSearchSelect}
            />
          )}
        </div>

        {/* Right side — date, calendar, notifications, account (must not shrink behind search) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {/* Date */}
          <button
            type="button"
            className="hidden sm:inline-flex items-center"
            onMouseEnter={() => setDateHover(true)}
            onMouseLeave={() => setDateHover(false)}
            style={{
              background: dateHover ? c.datePillBgHover : c.datePillBg,
              border: c.datePillBorder,
              borderRadius: 9999,
              padding: '6px 12px',
              cursor: 'default',
              transition: TOPBAR_TRANSITION,
            }}
          >
            <span
              style={{
                color: c.textMuted,
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              {formatDate()}
            </span>
          </button>

          {/* Calendar */}
          <div ref={calendarRef} style={{ position: 'relative' }}>
            <TopbarIconButton
              ariaLabel={calendarOpen ? 'Close calendar' : 'Open calendar'}
              onClick={() => setCalendarOpen(!calendarOpen)}
              colors={c}
              active={calendarOpen}
            >
              <Calendar size={18} />
            </TopbarIconButton>
            {calendarOpen && <MiniCalendar colors={c} onClose={() => setCalendarOpen(false)} />}
          </div>

          {/* Notifications */}
          <TopbarIconButton ariaLabel="Notifications" onClick={() => {}} colors={c} notificationDot>
            <Bell size={18} />
          </TopbarIconButton>

          {/* Account */}
          <div ref={userTriggerRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              aria-expanded={userMenuOpen}
              aria-haspopup="menu"
              aria-label="Account menu"
              onClick={() => setUserMenuOpen((o) => !o)}
              onMouseEnter={() => setUserChipHover(true)}
              onMouseLeave={() => setUserChipHover(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px 6px 6px',
                borderRadius: 12,
                cursor: 'pointer',
                background: userMenuOpen || userChipHover ? c.hoverBg : c.profileBg,
                border: `1px solid ${c.profileBorder}`,
                boxShadow: userMenuOpen || userChipHover ? c.profileHoverGlow : 'none',
                transition: TOPBAR_TRANSITION,
                maxWidth: isMobile ? 200 : 280,
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: '50%',
                  background: settings?.profileAvatar
                    ? `url(${settings.profileAvatar}) center/cover`
                    : 'linear-gradient(135deg, #0e5cff, #0839a3)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#fff',
                  position: 'relative',
                }}
              >
                {!settings?.profileAvatar && (user?.name || 'U').charAt(0).toUpperCase()}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 10,
                    height: 10,
                    background: '#22c55e',
                    borderRadius: '50%',
                    border: `2px solid ${c.avatarStatusRing}`,
                  }}
                />
              </div>
              <div
                className="min-w-0 text-left hidden min-[480px]:block"
                style={{ flex: 1, overflow: 'hidden' }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.text,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.name || 'User'}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: c.textMuted,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.email}
                </div>
              </div>
              <ChevronsUpDown
                size={16}
                style={{
                  color: c.textMuted,
                  flexShrink: 0,
                  opacity: userChipHover || userMenuOpen ? 1 : 0.7,
                  transition: TOPBAR_TRANSITION,
                }}
              />
            </button>

            {userMenuOpen &&
              typeof document !== 'undefined' &&
              createPortal(
                <>
                  <div
                    role="presentation"
                    aria-hidden
                    onClick={() => setUserMenuOpen(false)}
                    style={{ position: 'fixed', inset: 0, zIndex: 109 }}
                  />
                  <div
                    ref={userDropdownRef}
                    role="menu"
                    style={{
                      position: 'fixed',
                      top: userMenuPos.top,
                      left: userMenuPos.left,
                      width: userMenuPos.width,
                      background: c.cardBg,
                      border: `1px solid ${c.border}`,
                      borderRadius: 12,
                      padding: 4,
                      zIndex: 110,
                      boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
                    }}
                  >
                    <div style={{ padding: '10px 12px 8px' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: c.text }}>My Account</div>
                      <div
                        style={{
                          fontSize: 12,
                          color: c.textMuted,
                          marginTop: 2,
                          wordBreak: 'break-all',
                        }}
                      >
                        {user?.email}
                      </div>
                    </div>
                    <div style={{ height: 1, background: c.border, margin: '4px 0' }} />
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setUserMenuOpen(false);
                        closeMobileDrawer();
                        navigate('/profile');
                      }}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        background: 'transparent',
                        color: c.text,
                        fontSize: 14,
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = c.hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <User size={16} style={{ flexShrink: 0 }} />
                      Profile
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      style={{
                        display: 'flex',
                        width: '100%',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: 'none',
                        cursor: 'pointer',
                        background: 'transparent',
                        color: c.text,
                        fontSize: 14,
                        textAlign: 'left',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = c.hoverBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <LogOut size={16} style={{ flexShrink: 0 }} />
                      Log out
                    </button>
                  </div>
                </>,
                document.body
              )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;