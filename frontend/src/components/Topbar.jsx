import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Briefcase,
  FolderOpen,
  BellRing,
  Package,
  Landmark,
  Navigation,
  ClipboardList,
  BarChart3,
  Settings2,
  Sparkles,
  FolderKanban,
  HandCoins,
  TrendingUp,
  UserSquare2,
  ShieldCheck,
} from 'lucide-react';
import { useSidebarState } from '@/components/Sidebar';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';

const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    border: isDark ? "#1e1e1e" : "#e1e1e1",
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

const PAGE_SHORTCUTS = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Income / Payments', path: '/income' },
  { name: 'Expenses', path: '/expenses' },
  { name: 'Invoices', path: '/invoices' },
  { name: 'Estimates', path: '/estimates' },
  { name: 'Clients', path: '/clients' },
  { name: 'Projects', path: '/projects' },
  { name: 'File Manager', path: '/file-manager' },
  { name: 'Cash Flow', path: '/cash-flow' },
  { name: 'Calendar', path: '/calendar' },
  { name: 'Reminders', path: '/reminders' },
  { name: 'Reports', path: '/reports' },
  { name: 'SMS', path: '/sms' },
  { name: 'Settings', path: '/settings' },
  { name: 'Users', path: '/users' },
  { name: 'AI Insights', path: '/ai-insights' },
  { name: 'Backup & Restore', path: '/backup-restore' },
  { name: 'Login Activity', path: '/login-activity' },
];

const PAGE_META = [
  { match: (path) => path === '/dashboard', title: 'Dashboard', subtitle: 'Track your business performance in one place.', Icon: Navigation },
  { match: (path) => path === '/income', title: 'Income', subtitle: 'Manage incoming payments and revenue records.', Icon: TrendingUp },
  { match: (path) => path === '/expenses', title: 'Expenses', subtitle: 'Monitor costs, categories, and recurring spend.', Icon: Receipt },
  { match: (path) => path === '/invoices', title: 'Invoices', subtitle: 'Create, send, and track invoice payments.', Icon: FileText },
  { match: (path) => path === '/estimates', title: 'Estimates', subtitle: 'Prepare and manage client quotations.', Icon: ClipboardList },
  { match: (path) => path === '/clients', title: 'Clients', subtitle: 'View and manage customer information.', Icon: Users },
  { match: (path) => path.startsWith('/projects'), title: 'Projects', subtitle: 'Plan and track active work items.', Icon: FolderKanban },
  { match: (path) => path === '/file-manager', title: 'File Manager', subtitle: 'Organize receipts, reports, and uploads.', Icon: FolderOpen },
  { match: (path) => path === '/cash-flow', title: 'Cash Flow', subtitle: 'Analyze money in and money out trends.', Icon: HandCoins },
  { match: (path) => path === '/calendar', title: 'Calendar', subtitle: 'Schedule events and important dates.', Icon: Calendar },
  { match: (path) => path.startsWith('/reports'), title: 'Reports', subtitle: 'Review analytics and financial statements.', Icon: BarChart3 },
  { match: (path) => path === '/sms', title: 'SMS', subtitle: 'Send and configure customer reminders.', Icon: BellRing },
  { match: (path) => path === '/settings', title: 'Settings', subtitle: 'Manage your business, profile and preferences.', Icon: Settings2 },
  { match: (path) => path === '/users', title: 'Users', subtitle: 'Manage team members and access control.', Icon: UserSquare2 },
  { match: (path) => path === '/ai-insights', title: 'AI Insights', subtitle: 'Get smart recommendations for your business.', Icon: Sparkles },
  { match: (path) => path === '/backup-restore', title: 'Backup & Restore', subtitle: 'Secure and recover your account data.', Icon: ShieldCheck },
  { match: (path) => path === '/login-activity', title: 'Login Activity', subtitle: 'Review account sign-in history.', Icon: ShieldCheck },
  { match: (path) => path === '/reminders', title: 'Reminders', subtitle: 'Create and manage reminder schedules.', Icon: Bell },
];

const getPageMeta = (pathname) => PAGE_META.find((item) => item.match(pathname)) || null;

