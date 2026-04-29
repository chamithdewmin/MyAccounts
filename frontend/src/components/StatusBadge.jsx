import React from 'react';

const STATUS_STYLES = {
  paid: { dot: 'bg-[#25e16b]', label: 'Paid' },
  unpaid: { dot: 'bg-slate-400', label: 'Unpaid' },
  pending: { dot: 'bg-amber-400', label: 'Pending' },
  failed: { dot: 'bg-[#ff4b4b]', label: 'Failed' },
  sent: { dot: 'bg-[#25e16b]', label: 'Sent' },
  received: { dot: 'bg-[#25e16b]', label: 'Received' },
  overdue: { dot: 'bg-[#ff4b4b]', label: 'Overdue' },
  upcoming: { dot: 'bg-amber-400', label: 'Upcoming' },
  draft: { dot: 'bg-slate-400', label: 'Draft' },
  accepted: { dot: 'bg-[#25e16b]', label: 'Accepted' },
  rejected: { dot: 'bg-[#ff4b4b]', label: 'Rejected' },
  converted: { dot: 'bg-blue-400', label: 'Converted' },
  active: { dot: 'bg-[#25e16b]', label: 'Active' },
  inactive: { dot: 'bg-slate-400', label: 'Inactive' },
};

const toLabel = (raw) =>
  String(raw || 'pending')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());

const StatusBadge = ({ status, className = '' }) => {
  const key = String(status || 'pending').toLowerCase().trim();
  const config = STATUS_STYLES[key] || { dot: 'bg-amber-400', label: toLabel(key) };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#0f1115] px-2.5 py-1 text-xs font-semibold text-slate-100 ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${config.dot}`} aria-hidden="true" />
      {config.label}
    </span>
  );
};

export default StatusBadge;
