import React, { useEffect, useState, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Clock,
  User,
  DollarSign,
  Paperclip,
  MessageSquare,
  Play,
  Square,
  Loader2,
  Receipt,
  Trash2,
  Pencil,
} from 'lucide-react';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { SiteConfirmDialog } from '@/components/ui/site-confirm-dialog';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const COLUMNS = [
  { id: 'todo', title: 'To do' },
  { id: 'doing', title: 'Doing' },
  { id: 'done', title: 'Done' },
];

const formatDue = (d) => {
  if (d == null || d === '') return '—';
  const s = String(d).trim();
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (!ymd) {
    const t = new Date(s);
    return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
  const t = new Date(`${ymd[1]}-${ymd[2]}-${ymd[3]}T12:00:00`);
  return Number.isNaN(t.getTime()) ? '—' : t.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const todayYmd = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const ProjectBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { settings } = useFinance();
  const { user } = useAuth();
  const { toast } = useToast();
  const currency = settings?.currency || 'LKR';

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dragTaskId, setDragTaskId] = useState(null);

  const [addOpen, setAddOpen] = useState(false);
  const [addCol, setAddCol] = useState('todo');
  const [addSaving, setAddSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    assignedTo: '',
  });

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [expenseEditingId, setExpenseEditingId] = useState(null);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    expenseDate: '',
    category: 'Other',
    notes: '',
  });
  const deleteExpenseRef = useRef(null);
  const [expenseDeleteConfirmOpen, setExpenseDeleteConfirmOpen] = useState(false);
  const [expenseDeleteMessage, setExpenseDeleteMessage] = useState('');

  const loadProject = () => {
    if (!projectId) return Promise.resolve();
    setLoading(true);
    return api.projects
      .get(projectId)
      .then(setProject)
      .catch((e) => {
        toast({ title: 'Could not load project', description: e.message, variant: 'destructive' });
        setProject(null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const tasksByStatus = (status) => (project?.tasks || []).filter((t) => t.status === status);

  const onDragStart = (e, taskId) => {
    setDragTaskId(taskId);
    e.dataTransfer.setData('text/task-id', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDrop = async (e, newStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/task-id') || dragTaskId;
    setDragTaskId(null);
    if (!id) return;
    const t = project?.tasks?.find((x) => x.id === id);
    if (!t || t.status === newStatus) return;
    try {
      await api.projectTasks.update(id, { status: newStatus });
      await loadProject();
      toast({ title: 'Task moved' });
    } catch (err) {
      toast({ title: 'Could not move task', description: err.message, variant: 'destructive' });
    }
  };

  const openAdd = (colId) => {
    setAddCol(colId);
    setAddForm({
      title: '',
      description: '',
      dueDate: '',
      assignedTo: user?.id != null ? String(user.id) : '',
    });
    setAddOpen(true);
  };

  const saveTask = async (e) => {
    e.preventDefault();
    const title = addForm.title.trim();
    if (!title || !projectId) return;
    setAddSaving(true);
    try {
      await api.projects.createTask(projectId, {
        title,
        description: addForm.description.trim(),
        status: addCol,
        dueDate: addForm.dueDate || null,
        assignedTo: addForm.assignedTo ? Number(addForm.assignedTo) : null,
      });
      setAddOpen(false);
      await loadProject();
      toast({ title: 'Task created' });
    } catch (err) {
      toast({ title: 'Could not create task', description: err.message, variant: 'destructive' });
    } finally {
      setAddSaving(false);
    }
  };

  const openDetail = async (taskId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setCommentText('');
    try {
      const d = await api.projectTasks.get(taskId);
      setDetail(d);
    } catch (e) {
      toast({ title: 'Could not load task', description: e.message, variant: 'destructive' });
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDetail = async (taskId) => {
    if (!taskId) return;
    try {
      const d = await api.projectTasks.get(taskId);
      setDetail(d);
      await loadProject();
    } catch {
      /* ignore */
    }
  };

  const saveDetailForm = async (patch) => {
    if (!detail?.task?.id) return;
    try {
      await api.projectTasks.update(detail.task.id, patch);
      await refreshDetail(detail.task.id);
      toast({ title: 'Saved' });
    } catch (e) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  };

  const postComment = async (e) => {
    e.preventDefault();
    if (!detail?.task?.id || !commentText.trim()) return;
    setSavingComment(true);
    try {
      await api.projectTasks.addComment(detail.task.id, commentText.trim());
      setCommentText('');
      await refreshDetail(detail.task.id);
    } catch (err) {
      toast({ title: 'Could not post comment', description: err.message, variant: 'destructive' });
    } finally {
      setSavingComment(false);
    }
  };

  const assignLabel = (task) => {
    if (!task.assignedTo) return 'Unassigned';
    if (user?.id != null && Number(task.assignedTo) === Number(user.id)) return 'You';
    return task.assigneeName || `User #${task.assignedTo}`;
  };

  const saveExpense = async (e) => {
    e.preventDefault();
    if (!projectId) return;
    const amt = Number(expenseForm.amount);
    if (Number.isNaN(amt) || amt < 0) {
      toast({ title: 'Invalid amount', variant: 'destructive' });
      return;
    }
    if (!expenseForm.expenseDate?.trim()) {
      toast({ title: 'Expense date required', variant: 'destructive' });
      return;
    }
    setExpenseSaving(true);
    try {
      const payload = {
        amount: amt,
        expenseDate: expenseForm.expenseDate.trim().slice(0, 10),
        category: expenseForm.category.trim() || 'Other',
        notes: expenseForm.notes.trim(),
      };
      if (expenseEditingId) {
        await api.projects.updateExpense(projectId, expenseEditingId, payload);
        toast({ title: 'Expense updated' });
      } else {
        await api.projects.createExpense(projectId, payload);
        toast({ title: 'Expense added' });
      }
      setExpenseOpen(false);
      setExpenseEditingId(null);
      await loadProject();
    } catch (err) {
      toast({ title: 'Could not save expense', description: err.message, variant: 'destructive' });
    } finally {
      setExpenseSaving(false);
    }
  };

  const openDeleteExpenseConfirm = (ex) => {
    deleteExpenseRef.current = ex;
    setExpenseDeleteMessage(
      `Delete this expense (${currency} ${Number(ex.amount || 0).toLocaleString()} · ${formatDue(ex.expenseDate)})?`,
    );
    setExpenseDeleteConfirmOpen(true);
  };

  const executeDeleteExpense = async () => {
    const ex = deleteExpenseRef.current;
    if (!ex?.id || !projectId) return;
    try {
      await api.projects.deleteExpense(projectId, ex.id);
      await loadProject();
      toast({ title: 'Expense removed' });
    } catch (err) {
      toast({ title: 'Could not delete', description: err.message, variant: 'destructive' });
    } finally {
      deleteExpenseRef.current = null;
    }
  };

  if (loading && !project) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
        <Loader2 className="w-6 h-6 animate-spin" />
        Loading…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page-y-sm">
        <Button variant="outline" asChild className="mb-4">
          <Link to="/projects">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to projects
          </Link>
        </Button>
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const price = Number(project.price) || 0;
  const expenseTotal = Number(project.expenseTotal) || 0;
  const profit =
    project.profit != null && !Number.isNaN(Number(project.profit))
      ? Number(project.profit)
      : Math.round((price - expenseTotal) * 100) / 100;

  return (
    <>
      <Helmet>
        <title>{project.name} · Board - LOGOZODEV</title>
      </Helmet>

      <div className="page-y-sm min-w-0 space-y-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Button variant="ghost" size="sm" className="mb-2 -ml-2 gap-1" onClick={() => navigate('/projects')}>
              <ArrowLeft className="w-4 h-4" />
              Projects
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{project.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Client: <span className="text-foreground font-medium">{project.clientName || '—'}</span>
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
          <div className="space-y-4 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Board</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-h-[420px]">
              {COLUMNS.map((col) => (
                <div
                  key={col.id}
                  className="rounded-xl border border-border bg-card/50 flex flex-col min-h-[360px]"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, col.id)}
                >
                  <div className="px-3 py-2 border-b border-border flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{col.title}</span>
                    <span className="text-xs text-muted-foreground">{tasksByStatus(col.id).length}</span>
                  </div>
                  <div className="p-2 flex-1 flex flex-col gap-2 overflow-y-auto max-h-[70vh]">
                    {tasksByStatus(col.id).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        draggable
                        onDragStart={(e) => onDragStart(e, t.id)}
                        onDragEnd={() => setDragTaskId(null)}
                        onClick={() => openDetail(t.id)}
                        className="text-left rounded-lg border border-border bg-background p-3 shadow-sm hover:bg-secondary/40 transition-colors cursor-grab active:cursor-grabbing"
                      >
                        <p className="font-medium text-sm text-foreground leading-snug">{t.title}</p>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            Due: {formatDue(t.dueDate)}
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 shrink-0" />
                            {assignLabel(t)}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono">⏱</span>
                            <span>{t.hoursWorked ?? 0}h tracked</span>
                          </div>
                        </div>
                      </button>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="mt-auto gap-1 w-full" onClick={() => openAdd(col.id)}>
                      <Plus className="w-3.5 h-3.5" />
                      Add task
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-orange-400" />
                  Project expenses
                </h2>
                <Button
                  type="button"
                  size="sm"
                  className="gap-1"
                  onClick={() => {
                    setExpenseEditingId(null);
                    setExpenseForm({
                      amount: '',
                      expenseDate: todayYmd(),
                      category: 'Other',
                      notes: '',
                    });
                    setExpenseOpen(true);
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add expense
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Costs for this project only. Totals feed into the summary on the right.
              </p>
              {(project.projectExpenses || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">No expenses yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary/30 text-left text-xs text-muted-foreground uppercase tracking-wide">
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 font-medium text-right">Amount</th>
                        <th className="px-3 py-2 font-medium">Notes</th>
                        <th className="px-3 py-2 w-[5.5rem] min-w-[5.5rem]" />
                      </tr>
                    </thead>
                    <tbody>
                      {project.projectExpenses.map((ex) => (
                        <tr key={ex.id} className="border-b border-border last:border-0 hover:bg-secondary/20">
                          <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatDue(ex.expenseDate)}</td>
                          <td className="px-3 py-2">{ex.category}</td>
                          <td className="px-3 py-2 text-right font-medium tabular-nums">
                            {currency} {Number(ex.amount).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">{ex.notes || '—'}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-row flex-nowrap items-center justify-end gap-0.5">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-foreground hover:text-foreground"
                                title="Edit"
                                onClick={() => {
                                  setExpenseEditingId(ex.id);
                                  setExpenseForm({
                                    amount: String(ex.amount ?? ''),
                                    expenseDate: ex.expenseDate || todayYmd(),
                                    category: ex.category || 'Other',
                                    notes: ex.notes || '',
                                  });
                                  setExpenseOpen(true);
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0 text-destructive"
                                title="Delete"
                                onClick={() => openDeleteExpenseConfirm(ex)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-card p-4 space-y-4 h-fit xl:sticky xl:top-24">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Project summary
            </h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Project price</dt>
                <dd className="font-medium tabular-nums">
                  {currency} {price.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Progress</dt>
                <dd className="font-medium tabular-nums">{project.progress ?? 0}%</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">Total expenses</dt>
                <dd className="font-medium tabular-nums text-orange-400">
                  {currency} {expenseTotal.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between gap-2 border-t border-border pt-3">
                <dt className="text-muted-foreground">Profit</dt>
                <dd
                  className={cn(
                    'font-bold tabular-nums',
                    profit >= 0 ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {currency} {profit.toLocaleString()}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-2 pt-2 border-t border-border">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/file-manager">Files</Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/invoices">Invoices</Link>
              </Button>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>New task · {COLUMNS.find((c) => c.id === addCol)?.title}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveTask} className="space-y-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={addForm.title} onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea
                className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={addForm.description}
                onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={addForm.dueDate} onChange={(e) => setAddForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
            {project.assignees?.length > 0 && (
              <div className="space-y-2">
                <Label>Assigned to</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={addForm.assignedTo}
                  onChange={(e) => setAddForm((f) => ({ ...f, assignedTo: e.target.value }))}
                >
                  <option value="">Unassigned</option>
                  {project.assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addSaving}>
                {addSaving ? 'Saving…' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={expenseOpen}
        onOpenChange={(o) => {
          setExpenseOpen(o);
          if (!o) setExpenseEditingId(null);
        }}
      >
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{expenseEditingId ? 'Edit expense' : 'Add expense'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveExpense} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  required
                  value={expenseForm.expenseDate}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, expenseDate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Amount ({currency})</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={expenseForm.category}
                onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="Materials, travel…"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <textarea
                className="w-full min-h-[72px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Optional"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={expenseSaving}>
                {expenseSaving ? 'Saving…' : expenseEditingId ? 'Save changes' : 'Add expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Task</DialogTitle>
          </DialogHeader>
          {detailLoading || !detail ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input
                  className="mt-1"
                  defaultValue={detail.task.title}
                  key={detail.task.id + detail.task.title}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== detail.task.title) saveDetailForm({ title: v });
                  }}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <textarea
                  className="mt-1 w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                  defaultValue={detail.task.description || ''}
                  key={detail.task.id + '-d'}
                  onBlur={(e) => {
                    const v = e.target.value;
                    if (v !== (detail.task.description || '')) saveDetailForm({ description: v });
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Assigned: </span>
                  <span className="font-medium">{assignLabel(detail.task)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Deadline: </span>
                  <span className="font-medium">{formatDue(detail.task.dueDate)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2">
                <p className="text-sm font-semibold">Time tracking</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={detail.task.hasOpenTimer}
                    onClick={async () => {
                      try {
                        await api.projectTasks.startTimer(detail.task.id);
                        await refreshDetail(detail.task.id);
                        toast({ title: 'Timer started' });
                      } catch (e) {
                        toast({ title: 'Could not start', description: e.message, variant: 'destructive' });
                      }
                    }}
                  >
                    <Play className="w-3.5 h-3.5" />
                    Start
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1"
                    disabled={!detail.task.hasOpenTimer}
                    onClick={async () => {
                      try {
                        await api.projectTasks.stopTimer(detail.task.id);
                        await refreshDetail(detail.task.id);
                        toast({ title: 'Timer stopped' });
                      } catch (e) {
                        toast({ title: 'Could not stop', description: e.message, variant: 'destructive' });
                      }
                    }}
                  >
                    <Square className="w-3.5 h-3.5" />
                    Stop
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                <p className="font-semibold">Deadline & time</p>
                <div>
                  <Label className="text-xs text-muted-foreground">Deadline</Label>
                  <Input
                    type="date"
                    className="mt-1"
                    defaultValue={detail.task.dueDate || ''}
                    key={`due-${detail.task.id}-${detail.task.dueDate || ''}`}
                    onBlur={(e) => {
                      const v = e.target.value || null;
                      if (v !== (detail.task.dueDate || null)) saveDetailForm({ dueDate: v });
                    }}
                  />
                </div>
                <p className="text-muted-foreground">Time worked: {detail.task.hoursWorked ?? 0} h</p>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Paperclip className="w-4 h-4" />
                  Files
                </p>
                <p className="text-xs text-muted-foreground mb-2">Upload and manage files in File Manager.</p>
                <Button asChild size="sm" variant="outline">
                  <Link to="/file-manager">Open File Manager</Link>
                </Button>
              </div>

              <div className="rounded-lg border border-border p-3">
                <p className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  Comments
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                  {(detail.comments || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No comments yet.</p>
                  ) : (
                    detail.comments.map((c) => (
                      <div key={c.id} className="rounded-md bg-secondary/40 px-3 py-2 text-sm">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          {c.authorName} · {c.createdAt ? new Date(c.createdAt).toLocaleString() : ''}
                        </p>
                        <p className="whitespace-pre-wrap">{c.body}</p>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={postComment} className="flex gap-2">
                  <Input
                    placeholder="Write a comment…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <Button type="submit" size="sm" disabled={savingComment || !commentText.trim()}>
                    Send
                  </Button>
                </form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SiteConfirmDialog
        open={expenseDeleteConfirmOpen}
        onOpenChange={setExpenseDeleteConfirmOpen}
        title="Delete expense?"
        message={expenseDeleteMessage}
        onConfirm={executeDeleteExpense}
      />
    </>
  );
};

export default ProjectBoard;
