import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Plus, Search, Download, Eye, Printer, Pencil, Trash2, RefreshCw, FileText } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/components/ui/use-toast';
import EstimateTemplate from '@/components/EstimateTemplate';

const initialForm = {
  clientId: '',
  clientName: '',
  clientEmail: '',
  clientPhone: '',
  clientAddress: '',
  projectTitle: '',
  projectScope: '',
  assumptions: '',
  exclusions: '',
  notes: '',
  validUntil: '',
  discountPercentage: '',
  status: 'draft',
  items: [{ description: '', price: '', quantity: 1 }],
};

export default function Estimates() {
  const { toast } = useToast();
  const {
    estimates,
    clients,
    settings,
    addEstimate,
    updateEstimate,
    deleteEstimate,
    convertEstimateToInvoice,
    loadData,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [previewAction, setPreviewAction] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    if (!searchQuery) return estimates;
    const q = searchQuery.toLowerCase();
    return estimates.filter((e) =>
      (e.estimateNumber || '').toLowerCase().includes(q) ||
      (e.clientName || '').toLowerCase().includes(q) ||
      (e.projectTitle || '').toLowerCase().includes(q)
    );
  }, [estimates, searchQuery]);

  const subtotal = useMemo(
    () => form.items.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0),
    [form.items]
  );
  const discountPct = Math.min(100, Math.max(0, Number(form.discountPercentage) || 0));
  const discountAmount = subtotal * (discountPct / 100);
  const afterDiscount = subtotal - discountAmount;
  const taxRate = settings?.taxEnabled ? (Number(settings.taxRate) || 0) : 0;
  const taxAmount = afterDiscount * (taxRate / 100);
  const total = afterDiscount + taxAmount;

  useEffect(() => {
    if (!form.clientId) return;
    const c = clients.find((x) => x.id === form.clientId);
    if (!c) return;
    setForm((prev) => ({
      ...prev,
      clientName: c.name || prev.clientName,
      clientEmail: c.email || prev.clientEmail,
      clientPhone: c.phone || prev.clientPhone,
      clientAddress: c.address || prev.clientAddress,
    }));
  }, [form.clientId, clients]);

  const openCreate = () => {
    setEditing(null);
    setForm(initialForm);
    setIsFormOpen(true);
  };

  const openEdit = (estimate) => {
    setEditing(estimate);
    setForm({
      clientId: estimate.clientId || '',
      clientName: estimate.clientName || '',
      clientEmail: estimate.clientEmail || '',
      clientPhone: estimate.clientPhone || '',
      clientAddress: estimate.clientAddress || '',
      projectTitle: estimate.projectTitle || '',
      projectScope: estimate.projectScope || '',
      assumptions: estimate.assumptions || '',
      exclusions: estimate.exclusions || '',
      notes: estimate.notes || '',
      validUntil: estimate.validUntil ? new Date(estimate.validUntil).toISOString().slice(0, 10) : '',
      discountPercentage: String(estimate.discountPercentage || ''),
      status: estimate.status || 'draft',
      items: (estimate.items?.length ? estimate.items : initialForm.items).map((i) => ({
        description: i.description || i.name || '',
        price: i.price != null ? String(i.price) : '',
        quantity: i.quantity ?? i.qty ?? 1,
      })),
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const normalizedItems = form.items
      .filter((i) => i.description.trim() && Number(i.price) > 0)
      .map((i) => ({
        description: i.description.trim(),
        price: Number(i.price) || 0,
        quantity: Number(i.quantity) || 1,
      }));
    if (!form.clientName.trim()) {
      toast({ title: 'Client is required', description: 'Select existing client or enter name.' });
      return;
    }
    if (!normalizedItems.length) {
      toast({ title: 'Add at least one line item', description: 'Add service and price details.' });
      return;
    }

    const payload = {
      ...form,
      items: normalizedItems,
      subtotal,
      discountPercentage: discountPct,
      taxAmount,
      total,
      validUntil: form.validUntil || null,
      termsConditions: [],
    };

    try {
      if (editing) {
        await updateEstimate(editing.id || editing.estimateNumber, payload);
        toast({ title: 'Estimate updated', description: 'Changes saved successfully.' });
      } else {
        await addEstimate(payload);
        toast({ title: 'Estimate created', description: 'New estimate has been created.' });
      }
      setIsFormOpen(false);
      setEditing(null);
      setForm(initialForm);
    } catch (err) {
      toast({ title: 'Save failed', description: err?.message || 'Please try again.', variant: 'destructive' });
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleExportCsv = () => {
    const headers = ['Estimate #', 'Client', 'Project', 'Valid Until', 'Total', 'Status', 'Created'];
    const rows = estimates.map((e) => [
      e.estimateNumber || '',
      e.clientName || '',
      e.projectTitle || '',
      e.validUntil || '',
      e.total || 0,
      e.status || '',
      e.createdAt || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'estimates.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>Estimates - LogozoPOS</title>
        <meta name="description" content="Create and manage project estimates" />
      </Helmet>

      <div className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Estimates</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Create enterprise-style project quotations and download A4 sheets.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                setRefreshing(true);
                try {
                  await loadData();
                } finally {
                  setRefreshing(false);
                }
              }}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" /> New Estimate
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-10" placeholder="Search estimates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Estimate #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Project</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Valid Until</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((est) => (
                  <tr key={est.id} className="border-b border-border hover:bg-secondary/50">
                    <td className="px-4 py-3 text-sm font-mono">{est.estimateNumber}</td>
                    <td className="px-4 py-3 text-sm">{est.clientName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{est.projectTitle || '—'}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(est.validUntil)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-primary">{settings.currency} {Number(est.total || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm capitalize">{est.status || 'draft'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button className="p-2 hover:bg-secondary rounded-lg text-blue-400" onClick={() => { setSelected(est); setPreviewAction('view'); }} title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground" onClick={() => { setSelected(est); setPreviewAction('download'); }} title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-secondary rounded-lg text-muted-foreground" onClick={() => { setSelected(est); setPreviewAction('print'); }} title="Print">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-secondary rounded-lg text-green-500" onClick={() => openEdit(est)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-secondary rounded-lg text-red-500" onClick={() => setDeleteCandidate(est)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {est.status !== 'converted' && (
                          <button
                            className="text-xs px-3 py-1 rounded-full bg-primary !text-white hover:bg-primary/90 font-medium"
                            onClick={async () => {
                              try {
                                await convertEstimateToInvoice(est);
                                toast({ title: 'Converted to invoice', description: 'Estimate converted and marked as converted.' });
                              } catch (err) {
                                toast({ title: 'Conversion failed', description: err?.message || 'Please try again.', variant: 'destructive' });
                              }
                            }}
                          >
                            Convert
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) { setSelected(null); setPreviewAction(null); } }}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle>Estimate Preview</DialogTitle></DialogHeader>
          {selected && (
            <EstimateTemplate
              estimate={selected}
              autoAction={previewAction === 'download' || previewAction === 'print' ? previewAction : null}
              onAutoActionDone={() => setPreviewAction(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Estimate' : 'Create Estimate'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <select className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm" value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))}>
                  <option value="">Select existing client</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Input placeholder="Client name" value={form.clientName} onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))} />
                <Input placeholder="Client email" value={form.clientEmail} onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value }))} />
                <Input placeholder="Client phone" value={form.clientPhone} onChange={(e) => setForm((p) => ({ ...p, clientPhone: e.target.value }))} />
                <Input placeholder="Client address" value={form.clientAddress} onChange={(e) => setForm((p) => ({ ...p, clientAddress: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Project title</Label>
                <Input placeholder="Website development / app build" value={form.projectTitle} onChange={(e) => setForm((p) => ({ ...p, projectTitle: e.target.value }))} />
                <Label>Valid until</Label>
                <Input type="date" value={form.validUntil} onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))} />
                <Label>Status</Label>
                <select className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
                <Label>Discount %</Label>
                <Input type="number" min="0" max="100" step="0.5" value={form.discountPercentage} onChange={(e) => setForm((p) => ({ ...p, discountPercentage: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Project scope</Label>
              <textarea className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm min-h-[70px]" value={form.projectScope} onChange={(e) => setForm((p) => ({ ...p, projectScope: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Items</Label>
              <div className="space-y-2">
                {form.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,auto] gap-2">
                    <Input placeholder="Description" value={item.description} onChange={(e) => setForm((p) => ({ ...p, items: p.items.map((it, i) => i === index ? { ...it, description: e.target.value } : it) }))} />
                    <Input type="number" min="0" step="0.01" placeholder="Rate" value={item.price} onChange={(e) => setForm((p) => ({ ...p, items: p.items.map((it, i) => i === index ? { ...it, price: e.target.value } : it) }))} />
                    <Input type="number" min="1" step="1" placeholder="Qty" value={item.quantity} onChange={(e) => setForm((p) => ({ ...p, items: p.items.map((it, i) => i === index ? { ...it, quantity: e.target.value } : it) }))} />
                    <Button type="button" variant="outline" disabled={form.items.length === 1} onClick={() => setForm((p) => ({ ...p, items: p.items.filter((_, i) => i !== index) }))}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" onClick={() => setForm((p) => ({ ...p, items: [...p.items, { description: '', price: '', quantity: 1 }] }))}>
                <Plus className="w-4 h-4 mr-2" /> Add Item
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Assumptions</Label>
                <textarea className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm min-h-[70px]" value={form.assumptions} onChange={(e) => setForm((p) => ({ ...p, assumptions: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Exclusions</Label>
                <textarea className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm min-h-[70px]" value={form.exclusions} onChange={(e) => setForm((p) => ({ ...p, exclusions: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea className="w-full px-3 py-2 bg-input border border-border rounded-lg text-sm min-h-[70px]" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-sm text-muted-foreground">
                <div>Subtotal: <span className="font-semibold text-primary">{settings.currency} {subtotal.toLocaleString()}</span></div>
                {discountPct > 0 && <div>Discount: - {settings.currency} {discountAmount.toLocaleString()}</div>}
                <div>Tax: {settings.currency} {taxAmount.toLocaleString()}</div>
                <div>Total: <span className="font-semibold text-primary">{settings.currency} {total.toLocaleString()}</span></div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                <Button type="submit">
                  <FileText className="w-4 h-4 mr-2" />
                  {editing ? 'Update Estimate' : 'Save Estimate'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteCandidate}
        onOpenChange={(open) => { if (!open) setDeleteCandidate(null); }}
        title="Delete estimate?"
        description={deleteCandidate ? `This will permanently delete ${deleteCandidate.estimateNumber}.` : ''}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="destructive"
        onConfirm={async () => {
          const candidate = deleteCandidate;
          if (!candidate) return;
          try {
            await deleteEstimate(candidate.id || candidate.estimateNumber);
            toast({ title: 'Estimate deleted', description: 'Estimate has been removed.' });
          } catch (err) {
            toast({ title: 'Delete failed', description: err?.message || 'Please try again.', variant: 'destructive' });
          } finally {
            setDeleteCandidate(null);
          }
        }}
      />
    </>
  );
}
