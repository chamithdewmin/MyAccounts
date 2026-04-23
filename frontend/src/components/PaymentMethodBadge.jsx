import React from 'react';
import cardIcon from '@/assets/card.png';
import cashIcon from '@/assets/cash.png';
import bankIcon from '@/assets/bank.png';
import onlineIcon from '@/assets/online_pay.png';

const METHOD_CONFIG = {
  cash:   { label: 'Cash',   icon: cashIcon },
  bank:   { label: 'Bank',   icon: bankIcon },
  card:   { label: 'Card',   icon: cardIcon },
  online: { label: 'Online', icon: onlineIcon },
};

const normalizeKey = (method) => {
  const s = String(method || 'cash').toLowerCase().replace(/[_\s]+/g, '');
  if (s.startsWith('online')) return 'online';
  if (s.startsWith('bank') || s.startsWith('transfer')) return 'bank';
  if (s.startsWith('card') || s.startsWith('credit') || s.startsWith('debit')) return 'card';
  if (s.startsWith('cash')) return 'cash';
  return s;
};

const PaymentMethodBadge = ({ method, size = 44, className = '' }) => {
  const key = normalizeKey(method);
  const cfg = METHOD_CONFIG[key];

  if (!cfg) {
    return (
      <span title={method || 'Unknown'} className={`inline-flex items-center justify-center rounded-full bg-secondary text-muted-foreground text-xs ${className}`}
        style={{ width: size, height: size }}>
        ?
      </span>
    );
  }

  return (
    <img
      src={cfg.icon}
      alt={cfg.label}
      title={cfg.label}
      loading="eager"
      decoding="sync"
      width={size}
      height={size}
      className={`inline-block object-contain flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

export default PaymentMethodBadge;
