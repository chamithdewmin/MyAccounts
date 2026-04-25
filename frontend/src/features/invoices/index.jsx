import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, Plus, Download, RefreshCw, Pencil, Trash2, Eye, Printer, Loader2 } from 'lucide-react';
import PaymentMethodBadge from '@/components/PaymentMethodBadge';
import { SkeletonTable } from '@/components/ui/skeleton';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import InvoiceTemplate from '@/components/InvoiceTemplate';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewedInvoice, setViewedInvoice] = useState(null);
  const [invoiceAction, setInvoiceAction] = useState(null); // 'view' | 'download' | 'print'
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [refreshLoading, setRefreshLoading] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const { toast } = useToast();

  const { invoices, clients, settings, dataLoading, updateInvoiceStatus, addInvoice, updateInvoice, deleteInvoice, loadData } = useFinance();

  const [form, setForm] = useState({
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    paymentMethod: 'bank',
    dueDate: '',
    notes: '',
    discountPercentage: '',
    bankDetails: null,
    showSignatureArea: false,
    items: [
      { description: '', price: '', quantity: 1 },
    ],
  });
  const [showBankDetailsPopup, setShowBankDetailsPopup] = useState(false);
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
      clientEmail: c.email || '',
      clientPhone: c.phone || '',
    }));
    setClientSearchOpen(false);
  };

  const handleClientNameInput = (value) => {
    setForm((prev) => {
      const sel = prev.clientId && clients.find((x) => x.id === prev.clientId);
      const next = { ...prev, clientName: value };
      if (sel && (sel.name || '').toLowerCase() !== value.trim().toLowerCase()) {
        next.clientId = '';
        next.clientEmail = '';
        next.clientPhone = '';
      }
      return next;
    });
    setClientSearchOpen(true);
  };

  const hasBankDetailsInSettings = useMemo(() => {
    const b = settings?.bankDetails;
    return b && b.accountNumber && b.accountName && b.bankName;
  }, [settings?.bankDetails]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index, field, value) => {
    setForm((prev) => {
      const nextItems = prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item,
      );
      return { ...prev, items: nextItems };
    });
  };

  const addItemRow = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { description: '', price: '', quantity: 1 }],
    }));
  };

  const removeItemRow = (index) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const toDateInputValue = (value) => {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openEditInvoice = (invoice) => {
    setEditingInvoice(invoice);
    setForm({
      clientId: invoice.clientId || '',
      clientName: invoice.clientName || '',
      clientEmail: invoice.clientEmail || '',
      clientPhone: invoice.clientPhone || '',
      paymentMethod: invoice.paymentMethod || 'bank',
      dueDate: toDateInputValue(invoice.dueDate || invoice.createdAt),
      notes: invoice.notes || '',
      discountPercentage:
        invoice.discountPercentage != null && !Number.isNaN(Number(invoice.discountPercentage))
          ? String(invoice.discountPercentage)
          : '',
      bankDetails: invoice.bankDetails || null,
      showSignatureArea: Boolean(invoice.showSignatureArea),
      items:
        (invoice.items && invoice.items.length
          ? invoice.items
          : [{ description: '', price: '', quantity: 1 }]).map((item) => ({
          description: item.description || item.name || '',
          price:
            item.price != null
              ? String(item.price)
              : item.amount != null
                ? String(item.amount)
                : '',
          quantity: item.quantity ?? item.qty ?? 1,
        })),
    });
    setIsCreateOpen(true);
  };

  const subtotal = useMemo(
    () =>
      form.items.reduce(
        (sum, item) =>
          sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
        0,
      ),
    [form.items],
  );

  const discountPct = useMemo(() => Math.min(100, Math.max(0, Number(form.discountPercentage) || 0)), [form.discountPercentage]);
  const discountAmount = useMemo(() => subtotal * (discountPct / 100), [subtotal, discountPct]);
  const amountAfterDiscount = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount]);
  const invoiceTotal = useMemo(() => {
    const taxRate = settings?.taxEnabled ? (Number(settings.taxRate) || 0) : 0;
    const tax = amountAfterDiscount * (taxRate / 100);
    return amountAfterDiscount + tax;
  }, [amountAfterDiscount, settings?.taxEnabled, settings?.taxRate]);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();

    if (!form.clientId && !form.clientName.trim()) {
      toast({
        title: 'Client name is required',
        description: 'Search for a client or type a name.',
      });
      return;
    }

    const selectedClient =
      clients.find((c) => c.id === form.clientId) || null;

    const normalizedItems = form.items
      .filter((item) => item.description.trim() && Number(item.price) > 0)
      .map((item) => ({
        description: item.description.trim(),
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
      }));

    if (normalizedItems.length === 0) {
      toast({
        title: 'Add at least one item',
        description: 'Please add at least one service or line item.',
      });
      return;
    }

    const dueDateIso = form.dueDate
      ? new Date(`${form.dueDate}T00:00:00`).toISOString()
      : new Date().toISOString();

    try {
      const taxRate = settings?.taxEnabled ? (Number(settings.taxRate) || 0) : 0;
      const taxAmount = amountAfterDiscount * (taxRate / 100);
      const payload = {
        clientId: selectedClient?.id || null,
        clientName: selectedClient?.name || form.clientName,
        clientEmail: selectedClient?.email || form.clientEmail,
        clientPhone: selectedClient?.phone || form.clientPhone,
        items: normalizedItems,
        subtotal,
        discountPercentage: discountPct,
        taxAmount,
        total: invoiceTotal,
        paymentMethod: form.paymentMethod,
        dueDate: dueDateIso,
        notes: form.notes,
        bankDetails: form.bankDetails,
        showSignatureArea: form.showSignatureArea,
      };

      let invoice;
      if (editingInvoice) {
        invoice = await updateInvoice(editingInvoice.id || editingInvoice.invoiceNumber, payload);
        toast({
          title: 'Invoice updated',
          description: `Invoice ${invoice.invoiceNumber || invoice.id} has been updated.`,
        });
      } else {
        invoice = await addInvoice(payload);
        toast({
          title: 'Invoice created',
          description: `Invoice ${invoice.invoiceNumber || invoice.id} has been created.`,
        });
      }

      setEditingInvoice(null);
      setForm({
        clientId: '',
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        paymentMethod: 'bank',
        dueDate: '',
        notes: '',
        discountPercentage: '',
        bankDetails: null,
        showSignatureArea: false,
        items: [
          { description: '', price: '', quantity: 1 },
        ],
      });
      setIsCreateOpen(false);
    } catch (err) {
      toast({
        title: 'Failed to create invoice',
        description: err?.message || 'Server error. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    setOrders(invoices);
    setFilteredOrders(invoices);
  }, [invoices]);

  useEffect(() => {
    if (selectedOrder && (selectedOrder.id || selectedOrder.invoiceNumber)) {
      setViewedInvoice(null);
      const hasToken = !!localStorage.getItem('token');
      const invoiceId = selectedOrder.id || selectedOrder.invoiceNumber;
      if (hasToken) {
        api.invoices.get(invoiceId).then((inv) => setViewedInvoice(inv)).catch(() => setViewedInvoice(selectedOrder));
      } else {
        setViewedInvoice(selectedOrder);
      }
    } else {
      setViewedInvoice(null);
    }
  }, [selectedOrder]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = orders.filter(order =>
        order.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrders(filtered);
    } else {
      setFilteredOrders(orders);
    }
  }, [searchQuery, orders]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const totalPending = useMemo(
    () =>
      filteredOrders
        .filter((o) => o.status !== 'paid')
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    [filteredOrders],
  );

  return (
    <>
      <Helmet>
        <title>Invoices - LOGOZODEV</title>
        <meta name="description" content="Create, track, and manage invoices" />
      </Helmet>

      <div className="page-y-sm min-w-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">Invoices</h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base">
              Create and manage invoices, due dates, and payment status.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              className="min-h-[44px] sm:min-h-0"
              disabled={refreshLoading}
              onClick={async () => {
                setRefreshLoading(true);
                try {
                  await loadData();
                  toast({
                    title: 'Refreshed',
                    description: 'Invoice data has been refreshed.',
                  });
                } finally {
                  setRefreshLoading(false);
                }
              }}
            >
              {refreshLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const headers = ['Invoice #', 'Client', 'Discount %', 'Total', 'Status', 'Payment', 'Date'];
                const rows = invoices.map((inv) => [
                  inv.invoiceNumber,
                  inv.clientName,
                  inv.discountPercentage ?? '',
                  inv.total,
                  inv.status,
                  inv.paymentMethod,
                  inv.createdAt,
                ]);
                const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'invoices.csv';
                a.click();
                toast({
                  title: 'Export successful',
                  description: 'Invoices exported to CSV',
                });
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                setEditingInvoice(null);
                setForm({
                  clientId: '',
                  clientName: '',
                  clientEmail: '',
                  clientPhone: '',
                  paymentMethod: 'bank',
                  dueDate: '',
                  notes: '',
                  discountPercentage: '',
                  bankDetails: null,
                  showSignatureArea: false,
                  items: [
                    { description: '', price: '', quantity: 1 },
                  ],
                });
                setIsCreateOpen(true);
              }}
              className="min-h-[44px] sm:min-h-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        <div className="relative min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 min-h-[44px]"
          />
        </div>

        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <span>Total invoices: {filteredOrders.length}</span>
          <span>
            Pending payments: <span className="font-semibold text-primary">
              {settings.currency} {totalPending.toLocaleString()}
            </span>
          </span>
        </div>

        {dataLoading && <SkeletonTable rows={6} cols={5} />}

        {/* Mobile + Desktop views */}
        {!dataLoading && <>
        <div className="flex flex-col gap-3 md:hidden">
          {filteredOrders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
            >
              {/* Top row: invoice # + status */}
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm font-semibold text-foreground">{order.invoiceNumber}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  order.status === 'paid'
                    ? 'bg-green-500/20 text-green-500'
                    : 'bg-white text-gray-900 border border-border'
                }`}>
                  {order.status === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
              </div>

              {/* Client + date */}
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium text-foreground truncate">{order.clientName}</span>
                <span className="text-muted-foreground text-xs whitespace-nowrap">{formatDate(order.createdAt)}</span>
              </div>

              {/* Total + meta row */}
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-primary">
                  {settings.currency} {Number(order.total || 0).toLocaleString()}
                </span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <PaymentMethodBadge method={order.paymentMethod} />
                  {Number(order.discountPercentage || 0) > 0 && (
                    <span className="bg-secondary px-1.5 py-0.5 rounded">{order.discountPercentage}% off</span>
                  )}
                  <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-wrap border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => { setSelectedOrder(order); setInvoiceAction('view'); }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-blue-400 hover:text-blue-300"
                  title="View"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedOrder(order); setInvoiceAction('download'); }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  title="Download PDF"
                >
                  <Download className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setSelectedOrder(order); setInvoiceAction('print'); }}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  title="Print"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => openEditInvoice(order)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500 hover:text-green-400"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteCandidate(order)}
                  className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                {order.status !== 'paid' && (
                  <button
                    type="button"
                    onClick={() => updateInvoiceStatus(order.id, 'paid')}
                    className="ml-auto text-xs px-3 py-1.5 rounded-full bg-primary !text-white hover:bg-primary/90"
                  >
                    Mark Paid
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Invoice #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Items</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Discount %</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Payment</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, index) => (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b border-border hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-mono">{order.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm">{order.clientName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">{order.items.length}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {Number(order.discountPercentage || 0) > 0 ? `${order.discountPercentage}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary">
                      {settings.currency} {Number(order.total || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3"><PaymentMethodBadge method={order.paymentMethod} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        order.status === 'paid'
                          ? 'bg-green-500/20 text-green-500'
                          : 'bg-white text-gray-900 border border-border'
                      }`}>
                        {order.status === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        <button
                          type="button"
                          onClick={() => { setSelectedOrder(order); setInvoiceAction('view'); }}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-blue-400 hover:text-blue-300"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedOrder(order); setInvoiceAction('download'); }}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedOrder(order); setInvoiceAction('print'); }}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                          title="Print"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditInvoice(order)}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500 hover:text-green-400"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteCandidate(order)}
                          className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500 hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {order.status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => updateInvoiceStatus(order.id, 'paid')}
                            className="text-xs px-3 py-1 rounded-full bg-primary !text-white hover:bg-primary/90"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </>}

        {!dataLoading && filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found</p>
          </div>
        )}
      </div>

      {/* View invoice */}
      <Dialog
        open={!!selectedOrder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedOrder(null);
            setInvoiceAction(null);
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Invoice Details</DialogTitle>
          </DialogHeader>
          {(viewedInvoice || selectedOrder) && (
            <InvoiceTemplate
              invoice={viewedInvoice || selectedOrder}
              currency={settings.currency}
              autoAction={invoiceAction === 'download' || invoiceAction === 'print' ? invoiceAction : null}
              onAutoActionDone={() => setInvoiceAction(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit invoice */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingInvoice(null);
            setClientSearchOpen(false);
            setForm({
              clientId: '',
              clientName: '',
              clientEmail: '',
              clientPhone: '',
              paymentMethod: 'bank',
              dueDate: '',
              notes: '',
              discountPercentage: '',
              bankDetails: null,
              showSignatureArea: false,
              items: [
                { description: '', price: '', quantity: 1 },
              ],
            });
          }
        }}
      >
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create Invoice'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateInvoice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-2 w-full min-w-0">
                <Label className="text-sm font-medium">Client</Label>
                <div className="relative w-full">
                  <Input
                    placeholder="Search or type client name"
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
                <Label className="text-sm font-medium">Payment Method</Label>
                <select
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.paymentMethod}
                  onChange={(e) => handleChange('paymentMethod', e.target.value)}
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="online">Online</option>
                </select>
                {form.paymentMethod === 'bank' && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!hasBankDetailsInSettings}
                      title={!hasBankDetailsInSettings ? 'Enter your bank details on the Settings page' : undefined}
                      onClick={() => form.bankDetails ? handleChange('bankDetails', null) : setShowBankDetailsPopup(true)}
                    >
                      {form.bankDetails ? '✓ Bank details added (click to remove)' : 'Add Payment Details'}
                    </Button>
                    {!hasBankDetailsInSettings && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter your bank details on the Settings page
                      </p>
                    )}
                  </div>
                )}
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleChange('showSignatureArea', !form.showSignatureArea)}
                  >
                    {form.showSignatureArea ? '✓ Signature area added (click to remove)' : 'Add Signature Area'}
                  </Button>
                </div>
                <div className="space-y-2 mt-2">
                  <Label className="text-sm font-medium">Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => handleChange('dueDate', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Items</Label>
              <div className="space-y-3">
                {form.items.map((item, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,auto] gap-2 items-center"
                  >
                    <Input
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) =>
                        handleItemChange(index, 'description', e.target.value)
                      }
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Price"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(index, 'price', e.target.value)
                      }
                    />
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', e.target.value)
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => removeItemRow(index)}
                      disabled={form.items.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={addItemRow}
              >
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes</Label>
              <textarea
                className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[60px]"
                placeholder="Optional notes for this invoice"
                value={form.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Discount %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="0"
                  value={form.discountPercentage}
                  onChange={(e) => handleChange('discountPercentage', e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="space-y-1 text-sm text-muted-foreground">
                <div>Subtotal: <span className="font-semibold text-primary">{settings.currency} {subtotal.toLocaleString()}</span></div>
                {discountPct > 0 && (
                  <div>Discount ({discountPct}%): <span className="font-medium">- {settings.currency} {discountAmount.toLocaleString()}</span></div>
                )}
                <div>Total: <span className="font-semibold text-primary">{settings.currency} {invoiceTotal.toLocaleString()}</span></div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateOpen(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingInvoice ? 'Update Invoice' : 'Save Invoice'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => {
          if (!open) setDeleteCandidate(null);
        }}
        title="Delete invoice?"
        description={
          deleteCandidate
            ? `This will permanently delete invoice ${deleteCandidate.invoiceNumber}.`
            : ''
        }
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
        onConfirm={async () => {
          const inv = deleteCandidate;
          if (!inv) return;
          try {
            await deleteInvoice(inv.id);
            if (selectedOrder?.id === inv.id) {
              setSelectedOrder(null);
              setInvoiceAction(null);
            }
            toast({ title: 'Invoice deleted', description: 'Invoice has been removed.' });
          } catch (err) {
            toast({
              title: 'Failed to delete invoice',
              description: err?.message || 'Server error. Please try again.',
              variant: 'destructive',
            });
          } finally {
            setDeleteCandidate(null);
          }
        }}
      />

      {/* Add Payment Details popup */}
      <Dialog open={showBankDetailsPopup} onOpenChange={setShowBankDetailsPopup}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Add Bank Details to Invoice</DialogTitle>
          </DialogHeader>
          {hasBankDetailsInSettings && settings?.bankDetails && (
            <div className="space-y-3">
              <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-2 text-sm">
                <p><span className="text-muted-foreground">Account Number:</span> {settings.bankDetails.accountNumber}</p>
                <p><span className="text-muted-foreground">Account Name:</span> {settings.bankDetails.accountName}</p>
                <p><span className="text-muted-foreground">Bank:</span> {settings.bankDetails.bankName}</p>
                {settings.bankDetails.branch && (
                  <p><span className="text-muted-foreground">Branch:</span> {settings.bankDetails.branch}</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowBankDetailsPopup(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    handleChange('bankDetails', settings.bankDetails);
                    setShowBankDetailsPopup(false);
                  }}
                >
                  Add to Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Orders;