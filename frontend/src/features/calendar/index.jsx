import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, DollarSign, Receipt, FileText, TrendingUp, Plus, Clock, Pencil, Trash2 } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { SiteConfirmDialog } from '@/components/ui/site-confirm-dialog';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';

const Calendar = () => {
  const { toast } = useToast();
  const { incomes, expenses, invoices, settings, loadData } = useFinance();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);
  const [eventEditingId, setEventEditingId] = useState(null);
  const [savingEvent, setSavingEvent] = useState(false);
  const [deletingEventId, setDeletingEventId] = useState(null);
  const deleteEventRef = useRef(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState('');
  const [eventForm, setEventForm] = useState({
    eventName: '',
    date: '',
    time: '',
    notes: '',
  });
  const currency = settings?.currency || 'LKR';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekDaysMobile = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Format any date (Date or string from API) as local YYYY-MM-DD so calendar matches DB dates correctly
  const toLocalDateString = (val) => {
    if (val == null) return '';
    const d = val instanceof Date ? val : new Date(val);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  /** Calendar-day key for events: DB/API may send "2026-04-17" or ISO "2026-04-17T00:00:00.000Z" — always compare YYYY-MM-DD. */
  const normalizeEventDateKey = (val) => {
    if (val == null || val === '') return '';
    if (typeof val === 'string') {
      const m = /^(\d{4}-\d{2}-\d{2})/.exec(val.trim());
      if (m) return m[1];
    }
    if (val instanceof Date && !Number.isNaN(val.getTime())) {
      const y = val.getFullYear();
      const mo = String(val.getMonth() + 1).padStart(2, '0');
      const day = String(val.getDate()).padStart(2, '0');
      return `${y}-${mo}-${day}`;
    }
    return toLocalDateString(val);
  };

  const getEventsForDate = (date) => {
    const dateStr = toLocalDateString(date);
    if (!dateStr) return [];
    return events.filter((ev) => normalizeEventDateKey(ev.date) === dateStr);
  };

  // Get transactions for a specific date (compare local dates so timezone doesn't shift the day)
  const getTransactionsForDate = (date) => {
    const dateStr = toLocalDateString(date);
    if (!dateStr) return { incomes: [], expenses: [], invoices: [] };
    const dayTransactions = {
      incomes: [],
      expenses: [],
      invoices: [],
    };

    incomes.forEach(income => {
      if (toLocalDateString(income.date) === dateStr) {
        dayTransactions.incomes.push(income);
      }
    });

    expenses.forEach(expense => {
      if (toLocalDateString(expense.date) === dateStr) {
        dayTransactions.expenses.push(expense);
      }
    });

    invoices.forEach(invoice => {
      const invDate = invoice.dueDate ?? invoice.createdAt;
      if (invDate && toLocalDateString(invDate) === dateStr) {
        dayTransactions.invoices.push(invoice);
      }
    });

    return dayTransactions;
  };

  // Calculate totals for a date
  const getDateTotals = (date) => {
    const transactions = getTransactionsForDate(date);
    const incomeTotal = transactions.incomes.reduce((sum, i) => sum + (i.amount || 0), 0);
    const expenseTotal = transactions.expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    const invoiceTotal = transactions.invoices
      .filter(inv => inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    return { incomeTotal, expenseTotal, invoiceTotal, net: incomeTotal - expenseTotal };
  };

  const normalizeEventRow = (ev) => ({
    id: ev.id,
    eventName: ev.eventName ?? ev.event_name,
    date: normalizeEventDateKey(ev.eventDate ?? ev.event_date),
    time: ev.eventTime != null ? String(ev.eventTime) : ev.event_time != null ? String(ev.event_time) : '',
    notes: ev.notes != null && ev.notes !== '' ? String(ev.notes) : '',
    createdAt: ev.createdAt ?? ev.created_at,
  });

  const loadCalendarEvents = useCallback(
    () =>
      api.calendarEvents
        .list()
        .then((rows) => {
          const normalized = Array.isArray(rows) ? rows.map((r) => normalizeEventRow(r)) : [];
          setEvents(normalized);
        })
        .catch((err) => {
          setEvents([]);
          toast({
            title: 'Could not load events',
            description: err?.message || 'Request failed',
            variant: 'destructive',
          });
        }),
    [toast],
  );

  const openAddEventDialog = (dateOverride) => {
    const baseDate = dateOverride ?? selectedDate ?? new Date(year, month, 1);
    setEventEditingId(null);
    setEventForm({
      eventName: '',
      date: toLocalDateString(baseDate),
      time: '',
      notes: '',
    });
    setIsEventDialogOpen(true);
  };

  const openEditEventDialog = (ev) => {
    setEventEditingId(ev.id);
    setEventForm({
      eventName: ev.eventName,
      date: ev.date,
      time: ev.time || '',
      notes: ev.notes || '',
    });
    setIsEventDialogOpen(true);
  };

  const handleSaveEvent = (e) => {
    e.preventDefault();
    const name = eventForm.eventName.trim();
    if (!name || !eventForm.date) return;
    setSavingEvent(true);
    const payload = {
      eventName: name,
      eventDate: eventForm.date,
      eventTime: eventForm.time || '',
      notes: eventForm.notes.trim(),
    };
    const req = eventEditingId
      ? api.calendarEvents.update(eventEditingId, payload)
      : api.calendarEvents.create(payload);

    req
      .then((ev) => {
        const normalized = normalizeEventRow(ev);
        if (eventEditingId) {
          setEvents((prev) => prev.map((row) => (row.id === normalized.id ? normalized : row)));
          toast({ title: 'Event updated' });
        } else {
          setEvents((prev) => [normalized, ...prev]);
          toast({ title: 'Event added' });
        }
        setIsEventDialogOpen(false);
        setEventEditingId(null);
      })
      .catch((err) => {
        toast({
          title: eventEditingId ? 'Could not update event' : 'Could not add event',
          description: err?.message || 'Request failed',
          variant: 'destructive',
        });
      })
      .finally(() => setSavingEvent(false));
  };

  const openDeleteEventConfirm = (ev) => {
    if (!ev?.id) return;
    deleteEventRef.current = ev;
    setDeleteConfirmMessage(`Delete “${ev.eventName}”?`);
    setDeleteConfirmOpen(true);
  };

  const executeDeleteEvent = async () => {
    const ev = deleteEventRef.current;
    if (!ev?.id) return;
    setDeletingEventId(ev.id);
    try {
      await api.calendarEvents.delete(ev.id);
      setEvents((prev) => prev.filter((row) => row.id !== ev.id));
      toast({ title: 'Event deleted' });
      if (eventEditingId === ev.id) {
        setIsEventDialogOpen(false);
        setEventEditingId(null);
      }
    } catch (err) {
      toast({
        title: 'Could not delete event',
        description: err?.message || 'Request failed',
        variant: 'destructive',
      });
    } finally {
      setDeletingEventId(null);
      deleteEventRef.current = null;
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate(new Date(year, month + direction, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const calendarDays = useMemo(() => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(date);
    }

    return days;
  }, [year, month, startingDayOfWeek, daysInMonth]);

  const [selectedDate, setSelectedDate] = useState(null);
  const selectedTransactions = selectedDate ? getTransactionsForDate(selectedDate) : null;
  const selectedTotals = selectedDate ? getDateTotals(selectedDate) : null;
  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  useEffect(() => {
    loadData?.();
    loadCalendarEvents();
    // loadData from FinanceContext is not referentially stable; still safe to call once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Helmet>
        <title>Calendar - LogozoPOS</title>
        <meta name="description" content="View your financial transactions in a calendar view" />
      </Helmet>

      <div className="page-y-sm min-w-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 flex-wrap">
              <CalendarIcon className="w-7 h-7 sm:w-8 sm:h-8 text-primary shrink-0" />
              Calendar
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              View your income, expenses, and invoices by date
            </p>
          </div>
          <Button onClick={openAddEventDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Event
          </Button>
        </div>

        {/* Calendar Navigation */}
        <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(-1)}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-bold">
                {monthNames[month]} {year}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateMonth(1)}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
            >
              Today
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Week day headers */}
            {weekDays.map((day, i) => (
              <div
                key={day}
                className="text-center font-semibold text-muted-foreground py-2"
              >
                <span className="hidden sm:inline text-sm">{day}</span>
                <span className="inline sm:hidden text-xs">{weekDaysMobile[i]}</span>
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((date, index) => {
              if (!date) {
                return <div key={`empty-${index}`} className="aspect-square sm:aspect-auto sm:min-h-[120px]" />;
              }

              const totals = getDateTotals(date);
              const dayEvents = getEventsForDate(date);
              const hasTransactions = totals.incomeTotal > 0 || totals.expenseTotal > 0 || totals.invoiceTotal > 0;
              const hasEvents = dayEvents.length > 0;
              const hasActivity = hasTransactions || hasEvents;
              const isSelected = selectedDate &&
                date.getDate() === selectedDate.getDate() &&
                date.getMonth() === selectedDate.getMonth() &&
                date.getFullYear() === selectedDate.getFullYear();

              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    "aspect-square sm:aspect-auto sm:min-h-[120px] p-1 sm:p-2 rounded-lg border transition-all text-left",
                    "hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary",
                    isToday(date) && "border-primary border-2",
                    isSelected && "bg-primary/10 border-primary",
                    !hasActivity && "border-border"
                  )}
                >
                  <div className="flex flex-col h-full">
                    <span className={cn(
                      "text-xs sm:text-sm font-semibold mb-1",
                      isToday(date) ? "text-primary" : "text-foreground"
                    )}>
                      {date.getDate()}
                    </span>

                    {/* Mobile: colored dots */}
                    {hasActivity && (
                      <div className="flex sm:hidden flex-wrap gap-0.5 mt-auto">
                        {totals.incomeTotal > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                        )}
                        {totals.expenseTotal > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                        {totals.invoiceTotal > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                        )}
                        {hasEvents && (
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                        )}
                      </div>
                    )}

                    {/* Desktop: full text with amounts */}
                    {hasActivity && (
                      <div className="hidden sm:flex flex-col gap-0.5 text-xs">
                        {totals.incomeTotal > 0 && (
                          <div className="text-green-500 flex items-center gap-1">
                            <DollarSign className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{totals.incomeTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {totals.expenseTotal > 0 && (
                          <div className="text-red-500 flex items-center gap-1">
                            <Receipt className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{totals.expenseTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {totals.invoiceTotal > 0 && (
                          <div className="text-yellow-500 flex items-center gap-1">
                            <FileText className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{totals.invoiceTotal.toLocaleString()}</span>
                          </div>
                        )}
                        {hasEvents && (
                          <div className="text-violet-400 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mobile dot legend */}
          <div className="flex sm:hidden items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Income</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Expense</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Invoice</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-400" /> Event</span>
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && selectedTransactions && (
          <div className="bg-card rounded-lg border border-border p-4 sm:p-6">
            <h3 className="text-lg font-bold mb-4">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h3>

            {selectedTotals && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Income</p>
                  <p className="text-lg font-bold text-green-500">
                    {currency} {selectedTotals.incomeTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                  <p className="text-lg font-bold text-red-500">
                    {currency} {selectedTotals.expenseTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Pending Invoices</p>
                  <p className="text-lg font-bold text-yellow-500">
                    {currency} {selectedTotals.invoiceTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Net</p>
                  <p className={cn(
                    "text-lg font-bold",
                    selectedTotals.net >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {currency} {selectedTotals.net.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Incomes */}
              {selectedTransactions.incomes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-green-500 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Income ({selectedTransactions.incomes.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.incomes.map((income) => (
                      <div
                        key={income.id}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{income.clientName || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">{income.serviceType || 'Income'}</p>
                        </div>
                        <p className="font-bold text-green-500">
                          {currency} {(income.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Expenses */}
              {selectedTransactions.expenses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-red-500 mb-2 flex items-center gap-2">
                    <Receipt className="w-4 h-4" />
                    Expenses ({selectedTransactions.expenses.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{expense.category || 'Expense'}</p>
                          <p className="text-sm text-muted-foreground">{expense.notes || 'No notes'}</p>
                        </div>
                        <p className="font-bold text-red-500">
                          {currency} {(expense.amount || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {selectedTransactions.invoices.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-yellow-500 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Invoices ({selectedTransactions.invoices.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTransactions.invoices.map((invoice) => (
                      <div
                        key={invoice.id || invoice.invoiceNumber}
                        className="bg-secondary/30 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{invoice.clientName || 'Unknown'}</p>
                          <p className="text-sm text-muted-foreground">
                            Invoice #{invoice.invoiceNumber || invoice.id} • {invoice.status}
                          </p>
                        </div>
                        <p className="font-bold text-yellow-500">
                          {currency} {(invoice.total || 0).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Events — always show when a day is selected */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <h4 className="text-sm font-semibold text-violet-400 flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4" />
                    Events ({selectedEvents.length})
                  </h4>
                  <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => openAddEventDialog(selectedDate)}>
                    <Plus className="w-3.5 h-3.5" />
                    Add event this day
                  </Button>
                </div>
                {selectedEvents.length > 0 ? (
                  <div className="space-y-2">
                    {selectedEvents
                      .slice()
                      .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                      .map((ev) => (
                        <div
                          key={ev.id}
                          className="bg-secondary/30 rounded-lg p-3 flex items-start justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-violet-300">{ev.eventName}</p>
                            {ev.notes ? (
                              <p className="text-sm text-muted-foreground line-clamp-2">{ev.notes}</p>
                            ) : null}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <div className="text-sm text-violet-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ev.time || 'All day'}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                aria-label="Edit event"
                                onClick={() => openEditEventDialog(ev)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                aria-label="Delete event"
                                disabled={deletingEventId === ev.id}
                                onClick={() => openDeleteEventConfirm(ev)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">No events on this date yet.</p>
                )}
              </div>

              {selectedTransactions.incomes.length === 0 &&
                selectedTransactions.expenses.length === 0 &&
                selectedTransactions.invoices.length === 0 &&
                selectedEvents.length === 0 && (
                  <p className="text-muted-foreground text-center py-6 border-t border-border mt-4">
                    No income, expenses, or invoices on this date.
                  </p>
                )}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={isEventDialogOpen}
        onOpenChange={(open) => {
          setIsEventDialogOpen(open);
          if (!open) setEventEditingId(null);
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{eventEditingId ? 'Edit event' : 'Add event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEvent} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="event-name">Event Name</Label>
              <Input
                id="event-name"
                value={eventForm.eventName}
                onChange={(e) => setEventForm((p) => ({ ...p, eventName: e.target.value }))}
                placeholder="Meeting, Follow-up, Deadline..."
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventForm.date}
                  onChange={(e) => setEventForm((p) => ({ ...p, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-time">Time</Label>
                <Input
                  id="event-time"
                  type="time"
                  value={eventForm.time}
                  onChange={(e) => setEventForm((p) => ({ ...p, time: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-notes">Additional Notes</Label>
              <textarea
                id="event-notes"
                className="w-full min-h-[90px] px-3 py-2 bg-input border border-border rounded-lg text-sm"
                value={eventForm.notes}
                onChange={(e) => setEventForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Optional notes"
              />
            </div>
            <div className="flex justify-end gap-2 flex-wrap">
              {eventEditingId ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="mr-auto"
                  disabled={savingEvent || deletingEventId === eventEditingId}
                  onClick={() => {
                    const ev = events.find((row) => row.id === eventEditingId);
                    if (ev) openDeleteEventConfirm(ev);
                  }}
                >
                  {deletingEventId === eventEditingId ? 'Deleting…' : 'Delete'}
                </Button>
              ) : null}
              <Button type="button" variant="outline" onClick={() => setIsEventDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingEvent}>
                {savingEvent ? 'Saving…' : eventEditingId ? 'Save changes' : 'Save event'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SiteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete event?"
        message={deleteConfirmMessage}
        onConfirm={executeDeleteEvent}
      />
    </>
  );
};

export default Calendar;
