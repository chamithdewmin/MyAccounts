import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar } from 'lucide-react';

import { Input } from '@/components/ui/input';

const pad = (n) => String(n).padStart(2, '0');

const formatIsoToDisplay = (isoDate) => {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '';
  const [y, m, d] = isoDate.split('-');
  return `${m}/${d}/${y}`;
};

const parseDisplayToIso = (displayDate) => {
  const clean = String(displayDate || '').trim();
  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null;
  const candidate = new Date(year, month - 1, day);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${pad(month)}-${pad(day)}`;
};

const DateTextPicker = ({ value, onChange, id, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(formatIsoToDisplay(value));
  const nativeDateRef = useRef(null);

  useEffect(() => {
    setDisplayValue(formatIsoToDisplay(value));
  }, [value]);

  const describedBy = useMemo(() => (id ? `${id}-hint` : undefined), [id]);

  const tryCommit = (nextDisplayValue) => {
    if (!nextDisplayValue.trim()) {
      onChange('');
      return;
    }
    const iso = parseDisplayToIso(nextDisplayValue);
    if (iso) onChange(iso);
  };

  return (
    <div className={`relative ${className}`}>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="mm/dd/yyyy"
        value={displayValue}
        onChange={(e) => {
          const next = e.target.value;
          setDisplayValue(next);
          tryCommit(next);
        }}
        onBlur={() => {
          const iso = parseDisplayToIso(displayValue);
          setDisplayValue(iso ? formatIsoToDisplay(iso) : displayValue.trim());
        }}
        aria-describedby={describedBy}
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        onClick={() => {
          if (nativeDateRef.current?.showPicker) {
            nativeDateRef.current.showPicker();
          } else {
            nativeDateRef.current?.focus();
            nativeDateRef.current?.click();
          }
        }}
        aria-label="Open calendar"
      >
        <Calendar className="h-4 w-4" />
      </button>
      <input
        ref={nativeDateRef}
        type="date"
        value={value || ''}
        onChange={(e) => {
          const nextIso = e.target.value;
          onChange(nextIso);
          setDisplayValue(formatIsoToDisplay(nextIso));
        }}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
    </div>
  );
};

export default DateTextPicker;
