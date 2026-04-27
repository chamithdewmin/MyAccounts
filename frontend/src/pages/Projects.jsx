import React, { useEffect, useState } from 'react';
import { useIsMobileLayout } from '@/hooks/useIsMobileLayout';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, LayoutGrid, FileText, Trash2, Calendar, DollarSign, TrendingUp, Receipt, ChevronRight, X } from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const statusLabel = (s) => {
  if (s === 'completed') return 'Completed';
  if (s === 'on_hold') return 'On hold';
  return 'In progress';
};

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const Projects = () => {
  const { settings } = useFinance();
  const { toast } = useToast();
  const currency = settings?.currency || 'LKR';
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    name: '',
    clientId: '',
    price: '',
    status: 'in_progress',
  });

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const isMobile = useIsMobileLayout();

  useEffect(() => {
    if (list.length === 0) {
      setSelectedProjectId(null);
      return;
    }
    setSelectedProjectId((prev) => {
      if (prev && list.some((p) => p.id === prev)) return prev;
      return null;
    });
  }, [list]);

  const selectedProject = selectedProjectId ? list.find((p) => p.id === selectedProjectId) : null;

  const load = () => {
    setLoading(true);
    api.projects
      .list()
      .then(setList)
      .catch((e) => {
        toast({ title: 'Could not load projects', description: e.message, variant: 'destructive' });
        setList([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.clients
      .list()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  const openNew = () => {
    setForm({ name: '', clientId: '', price: '', status: 'in_progress' });
    setDialogOpen(true);
  };

  const saveProject = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const price = Number(form.price);
    if (Number.isNaN(price) || price < 0) {
      toast({ title: 'Invalid price', variant: 'destructive' });
      return;
    }
    setSaving(true);
    api.projects
      .create({
        name,
        clientId: form.clientId || null,
        price,
        status: form.status,
      })
      .then((p) => {
        setList((prev) => [p, ...prev]);
        setDialogOpen(false);
        toast({ title: 'Project created' });
      })
      .catch((err) => {
        toast({ title: 'Could not create project', description: err.message, variant: 'destructive' });
      })
      .finally(() => setSaving(false));
  };

  const openDeleteDialog = (project) => {
    setDeleteTarget(project);
    setDeleteConfirmInput('');
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteConfirmInput('');
  };

  const confirmDeleteProject = async () => {
    if (!deleteTarget || deleteConfirmInput.trim() !== 'DELETE') return;
    setDeleteSubmitting(true);
    try {
      await api.projects.delete(deleteTarget.id);
      setList((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      if (selectedProjectId === deleteTarget.id) setSelectedProjectId(null);
      toast({ title: 'Project deleted' });
      closeDeleteDialog();
    } catch (err) {
      toast({ title: 'Could not delete project', description: err.message, variant: 'destructive' });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Projects - LOGOZODEV</title>
      </Helmet>

      <div className="page-y-sm min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Briefcase className="w-8 h-8 text-primary shrink-0" />
              Projects
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Track tasks on a board and time per project.
            </p>
          </div>
          <Button onClick={openNew} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            New project
          </Button>
        </div>

        {loading ? (
          <p className="text-muted-foreground py-12 text-center">Loading projects…</p>
        ) : list.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            No projects yet. Create one to start your Kanban board.
          </div>
        ) : (
          <>
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Project cards grid */}
            <div className="min-w-0 flex-1 grid gap-4 sm:grid-cols-2">
              {list.map((p) => {
                const isSelected = selectedProjectId === p.id;
                const progress = p.progress ?? 0;
                const profit = Number(p.profit) || 0;
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedProjectId(p.id);
                      if (isMobile) setMobileDetailOpen(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedProjectId(p.id);
                        if (isMobile) setMobileDetailOpen(true);
                      }
                    }}
                    className={cn(
                      'rounded-2xl border bg-card p-4 sm:p-5 flex flex-col gap-3 shadow-sm text-left outline-none transition-all',
                      'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:shadow-md hover:border-primary/30',
                      isSelected && 'ring-2 ring-primary/70 shadow-md border-primary/40',
                      p.status === 'on_hold' ? 'border-yellow-500/40' : p.status === 'completed' ? 'border-green-500/30' : 'border-border',
                    )}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base sm:text-lg font-semibold text-foreground leading-tight">{p.name}</h2>
                      <span className={cn(
                        'text-xs font-semibold px-2 py-0.5 rounded-full shrink-0',
                        p.status === 'completed' && 'bg-green-500/15 text-green-500',
                        p.status === 'on_hold' && 'bg-yellow-500/15 text-yellow-500',
                        p.status === 'in_progress' && 'bg-primary/15 text-primary',
                      )}>
                        {statusLabel(p.status)}
                      </span>
                    </div>

                    {/* Client */}
                    {p.clientName && (
                      <p className="text-sm text-muted-foreground truncate">
                        <span className="text-foreground font-medium">{p.clientName}</span>
                      </p>
                    )}

                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{p.taskDone ?? 0}/{p.taskTotal ?? 0} tasks</span>
                        <span className="font-semibold text-foreground tabular-nums">{progress}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            p.status === 'completed' ? 'bg-green-500' : p.status === 'on_hold' ? 'bg-yellow-500' : 'bg-primary',
                          )}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Financials */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-secondary/40 rounded-lg px-3 py-2">
                        <p className="text-muted-foreground mb-0.5">Expenses</p>
                        <p className="font-semibold text-orange-400 tabular-nums">{currency} {(Number(p.expenseTotal) || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-secondary/40 rounded-lg px-3 py-2">
                        <p className="text-muted-foreground mb-0.5">Profit</p>
                        <p className={cn('font-semibold tabular-nums', profit >= 0 ? 'text-green-500' : 'text-red-500')}>
                          {currency} {profit.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-1 mt-auto border-t border-border" onClick={(e) => e.stopPropagation()}>
                      <Button asChild size="sm" className="gap-1 flex-1">
                        <Link to={`/projects/${encodeURIComponent(p.id)}`}>
                          <LayoutGrid className="w-3.5 h-3.5" />
                          Board
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="gap-1 flex-1">
                        <Link to="/invoices">
                          <FileText className="w-3.5 h-3.5" />
                          Invoice
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 px-2"
                        onClick={() => openDeleteDialog(p)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {/* Mobile detail arrow */}
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 lg:hidden" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop aside summary */}
            <aside className="hidden lg:block w-[min(100%,380px)] shrink-0 lg:sticky lg:top-20 space-y-3">
              {selectedProject ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 border-b border-border pb-4">
                    <Briefcase className="w-5 h-5 text-primary shrink-0" />
                    <h2 className="text-base font-semibold text-foreground">Project summary</h2>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project</p>
                    <p className="text-xl font-bold text-foreground mt-1 leading-tight">{selectedProject.name}</p>
                    <span className={cn(
                      'inline-flex text-xs font-semibold px-2 py-0.5 rounded-full mt-2',
                      selectedProject.status === 'completed' && 'bg-green-500/15 text-green-500',
                      selectedProject.status === 'on_hold' && 'bg-yellow-500/15 text-yellow-500',
                      selectedProject.status === 'in_progress' && 'bg-primary/15 text-primary',
                    )}>
                      {statusLabel(selectedProject.status)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold tabular-nums">{selectedProject.progress ?? 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          selectedProject.status === 'completed' ? 'bg-green-500' : selectedProject.status === 'on_hold' ? 'bg-yellow-500' : 'bg-primary',
                        )}
                        style={{ width: `${selectedProject.progress ?? 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedProject.taskDone ?? 0} of {selectedProject.taskTotal ?? 0} tasks done</p>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Price', value: `${currency} ${(Number(selectedProject.price) || 0).toLocaleString()}`, icon: DollarSign, color: 'text-foreground' },
                      { label: 'Expenses', value: `${currency} ${(Number(selectedProject.expenseTotal) || 0).toLocaleString()}`, icon: Receipt, color: 'text-orange-400' },
                    ].map((s) => (
                      <div key={s.label} className="bg-secondary/40 rounded-xl p-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><s.icon className="w-3 h-3" />{s.label}</div>
                        <p className={cn('font-semibold tabular-nums text-sm', s.color)}>{s.value}</p>
                      </div>
                    ))}
                    <div className="col-span-2 bg-secondary/40 rounded-xl p-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><TrendingUp className="w-3 h-3" />Profit</div>
                      <p className={cn('font-bold tabular-nums text-lg', (Number(selectedProject.profit) || 0) >= 0 ? 'text-green-500' : 'text-red-500')}>
                        {currency} {(Number(selectedProject.profit) || 0).toLocaleString()}
                      </p>
                      {Number(selectedProject.price) > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(((Number(selectedProject.profit) || 0) / Number(selectedProject.price)) * 100).toFixed(1)}% margin
                        </p>
                      )}
                    </div>
                  </div>

                  <dl className="space-y-3 text-sm border-t border-border pt-4">
                    <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Client</dt><dd className="font-medium text-right">{selectedProject.clientName || '—'}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Created</dt><dd className="text-foreground text-right">{formatDate(selectedProject.createdAt)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />Updated</dt><dd className="text-foreground text-right">{formatDate(selectedProject.updatedAt)}</dd></div>
                  </dl>

                  <div className="pt-2 border-t border-border flex gap-2">
                    <Button asChild size="sm" className="gap-1 flex-1">
                      <Link to={`/projects/${encodeURIComponent(selectedProject.id)}`}>
                        <LayoutGrid className="w-3.5 h-3.5" />
                        View board
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1 flex-1">
                      <Link to="/invoices"><FileText className="w-3.5 h-3.5" />Invoice</Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
                  Tap a project card to see its full summary.
                </div>
              )}
            </aside>
          </div>

          {/* Mobile project detail dialog */}
          {selectedProject && (
            <Dialog open={mobileDetailOpen} onOpenChange={setMobileDetailOpen}>
              <DialogContent className="max-w-md max-h-[min(92dvh,calc(100svh-2rem))] overflow-y-auto lg:hidden" aria-describedby={undefined}>
                <DialogHeader>
                  <DialogTitle className="text-left pr-6">{selectedProject.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <span className={cn(
                    'inline-flex text-xs font-semibold px-2.5 py-1 rounded-full',
                    selectedProject.status === 'completed' && 'bg-green-500/15 text-green-500',
                    selectedProject.status === 'on_hold' && 'bg-yellow-500/15 text-yellow-500',
                    selectedProject.status === 'in_progress' && 'bg-primary/15 text-primary',
                  )}>
                    {statusLabel(selectedProject.status)}
                  </span>

                  {/* Progress */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-semibold tabular-nums">{selectedProject.progress ?? 0}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', selectedProject.status === 'completed' ? 'bg-green-500' : selectedProject.status === 'on_hold' ? 'bg-yellow-500' : 'bg-primary')}
                        style={{ width: `${selectedProject.progress ?? 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{selectedProject.taskDone ?? 0} of {selectedProject.taskTotal ?? 0} tasks done</p>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/40 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1">Price</p>
                      <p className="font-semibold tabular-nums text-sm">{currency} {(Number(selectedProject.price) || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1">Expenses</p>
                      <p className="font-semibold tabular-nums text-sm text-orange-400">{currency} {(Number(selectedProject.expenseTotal) || 0).toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 bg-secondary/40 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-1">Profit</p>
                      <p className={cn('font-bold tabular-nums text-lg', (Number(selectedProject.profit) || 0) >= 0 ? 'text-green-500' : 'text-red-500')}>
                        {currency} {(Number(selectedProject.profit) || 0).toLocaleString()}
                      </p>
                      {Number(selectedProject.price) > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{(((Number(selectedProject.profit) || 0) / Number(selectedProject.price)) * 100).toFixed(1)}% margin</p>
                      )}
                    </div>
                  </div>

                  <dl className="space-y-3 text-sm border-t border-border pt-4">
                    <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Client</dt><dd className="font-medium text-right">{selectedProject.clientName || '—'}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Created</dt><dd className="text-right">{formatDate(selectedProject.createdAt)}</dd></div>
                    <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Updated</dt><dd className="text-right">{formatDate(selectedProject.updatedAt)}</dd></div>
                  </dl>

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Button asChild size="sm" className="gap-1 flex-1" onClick={() => setMobileDetailOpen(false)}>
                      <Link to={`/projects/${encodeURIComponent(selectedProject.id)}`}>
                        <LayoutGrid className="w-3.5 h-3.5" />
                        View board
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1 flex-1">
                      <Link to="/invoices"><FileText className="w-3.5 h-3.5" />Invoice</Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive px-2"
                      onClick={() => { setMobileDetailOpen(false); openDeleteDialog(selectedProject); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          </>
        )}

        <Dialog
          open={!!deleteTarget}
          onOpenChange={(open) => {
            if (!open && !deleteSubmitting) closeDeleteDialog();
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete project?</DialogTitle>
              <DialogDescription className="sr-only">
                Confirm permanent project removal by typing DELETE in the field below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">Are you sure?</p>
              {deleteTarget ? (
                <p className="text-base text-muted-foreground">
                  This will permanently delete <span className="font-medium text-foreground">{deleteTarget.name}</span>,
                  all its tasks, time logs, comments, and project expenses. This cannot be undone.
                </p>
              ) : null}
            </div>
            <div className="space-y-2 pt-1">
              <Label htmlFor="delete-project-confirm" className="text-base font-semibold text-foreground">
                Type DELETE to confirm
              </Label>
              <Input
                id="delete-project-confirm"
                value={deleteConfirmInput}
                onChange={(e) => setDeleteConfirmInput(e.target.value)}
                placeholder="DELETE"
                autoComplete="off"
                autoCapitalize="characters"
                className="h-12 bg-input border-border font-mono tracking-wide"
                disabled={deleteSubmitting}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={closeDeleteDialog} disabled={deleteSubmitting}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDeleteProject}
                disabled={deleteConfirmInput.trim() !== 'DELETE' || deleteSubmitting}
              >
                {deleteSubmitting ? 'Deleting…' : 'Delete project'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>New project</DialogTitle>
            </DialogHeader>
            <form onSubmit={saveProject} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="proj-name">Project name</Label>
                <Input
                  id="proj-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Website redesign"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Client</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.clientId}
                  onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                >
                  <option value="">— None —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="proj-price">Project price ({currency})</Label>
                <Input
                  id="proj-price"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="100000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                >
                  <option value="in_progress">In progress</option>
                  <option value="on_hold">On hold</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Projects;
