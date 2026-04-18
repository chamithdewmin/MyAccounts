import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, LayoutGrid, FileText, Trash2, Calendar, DollarSign, TrendingUp, Receipt } from 'lucide-react';
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
        <title>Projects - LogozoPOS</title>
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
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="min-w-0 flex-1 grid gap-4 sm:grid-cols-2">
              {list.map((p) => {
                const pendingStyle = p.status === 'on_hold';
                const isSelected = selectedProjectId === p.id;
                return (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedProjectId(p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedProjectId(p.id);
                      }
                    }}
                    className={cn(
                      'rounded-2xl border bg-card p-5 flex flex-col gap-3 shadow-sm text-left outline-none transition-[box-shadow,ring,border-color]',
                      'cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                      isSelected && 'ring-2 ring-primary/70 shadow-md',
                      pendingStyle ? 'border-yellow-500/50' : 'border-border',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-lg font-semibold text-foreground leading-tight">{p.name}</h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Client: <span className="text-foreground font-medium">{p.clientName || '—'}</span>
                    </p>
                    <p className="text-sm">
                      Status:{' '}
                      <span
                        className={cn(
                          'font-medium',
                          p.status === 'completed' && 'text-green-500',
                          p.status === 'on_hold' && 'text-yellow-500',
                          p.status === 'in_progress' && 'text-primary',
                        )}
                      >
                        {statusLabel(p.status)}
                      </span>
                    </p>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Progress: </span>
                      <span className="font-semibold text-foreground">{p.progress ?? 0}%</span>
                      <span className="text-muted-foreground"> ({p.taskDone ?? 0}/{p.taskTotal ?? 0} tasks)</span>
                    </div>
                    <div className="text-sm flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Expenses</span>
                      <span className="font-medium tabular-nums text-orange-400">
                        {currency} {(Number(p.expenseTotal) || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm flex flex-wrap justify-between gap-2">
                      <span className="text-muted-foreground">Profit</span>
                      <span
                        className={cn(
                          'font-semibold tabular-nums',
                          (Number(p.profit) || 0) >= 0 ? 'text-green-500' : 'text-red-500',
                        )}
                      >
                        {currency} {(Number(p.profit) || 0).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2 mt-auto border-t border-border" onClick={(e) => e.stopPropagation()}>
                      <Button asChild size="sm" className="gap-1">
                        <Link to={`/projects/${encodeURIComponent(p.id)}`}>
                          <LayoutGrid className="w-3.5 h-3.5" />
                          View board
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link to="/file-manager">
                          <FileText className="w-3.5 h-3.5" />
                          Files
                        </Link>
                      </Button>
                      <Button asChild size="sm" variant="outline" className="gap-1">
                        <Link to="/invoices">
                          <FileText className="w-3.5 h-3.5" />
                          Invoice
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => openDeleteDialog(p)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <aside className="w-full lg:w-[min(100%,400px)] shrink-0 lg:sticky lg:top-20 space-y-3">
              {selectedProject ? (
                <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2 border-b border-border pb-4">
                    <Briefcase className="w-5 h-5 text-primary shrink-0" />
                    <h2 className="text-lg font-semibold text-foreground">Project summary</h2>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Project name</p>
                    <p className="text-xl font-bold text-foreground mt-1 leading-tight">{selectedProject.name}</p>
                  </div>
                  <dl className="space-y-4 text-sm">
                    <div className="flex gap-3">
                      <dt className="w-28 shrink-0 text-muted-foreground">Client</dt>
                      <dd className="font-medium text-foreground min-w-0">{selectedProject.clientName || '—'}</dd>
                    </div>
                    <div className="flex gap-3 items-center">
                      <dt className="w-28 shrink-0 text-muted-foreground">Status</dt>
                      <dd>
                        <span
                          className={cn(
                            'inline-flex font-semibold',
                            selectedProject.status === 'completed' && 'text-green-500',
                            selectedProject.status === 'on_hold' && 'text-yellow-500',
                            selectedProject.status === 'in_progress' && 'text-primary',
                          )}
                        >
                          {statusLabel(selectedProject.status)}
                        </span>
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-28 shrink-0 text-muted-foreground">Progress</dt>
                      <dd className="font-semibold text-foreground tabular-nums">
                        {selectedProject.progress ?? 0}%{' '}
                        <span className="font-normal text-muted-foreground">
                          ({selectedProject.taskDone ?? 0} of {selectedProject.taskTotal ?? 0} tasks done)
                        </span>
                      </dd>
                    </div>
                    <div className="flex gap-3 items-start">
                      <dt className="w-28 shrink-0 text-muted-foreground pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5 opacity-70" />
                          Price
                        </span>
                      </dt>
                      <dd className="font-semibold tabular-nums text-foreground">
                        {currency} {(Number(selectedProject.price) || 0).toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex gap-3 items-start">
                      <dt className="w-28 shrink-0 text-muted-foreground pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Receipt className="w-3.5 h-3.5 opacity-70" />
                          Expenses
                        </span>
                      </dt>
                      <dd className="font-semibold tabular-nums text-orange-400">
                        {currency} {(Number(selectedProject.expenseTotal) || 0).toLocaleString()}
                      </dd>
                    </div>
                    <div className="flex gap-3 items-start">
                      <dt className="w-28 shrink-0 text-muted-foreground pt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <TrendingUp className="w-3.5 h-3.5 opacity-70" />
                          Profit
                        </span>
                      </dt>
                      <dd
                        className={cn(
                          'font-bold tabular-nums',
                          (Number(selectedProject.profit) || 0) >= 0 ? 'text-green-500' : 'text-red-500',
                        )}
                      >
                        {currency} {(Number(selectedProject.profit) || 0).toLocaleString()}
                        {Number(selectedProject.price) > 0 ? (
                          <span className="block text-xs font-normal text-muted-foreground mt-1">
                            Margin:{' '}
                            {(
                              ((Number(selectedProject.profit) || 0) / Number(selectedProject.price)) *
                              100
                            ).toFixed(1)}
                            % of project price
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-28 shrink-0 text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 opacity-70" />
                          Created
                        </span>
                      </dt>
                      <dd className="text-foreground">{formatDate(selectedProject.createdAt)}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="w-28 shrink-0 text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 opacity-70" />
                          Updated
                        </span>
                      </dt>
                      <dd className="text-foreground">{formatDate(selectedProject.updatedAt)}</dd>
                    </div>
                    {selectedProject.clientId ? (
                      <div className="flex gap-3">
                        <dt className="w-28 shrink-0 text-muted-foreground">Client ID</dt>
                        <dd className="font-mono text-xs text-muted-foreground break-all">{selectedProject.clientId}</dd>
                      </div>
                    ) : null}
                    <div className="flex gap-3">
                      <dt className="w-28 shrink-0 text-muted-foreground">Project ID</dt>
                      <dd className="font-mono text-xs text-muted-foreground break-all">{selectedProject.id}</dd>
                    </div>
                  </dl>
                  <div className="pt-2 border-t border-border flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button asChild size="sm" className="gap-1">
                      <Link to={`/projects/${encodeURIComponent(selectedProject.id)}`}>
                        <LayoutGrid className="w-3.5 h-3.5" />
                        View board
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link to="/file-manager">
                        <FileText className="w-3.5 h-3.5" />
                        Files
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link to="/invoices">
                        <FileText className="w-3.5 h-3.5" />
                        Invoice
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 px-5 py-10 text-center text-sm text-muted-foreground">
                  Select a project card to see the full summary here.
                </div>
              )}
            </aside>
          </div>
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