// Search Results Dropdown Component
const SearchResults = ({ query, colors, onClose, onSelect }) => {
  const c = colors;
  const navigate = useNavigate();
  const { incomes, expenses, clients, invoices, estimates, assets, loans } = useFinance();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [projects, setProjects] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [files, setFiles] = useState([]);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  });

  // Fetch projects and reminders once on mount
  useEffect(() => {
    api.projects.list().then(res => setProjects(Array.isArray(res) ? res : [])).catch(() => {});
    api.reminders.list().then(res => setReminders(Array.isArray(res) ? res : [])).catch(() => {});
  }, []);

  // Fetch files from backend search API (debounced)
  useEffect(() => {
    if (!query || query.length < 2) {
      setFiles([]);
      return;
    }
    const timer = setTimeout(() => {
      api.files.list({ q: query, scope: 'all' })
        .then(res => setFiles(Array.isArray(res) ? res.slice(0, 3) : []))
        .catch(() => setFiles([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const pageResults = React.useMemo(() => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    return PAGE_SHORTCUTS.filter(p => p.name.toLowerCase().includes(q)).slice(0, 3);
  }, [query]);

  const searchResults = React.useMemo(() => {
    if (!query || query.length < 2) return {
      clients: [], invoices: [], incomes: [], expenses: [],
      estimates: [], projects: [], reminders: [], assets: [], loans: [],
      total: 0,
    };

    const q = query.toLowerCase();

    const matchedClients = clients.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(q)
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

    const matchedEstimates = (estimates || []).filter(est =>
      est.estimateNumber?.toLowerCase().includes(q) ||
      est.invoiceNumber?.toLowerCase().includes(q) ||
      est.clientName?.toLowerCase().includes(q) ||
      String(est.total).includes(q)
    ).slice(0, 3);

    const matchedProjects = projects.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.clientName?.toLowerCase().includes(q) ||
      p.status?.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedReminders = reminders.filter(r =>
      r.title?.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedAssets = (assets || []).filter(a =>
      a.name?.toLowerCase().includes(q) ||
      a.description?.toLowerCase().includes(q) ||
      a.category?.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedLoans = (loans || []).filter(l =>
      l.name?.toLowerCase().includes(q) ||
      l.lender?.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q)
    ).slice(0, 3);

    const total =
      matchedClients.length + matchedInvoices.length + matchedIncomes.length +
      matchedExpenses.length + matchedEstimates.length + matchedProjects.length +
      matchedReminders.length + matchedAssets.length + matchedLoans.length;

    return {
      clients: matchedClients,
      invoices: matchedInvoices,
      incomes: matchedIncomes,
      expenses: matchedExpenses,
      estimates: matchedEstimates,
      projects: matchedProjects,
      reminders: matchedReminders,
      assets: matchedAssets,
      loans: matchedLoans,
      total,
    };
  }, [query, clients, invoices, incomes, expenses, estimates, projects, reminders, assets, loans]);

  const allResults = React.useMemo(() => {
    const results = [];
    pageResults.forEach(item => results.push({ type: 'page', item }));
    searchResults.clients.forEach(item => results.push({ type: 'client', item }));
    searchResults.invoices.forEach(item => results.push({ type: 'invoice', item }));
    searchResults.estimates.forEach(item => results.push({ type: 'estimate', item }));
    searchResults.incomes.forEach(item => results.push({ type: 'income', item }));
    searchResults.expenses.forEach(item => results.push({ type: 'expense', item }));
    searchResults.projects.forEach(item => results.push({ type: 'project', item }));
    files.forEach(item => results.push({ type: 'file', item }));
    searchResults.reminders.forEach(item => results.push({ type: 'reminder', item }));
    searchResults.assets.forEach(item => results.push({ type: 'asset', item }));
    searchResults.loans.forEach(item => results.push({ type: 'loan', item }));
    return results;
  }, [searchResults, pageResults, files]);

  const grandTotal = searchResults.total + pageResults.length + files.length;

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
      case 'page': navigate(result.item.path); break;
      case 'client': navigate('/clients'); break;
      case 'invoice': navigate('/invoices'); break;
      case 'estimate': navigate('/estimates'); break;
      case 'income': navigate('/income'); break;
      case 'expense': navigate('/expenses'); break;
      case 'project': navigate(`/projects`); break;
      case 'file': navigate('/file-manager'); break;
      case 'reminder': navigate('/reminders'); break;
      case 'asset': navigate('/dashboard'); break;
      case 'loan': navigate('/dashboard'); break;
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
      case 'estimate': return <ClipboardList size={16} style={{ color: c.yellow }} />;
      case 'income': return <CreditCard size={16} style={{ color: c.green }} />;
      case 'expense': return <Receipt size={16} style={{ color: c.red }} />;
      case 'project': return <Briefcase size={16} style={{ color: c.blue }} />;
      case 'file': return <FolderOpen size={16} style={{ color: c.yellow }} />;
      case 'reminder': return <BellRing size={16} style={{ color: c.purple }} />;
      case 'asset': return <Package size={16} style={{ color: c.green }} />;
      case 'loan': return <Landmark size={16} style={{ color: c.red }} />;
      case 'page': return <Navigation size={16} style={{ color: c.textMuted }} />;
      default: return <Search size={16} />;
    }
  };

  const formatAmount = (amount) => `LKR ${(amount || 0).toLocaleString()}`;

  const ResultRow = ({ type, item, label, sublabel, rightLabel, rightColor }) => {
    const idx = allResults.findIndex(r => r.type === type && r.item === item);
    const isSelected = idx === selectedIndex;
    return (
      <div
        onClick={() => handleResultClick({ type, item })}
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
        {getIcon(type)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: c.text, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
          {sublabel && <div style={{ color: c.textMuted, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sublabel}</div>}
        </div>
        {rightLabel && <span style={{ color: rightColor || c.textMuted, fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{rightLabel}</span>}
        {!rightLabel && <ArrowRight size={14} style={{ color: c.textMuted, flexShrink: 0 }} />}
      </div>
    );
  };

  const SectionHeader = ({ label }) => (
    <div style={{ padding: '8px 12px', color: c.textMuted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      {label}
    </div>
  );

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
      maxHeight: 480,
      overflowY: 'auto',
    }}>
      {/* Recent searches */}
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
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.background = c.hoverBg}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Clock size={14} style={{ color: c.textMuted }} />
              <span style={{ color: c.text, fontSize: 13 }}>{search}</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty state hint */}
      {(!query || query.length < 2) && recentSearches.length === 0 && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: c.textMuted, fontSize: 13, margin: '0 0 4px' }}>
            Search clients, invoices, estimates, expenses, projects, files, reminders and more
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12 }}>
            <kbd style={{ background: c.hoverBg, border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 11, color: c.textMuted }}>↑↓</kbd>
            <span style={{ color: c.textMuted, fontSize: 11 }}>Navigate</span>
            <kbd style={{ background: c.hoverBg, border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 11, color: c.textMuted, marginLeft: 8 }}>Enter</kbd>
            <span style={{ color: c.textMuted, fontSize: 11 }}>Select</span>
            <kbd style={{ background: c.hoverBg, border: `1px solid ${c.border}`, borderRadius: 4, padding: '2px 6px', fontSize: 11, color: c.textMuted, marginLeft: 8 }}>Esc</kbd>
            <span style={{ color: c.textMuted, fontSize: 11 }}>Close</span>
          </div>
        </div>
      )}

      {/* No results */}
      {query && query.length >= 2 && grandTotal === 0 && (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <p style={{ color: c.textMuted, fontSize: 13, margin: 0 }}>
            No results found for "{query}"
          </p>
        </div>
      )}

      {/* Results */}
      {query && query.length >= 2 && grandTotal > 0 && (
        <div style={{ padding: 8 }}>

          {/* Pages */}
          {pageResults.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Pages" />
              {pageResults.map((page, i) => (
                <ResultRow key={i} type="page" item={page} label={page.name} sublabel="Go to page" />
              ))}
            </div>
          )}

          {/* Clients */}
          {searchResults.clients.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Clients" />
              {searchResults.clients.map((client, i) => (
                <ResultRow key={client.id || i} type="client" item={client}
                  label={client.name}
                  sublabel={client.email || client.phone}
                />
              ))}
            </div>
          )}

          {/* Invoices */}
          {searchResults.invoices.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Invoices" />
              {searchResults.invoices.map((inv, i) => (
                <ResultRow key={inv.id || i} type="invoice" item={inv}
                  label={inv.invoiceNumber || `Invoice`}
                  sublabel={inv.clientName}
                  rightLabel={formatAmount(inv.total)}
                />
              ))}
            </div>
          )}

          {/* Estimates */}
          {searchResults.estimates.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Estimates" />
              {searchResults.estimates.map((est, i) => (
                <ResultRow key={est.id || i} type="estimate" item={est}
                  label={est.estimateNumber || est.invoiceNumber || `Estimate`}
                  sublabel={est.clientName}
                  rightLabel={formatAmount(est.total)}
                  rightColor={c.yellow}
                />
              ))}
            </div>
          )}

          {/* Payments */}
          {searchResults.incomes.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Payments" />
              {searchResults.incomes.map((inc, i) => (
                <ResultRow key={inc.id || i} type="income" item={inc}
                  label={inc.clientName || inc.serviceType}
                  sublabel={inc.serviceType}
                  rightLabel={`+${formatAmount(inc.amount)}`}
                  rightColor={c.green}
                />
              ))}
            </div>
          )}

          {/* Expenses */}
          {searchResults.expenses.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Expenses" />
              {searchResults.expenses.map((exp, i) => (
                <ResultRow key={exp.id || i} type="expense" item={exp}
                  label={exp.category}
                  sublabel={exp.description || exp.vendor}
                  rightLabel={`-${formatAmount(exp.amount)}`}
                  rightColor={c.red}
                />
              ))}
            </div>
          )}

          {/* Projects */}
          {searchResults.projects.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Projects" />
              {searchResults.projects.map((proj, i) => (
                <ResultRow key={proj.id || i} type="project" item={proj}
                  label={proj.name}
                  sublabel={proj.clientName || proj.status}
                />
              ))}
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Files" />
              {files.map((file, i) => (
                <ResultRow key={file.id || i} type="file" item={file}
                  label={file.name || file.originalName}
                  sublabel={file.fileType || file.type}
                />
              ))}
            </div>
          )}

          {/* Reminders */}
          {searchResults.reminders.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Reminders" />
              {searchResults.reminders.map((rem, i) => (
                <ResultRow key={rem.id || i} type="reminder" item={rem}
                  label={rem.title}
                  sublabel={rem.description || rem.notes}
                />
              ))}
            </div>
          )}

          {/* Assets */}
          {searchResults.assets.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Assets" />
              {searchResults.assets.map((asset, i) => (
                <ResultRow key={asset.id || i} type="asset" item={asset}
                  label={asset.name}
                  sublabel={asset.category || asset.description}
                  rightLabel={asset.value ? formatAmount(asset.value) : undefined}
                />
              ))}
            </div>
          )}

          {/* Loans */}
          {searchResults.loans.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <SectionHeader label="Loans" />
              {searchResults.loans.map((loan, i) => (
                <ResultRow key={loan.id || i} type="loan" item={loan}
                  label={loan.name}
                  sublabel={loan.lender || loan.description}
                  rightLabel={loan.amount ? formatAmount(loan.amount) : undefined}
                />
              ))}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

const Topbar = () => {
  const { isMobile, openMobileDrawer } = useSidebarState();
  const location = useLocation();
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
  const pageMeta = getPageMeta(location.pathname);
  const HeaderIcon = pageMeta?.Icon;

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
        {!isMobile && pageMeta && HeaderIcon && (
          <div className="hidden lg:flex items-center gap-3 min-w-0 mr-1">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <HeaderIcon className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold leading-tight truncate">{pageMeta.title}</p>
              <p className="text-xs text-muted-foreground leading-tight truncate">{pageMeta.subtitle}</p>
            </div>
          </div>
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
            placeholder={isMobile ? 'Search…' : 'Search everything…'}
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
              border: `1px solid ${searchOpen ? c.blue : c.border}`,
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