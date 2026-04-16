import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { Briefcase, Plus, LayoutGrid, FileText, TrendingUp, TrendingDown, AlertTriangle, Trash2 } from 'lucide-react';
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
              Track tasks on a board, time, costs, and net profit per project.
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((p) => {
              const profit = Number(p.netProfit) || 0;
              const warn = Number(p.price) > 0 && Number(p.totalCost) >= Number(p.price) * 0.8;
              const pendingStyle = p.status === 'on_hold' || warn;
              return (
                <div
                  key={p.id}
                  className={cn(
                    'rounded-2xl border bg-card p-5 flex flex-col gap-3 shadow-sm',
                    pendingStyle && !warn && 'border-yellow-500/50',
                    warn && profit >= 0 && 'border-yellow-500/60',
                    profit < 0 && 'border-red-500/40',
                    !pendingStyle && profit >= 0 && 'border-border',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-semibold text-foreground leading-tight">{p.name}</h2>
                    {warn && (
                      <span title="Cost reached 80%+ of project price" className="text-yellow-500 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </span>
                    )}
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
                  {(Number(p.expenseTotal) || 0) > 0 ? (
                    <p className="text-xs text-orange-400/90">
                      Project expenses: {currency} {(Number(p.expenseTotal) || 0).toLocaleString()} (included in total cost)
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="text-muted-foreground">Net profit:</span>
                    <span
                      className={cn(
                        'font-bold flex items-center gap-1',
                        profit >= 0 ? 'text-green-500' : 'text-red-500',
                      )}
                    >
                      {currency} {profit.toLocaleString()}
                      {profit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 mt-auto border-t border-border">
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
