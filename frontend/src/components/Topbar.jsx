import React, { useState, useEffect, useRef } from 'react';
import { Search, Calendar, Bell, ChevronLeft, ChevronRight } from 'lucide-react';

const getColors = () => {
  const isDark = document.documentElement.classList.contains('dark');
  return {
    border: isDark ? "#171717" : "#e2e8f0",
    text: isDark ? "#fff" : "#0f172a",
    textMuted: isDark ? "#8b9ab0" : "#64748b",
    inputBg: isDark ? "#1e293b" : "#f1f5f9",
    cardBg: isDark ? "#0a0a0a" : "#ffffff",
    hoverBg: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    todayBg: isDark ? "#0e5cff" : "#0e5cff",
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

const Topbar = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [colors, setColors] = useState(getColors);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const calendarRef = useRef(null);
  const c = colors;

  useEffect(() => {
    const updateColors = () => setColors(getColors());
    window.addEventListener('theme-change', updateColors);
    return () => window.removeEventListener('theme-change', updateColors);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setCalendarOpen(false);
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
        <div style={{ position: 'relative', flex: 1, maxWidth: 420 }}>
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
              borderRadius: 50,
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