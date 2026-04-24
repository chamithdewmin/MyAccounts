import React, { useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Search, DollarSign, Wallet, CreditCard, Download, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import PaymentMethodBadge from '@/components/PaymentMethodBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { SkeletonTable } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const SERVICE_TYPE_PRESETS = ['Graphic Job', 'Web Development'];
const SERVICE_TYPE_CUSTOM = '__custom__';

const POS = () => {
  const { incomes, clients, addIncome, updateIncome, deleteIncome, settings, dataLoading, loadData } = useFinance();
  const { toast } = useToast();

  const [form, setForm] = useState({
    clientId: '',
    clientName: '',
    serviceType: '',
    serviceTypeSelect: SERVICE_TYPE_PRESETS[0],
    paymentMethod: 'cash',
    amount: '',
    date: '',
    notes: '',
  });

  const [filters, setFilters] = useState({
    search: '',
    period: 'month', // month | year | all
    paymentMethod: 'all',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const clientSearchBlurRef = useRef(null);

  const clientNameMatches = useMemo(() => {
    const q = form.clientName.trim().toLowerCase();
    if (!q) return [];
    return clients.filter((c) => (c.name || '').toLowerCase().startsWith(q));
  }, [clients, form.clientName]);

  const applyClientFromDirectory = (c) => {
    setForm((prev) => ({
      ...prev,
      clientId: c.id,
      clientName: c.name || '',
    }));
    setClientSearchOpen(false);
  };

  const handleClientNameInput = (value) => {
    setForm((prev) => {
      const sel = prev.clientId && clients.find((x) => x.id === prev.clientId);
      const next = { ...prev, clientName: value };
      if (sel && (sel.name || '').toLowerCase() !== value.trim().toLowerCase()) {
        next.clientId = '';
      }
      return next;
    });
    setClientSearchOpen(true);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.amount) {
      toast({
        title: 'Amount is required',
        description: 'Please enter an income amount.',
      });
      return;
    }

    const selectedClient =
      clients.find((c) => c.id === form.clientId) || null;

    const serviceTypeResolved =
      form.serviceTypeSelect === SERVICE_TYPE_CUSTOM
        ? form.serviceType.trim()
        : form.serviceTypeSelect;

    if (!serviceTypeResolved) {
      toast({
        title: 'Service type required',
        description:
          form.serviceTypeSelect === SERVICE_TYPE_CUSTOM
            ? 'Enter a custom service type or choose a preset.'
            : 'Choose a service type.',
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      clientId: selectedClient?.id || null,
      clientName: selectedClient?.name || form.clientName,
      serviceType: serviceTypeResolved,
      paymentMethod: form.paymentMethod,
      amount: Number(form.amount),
      date: form.date || new Date().toISOString(),
      notes: form.notes,
    };

    if (editingIncome) {
      updateIncome(editingIncome.id, payload);
      toast({ title: 'Income updated', description: 'Income record has been updated.' });
      setEditingIncome(null);
    } else {
      addIncome(payload);
      toast({ title: 'Income added', description: 'New income record has been saved.' });
    }

    setForm({
      clientId: '',
      clientName: '',
      serviceType: '',
      serviceTypeSelect: SERVICE_TYPE_PRESETS[0],
      paymentMethod: 'cash',
      amount: '',
      date: '',
      notes: '',
    });
    setIsDialogOpen(false);
  };

  const openEdit = (income) => {
    setEditingIncome(income);
    const st = String(income.serviceType || '').trim();
    const isPreset = SERVICE_TYPE_PRESETS.includes(st);
    setForm({
      clientId: income.clientId || '',
      clientName: income.clientName || '',
      serviceType: isPreset ? '' : st,
      serviceTypeSelect: isPreset ? st : SERVICE_TYPE_CUSTOM,
      paymentMethod: income.paymentMethod || 'cash',
      amount: String(income.amount || ''),
      date: income.date ? income.date.slice(0, 10) : '',
      notes: income.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteIncome = (income) => {
    setDeleteCandidate(income);
  };

  const filteredIncomes = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    return incomes.filter((income) => {
      const d = new Date(income.date);
      if (Number.isNaN(d.getTime())) return false;

      if (filters.period === 'month') {
        if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return false;
      } else if (filters.period === 'year') {
        if (d.getFullYear() !== thisYear) return false;
      }

      if (filters.paymentMethod !== 'all' && income.paymentMethod !== filters.paymentMethod) {
        return false;
      }

      if (filters.search) {
        const q = filters.search.toLowerCase();
        const haystack = `${income.clientName} ${income.serviceType}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });
  }, [incomes, filters]);

  const totalFilteredIncome = useMemo(
    () => filteredIncomes.reduce((sum, i) => sum + i.amount, 0),
    [filteredIncomes],
  );

  const summary = useMemo(() => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    let total = 0;
    let cash = 0;
    let nonCash = 0;

    incomes.forEach((inc) => {
      const d = new Date(inc.date);
      if (Number.isNaN(d.getTime())) return;
      if (d.getMonth() !== thisMonth || d.getFullYear() !== thisYear) return;

      total += inc.amount;
      if (inc.paymentMethod === 'cash') cash += inc.amount;
      else nonCash += inc.amount;
    });

    return { total, cash, nonCash };
  }, [incomes]);

  const exportCSV = () => {
    const headers = ['ID', 'Client', 'Service', 'Amount', 'Payment Method', 'Date', 'Notes'];
    const rows = incomes.map((inc) => [
      inc.id,
      inc.clientName,
      inc.serviceType,
      inc.amount,
      inc.paymentMethod,
      inc.date,
      (inc.notes || '').replace(/[\r\n]+/g, ' '),
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'income.csv';
    a.click();

    toast({
      title: 'Export successful',
      description: 'Income exported to CSV',
    });
  };

  return (
    <>
      <Helmet>
        <title>Income - LOGOZODEV</title>
        <meta name="description" content="Manage all money coming into your business" />
      </Helmet>

      <div className="page-y">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Income Management</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
              Track client payments, services, and cash inflow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end lg:shrink-0">
            <Button
              variant="outline"
              onClick={() => {
                loadData();
                toast({
                  title: 'Refreshed',
                  description: 'Income data has been refreshed.',
                });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Income
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-lg border border-border p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total Income
              </p>
              <p className="text-2xl font-bold">
                {settings.currency} {summary.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">This month</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-black dark:text-white stroke-2" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-card rounded-lg border border-border p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Cash Income
              </p>
              <p className="text-2xl font-bold">
                {settings.currency} {summary.cash.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Payments received in cash</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-lg border border-border p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Non‑cash Income
              </p>
              <p className="text-2xl font-bold">
                {settings.currency} {summary.nonCash.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Bank & online payments</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
          </motion.div>
        </div>

        {/* Search */}
        <div className="max-w-xl">
          <div className="relative">
            <Input
              placeholder="Search by client, service, or date..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-3"
            />
          </div>
        </div>

        {/* Filters & list */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <select
                className="px-3 py-2 bg-input border border-border rounded-lg text-sm"
                value={filters.period}
                onChange={(e) => handleFilterChange('period', e.target.value)}
              >
                <option value="month">This month</option>
                <option value="year">This year</option>
                <option value="all">All time</option>
              </select>
              <select
                className="px-3 py-2 bg-input border border-border rounded-lg text-sm"
                value={filters.paymentMethod}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
              >
                <option value="all">All payment methods</option>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="online">Online</option>
              </select>
            </div>
          </div>

          {dataLoading && <SkeletonTable rows={5} cols={4} />}

          {/* Mobile card list */}
          {!dataLoading && <div className="flex flex-col gap-3 md:hidden">
            {filteredIncomes.map((income, index) => (
              <motion.div
                key={income.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
              >
                {/* Amount + payment method */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-semibold text-green-500">
                    +{settings.currency} {income.amount.toLocaleString()}
                  </span>
                  <PaymentMethodBadge method={income.paymentMethod} />
                </div>

                {/* Client + service */}
                <div className="flex items-start justify-between gap-2 text-sm">
                  <span className="font-medium text-foreground">{income.clientName || '—'}</span>
                  <span className="text-muted-foreground text-xs text-right">{income.serviceType || '—'}</span>
                </div>

                {/* Date + actions */}
                <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {new Date(income.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEdit(income)}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteIncome(income)}
                      className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
            {filteredIncomes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No income records found for the selected filters.
              </div>
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto overscroll-x-contain touch-pan-x">
              <table className="w-full min-w-[800px] text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Service</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold">Amount</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIncomes.map((income, index) => (
                    <motion.tr
                      key={income.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(income.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">{income.clientName || '—'}</td>
                      <td className="px-4 py-3 text-sm">{income.serviceType || '—'}</td>
                      <td className="px-4 py-3"><PaymentMethodBadge method={income.paymentMethod} /></td>
                      <td className="px-4 py-3 text-sm font-semibold text-right">
                        {settings.currency} {income.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(income)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500 hover:text-green-400"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteIncome(income)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500 hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredIncomes.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No income records found for the selected filters.
              </div>
            )}
          </div>}
        </div>
      </div>

      {/* Add income dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingIncome(null);
            setClientSearchOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingIncome ? 'Edit Income' : 'Add Income'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2 w-full min-w-0">
                <Label className="text-sm font-medium">Client</Label>
                <div className="relative w-full">
                  <Input
                    placeholder="Search or type client name (optional)"
                    value={form.clientName}
                    autoComplete="off"
                    onChange={(e) => handleClientNameInput(e.target.value)}
                    onFocus={() => {
                      if (clientSearchBlurRef.current) {
                        clearTimeout(clientSearchBlurRef.current);
                        clientSearchBlurRef.current = null;
                      }
                      setClientSearchOpen(true);
                    }}
                    onBlur={() => {
                      clientSearchBlurRef.current = window.setTimeout(() => {
                        setClientSearchOpen(false);
                        clientSearchBlurRef.current = null;
                      }, 180);
                    }}
                    className="w-full"
                  />
                  {clientSearchOpen &&
                    form.clientName.trim() &&
                    clientNameMatches.length > 0 && (
                      <ul
                        className="absolute z-[100] left-0 right-0 top-[calc(100%+2px)] max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg py-1"
                        role="listbox"
                      >
                        {clientNameMatches.map((c) => (
                          <li key={c.id} role="option">
                            <button
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => applyClientFromDirectory(c)}
                            >
                              {c.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Service Type</Label>
                <select
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.serviceTypeSelect}
                  onChange={(e) => {
                    const v = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      serviceTypeSelect: v,
                      serviceType: v === SERVICE_TYPE_CUSTOM ? prev.serviceType : '',
                    }));
                  }}
                >
                  {SERVICE_TYPE_PRESETS.map((label) => (
                    <option key={label} value={label}>
                      {label}
                    </option>
                  ))}
                  <option value={SERVICE_TYPE_CUSTOM}>Custom…</option>
                </select>
                {form.serviceTypeSelect === SERVICE_TYPE_CUSTOM ? (
                  <Input
                    className="mt-2"
                    placeholder="Enter custom service type"
                    value={form.serviceType}
                    onChange={(e) => handleChange('serviceType', e.target.value)}
                    autoComplete="off"
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Amount ({settings.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <select
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="online">Online Payment</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-medium">Notes</Label>
                <textarea
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                  placeholder="Optional notes about this payment"
                  value={form.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingIncome ? 'Update Income' : 'Save Income'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
        title="Delete income?"
        description={
          deleteCandidate
            ? `Delete income of ${settings.currency} ${deleteCandidate.amount.toLocaleString()} from ${deleteCandidate.clientName || 'Unknown'}?`
            : ''
        }
        confirmText="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const inc = deleteCandidate;
          if (!inc) return;
          try {
            await deleteIncome(inc.id);
            toast({ title: 'Income deleted', description: 'Income record has been removed.' });
          } catch (err) {
            toast({
              title: 'Failed to delete income',
              description: err?.message || 'Server error. Please try again.',
              variant: 'destructive',
            });
          } finally {
            setDeleteCandidate(null);
          }
        }}
      />
    </>
  );
};

export default POS;