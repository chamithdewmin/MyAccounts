import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

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

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const buildCalendarCells = (visibleMonth) => {
  const firstDay = startOfMonth(visibleMonth);
  const startWeekday = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startWeekday);

  return Array.from({ length: 42 }, (_, idx) => {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + idx);
    return d;
  });
};

const isSameDate = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const DateTextPicker = ({ value, onChange, id, className = '' }) => {
  const [displayValue, setDisplayValue] = useState(formatIsoToDisplay(value));
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selectedDate = useMemo(() => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [value]);
  const [visibleMonth, setVisibleMonth] = useState(selectedDate || new Date());
  const calendarCells = useMemo(() => buildCalendarCells(visibleMonth), [visibleMonth]);

  useEffect(() => {
    setDisplayValue(formatIsoToDisplay(value));
  }, [value]);

  useEffect(() => {
    if (selectedDate) setVisibleMonth(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

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
    <div ref={rootRef} className={`relative ${className}`}>
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
        onFocus={() => setOpen(true)}
        aria-describedby={describedBy}
        className="pr-10"
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open calendar"
      >
        <Calendar className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute z-50 mt-2 w-[280px] rounded-2xl border border-border bg-[#080c14] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
              onClick={() =>
                setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
              }
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-slate-100">
              {visibleMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-slate-100"
              onClick={() =>
                setVisibleMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
              }
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 text-center text-xs font-semibold text-slate-500">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((day) => {
              const sameMonth = day.getMonth() === visibleMonth.getMonth();
              const selected = isSameDate(day, selectedDate);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  className={`h-9 rounded-md text-sm transition-colors ${
                    selected
                      ? 'bg-blue-600 font-semibold text-white'
                      : sameMonth
                        ? 'text-slate-100 hover:bg-white/10'
                        : 'text-slate-500 hover:bg-white/5'
                  }`}
                  onClick={() => {
                    const iso = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
                    onChange(iso);
                    setDisplayValue(formatIsoToDisplay(iso));
                    setOpen(false);
                  }}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTextPicker;
