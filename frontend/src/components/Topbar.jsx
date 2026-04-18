import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { useSidebarState } from '@/components/SidebarNew';

const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    border: "#262626",
    text: isDark ? "#fff" : "#0f172a",
    textMuted: isDark ? "#8b9ab0" : "#64748b",
    inputBg: isDark ? "#1e293b" : "#f1f5f9",
    cardBg: isDark ? "#0a0a0a" : "#ffffff",
    pageBg: isDark ? "#000000" : "#f8fafc",
    hoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    todayBg: isDark ? "#0e5cff" : "#0e5cff",
    blue: "#0e5cff",
    green: "#22c55e",
    red: "#ef4444",
    yellow: "#eab308",
    purple: "#a78bfa",
  };
};

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
  const { isMobile, openMobileDrawer } = useSidebarState();
  const [searchQuery, setSearchQuery] = useState('');
  const [colors, setColors] = useState(getColors);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const calendarRef = useRef(null);
  const searchRef = useRef(null);
  const inputRef = useRef(null);
  const c = colors;

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleSearchFocus = () => {
    setSearchOpen(true);
  };

  const handleSearchSelect = (text) => {
    setSearchQuery(text);
    inputRef.current?.focus();
  };

  return (
    <header
      className="border-b border-border/70 max-lg:px-4 max-lg:pb-3 max-lg:min-h-[60px] lg:border-b-0 lg:px-5 lg:pr-10 lg:pt-5 lg:pb-3"
      style={{
        background: c.pageBg,
        paddingTop: isMobile ? 'max(12px, env(safe-area-inset-top, 0px))' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {isMobile && (
          <button
            type="button"
            aria-label="Open menu"
            onClick={openMobileDrawer}
            style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 50,
              padding: 10,
              cursor: 'pointer',
              color: c.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Menu size={20} />
          </button>
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
            }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder={isMobile ? 'Search…' : 'Search clients, invoices, payments...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={handleSearchFocus}
            style={{
              width: '100%',
              paddingLeft: 38,
              paddingRight: 70,
              paddingTop: 10,
              paddingBottom: 10,
              background: c.inputBg,
              border: `1px solid ${c.border}`,
              borderRadius: 50,
              fontSize: 14,
              color: c.text,
              outline: 'none',
              fontFamily: "'Inter', sans-serif",
              transition: 'border-color 0.2s',
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
              <kbd style={{ 
                background: c.hoverBg, 
                border: `1px solid ${c.border}`, 
                borderRadius: 4, 
                padding: '2px 5px', 
                fontSize: 10, 
                color: c.textMuted,
                fontFamily: 'system-ui, sans-serif',
              }}>⌘</kbd>
              <kbd style={{ 
                background: c.hoverBg, 
                border: `1px solid ${c.border}`, 
                borderRadius: 4, 
                padding: '2px 5px', 
                fontSize: 10, 
                color: c.textMuted,
                fontFamily: 'system-ui, sans-serif',
              }}>K</kbd>
            </div>
          )}
          {/* Clear button */}
          {searchOpen && searchQuery && (
            <button
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

        {/* Right side — date, calendar, notifications (must not shrink behind search) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Date */}
          <div 
            style={{ 
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 50,
              padding: '8px 18px',
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
          <div ref={calendarRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setCalendarOpen(!calendarOpen)}
              style={{
                background: c.cardBg,
                border: `1px solid ${c.border}`,
                borderRadius: 50,
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
            {calendarOpen && <MiniCalendar colors={c} onClose={() => setCalendarOpen(false)} />}
          </div>

          {/* Notification Icon */}
          <button
            type="button"
            style={{
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 50,
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