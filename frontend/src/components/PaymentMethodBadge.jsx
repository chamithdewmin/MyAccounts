import React from 'react';

const METHOD_CONFIG = {
  cash: {
    label: 'Cash',
    bg: 'bg-green-500/15',
    text: 'text-green-500',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2"/>
        <circle cx="12" cy="12" r="2"/>
        <path d="M6 12h.01M18 12h.01"/>
      </svg>
    ),
  },
  bank: {
    label: 'Bank',
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/>
        <path d="M12 2L3 9h18L12 2z"/>
      </svg>
    ),
  },
  card: {
    label: 'Card',
    bg: 'bg-violet-500/15',
    text: 'text-violet-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    ),
  },
  online: {
    label: 'Online',
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 2a14.5 14.5 0 0 0 0 20A14.5 14.5 0 0 0 12 2"/><line x1="2" y1="12" x2="22" y2="12"/>
      </svg>
    ),
  },
};

const PaymentMethodBadge = ({ method, className = '' }) => {
  const key = String(method || 'cash').toLowerCase().replace(/[_\s]+/g, '');
  const cfg = METHOD_CONFIG[key] || {
    label: method || 'Unknown',
    bg: 'bg-secondary',
    text: 'text-muted-foreground',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text} ${className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

export default PaymentMethodBadge;
