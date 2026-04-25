import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import useDebounce from '@/hooks/useDebounce';
import {
  Search,
  UserPlus,
  Pencil,
  Trash2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Ban,
  Unlock,
  Users,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

const PROTECTED_EMAIL = 'LOGOZODEV@gmail.com';
const PER_PAGE = 10;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [blockAction, setBlockAction] = useState(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
  });
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      const list = await api.users.list();
      setUsers(Array.isArray(list) ? list : []);
    } catch (err) {
      toast({
        title: 'Failed to load users',
        description: err.message || 'Could not fetch users',
        variant: 'destructive',
      });
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      setFilteredUsers(
        users.filter((u) => {
          const blocked = u.is_blocked === true || u.is_blocked === 't';
          const statusTxt = blocked ? 'blocked' : 'active';
          return (
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q) ||
            (u.role && String(u.role).toLowerCase().includes(q)) ||
            statusTxt.includes(q)
          );
        })
      );
    } else {
      setFilteredUsers(users);
    }
    setCurrentPage(1);
  }, [debouncedSearch, users]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast({
        title: 'Name and email required',
        description: 'Please enter name and email.',
        variant: 'destructive',
      });
      return;
    }
    if (!editingUser && !form.password) {
      toast({
        title: 'Password required',
        description: 'Please enter a password for new users.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      if (editingUser) {
        const payload = {
          name: form.name.trim(),
          email: form.email.trim(),
          role: form.role === 'admin' ? 'admin' : 'staff',
        };
        if (form.password) payload.password = form.password;
        await api.users.update(editingUser.id, payload);
        toast({ title: 'User updated', description: `${form.name} has been updated.` });
      } else {
        await api.users.create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role === 'admin' ? 'admin' : 'staff',
        });
        toast({ title: 'User added', description: `${form.name} can now log in.` });
      }
      setForm({ name: '', email: '', password: '', role: 'staff' });
      setEditingUser(null);
      setIsDialogOpen(false);
      loadUsers();
    } catch (err) {
      toast({
        title: editingUser ? 'Failed to update user' : 'Failed to add user',
        description: err.message || 'Could not save user',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({
      name: user.name,
      email: user.email,
      password: '',
      role: String(user.role || '').toLowerCase() === 'admin' ? 'admin' : 'staff',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (user) => {
    if (user.email === PROTECTED_EMAIL) {
      toast({
        title: 'Cannot delete',
        description: 'This account is protected and cannot be deleted.',
        variant: 'destructive',
      });
      return;
    }
    setDeleteConfirmInput('');
    setDeleteCandidate(user);
  };

  const closeDeleteDialog = () => {
    setDeleteCandidate(null);
    setDeleteConfirmInput('');
  };

  const confirmDeleteUser = async () => {
    const u = deleteCandidate;
    if (!u || deleteConfirmInput.trim() !== 'DELETE') return;
    setDeleteSubmitting(true);
    try {
      await api.users.delete(u.id);
      toast({ title: 'User deleted', description: `${u.name} has been removed.` });
      closeDeleteDialog();
      await loadUsers();
    } catch (err) {
      toast({
        title: 'Failed to delete',
        description: err?.message || 'Could not delete user',
        variant: 'destructive',
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d;
    }
  };

  const roleLabel = (user) =>
    String(user?.role || 'staff').toLowerCase() === 'admin' ? 'Admin' : 'Staff';
  const isAdminRole = (user) => String(user?.role || '').toLowerCase() === 'admin';
  const isUserBlocked = (user) => user?.is_blocked === true || user?.is_blocked === 't';

  const requestBlockToggle = (user, block) => {
    if (block && user.email?.toLowerCase().trim() === PROTECTED_EMAIL) {
      toast({
        title: 'Cannot block',
        description: 'This account is protected and cannot be blocked.',
        variant: 'destructive',
      });
      return;
    }
    setBlockAction({ user, block });
  };

  const applyBlockToggle = async () => {
    const ctx = blockAction;
    if (!ctx) return;
    const { user, block } = ctx;
    try {
      await api.users.update(user.id, {
        name: user.name,
        email: user.email,
        role: String(user.role || '').toLowerCase() === 'admin' ? 'admin' : 'staff',
        is_blocked: block,
      });
      toast({
        title: block ? 'User blocked' : 'User unblocked',
        description: block ? `${user.name} can no longer sign in.` : `${user.name} can sign in again.`,
      });
      await loadUsers();
    } catch (err) {
      toast({
        title: block ? 'Failed to block' : 'Failed to unblock',
        description: err?.message || 'Could not update user',
        variant: 'destructive',
      });
    } finally {
      setBlockAction(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PER_PAGE));
  const start = (currentPage - 1) * PER_PAGE;
  const pageRows = filteredUsers.slice(start, start + PER_PAGE);

  const pageNumbers = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (!pageNumbers.includes(i)) pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) pageNumbers.push('...');
    if (totalPages > 1) pageNumbers.push(totalPages);
  }

  return (
    <>
      <Helmet>
        <title>Users - LOGOZODEV</title>
        <meta name="description" content="Manage app users and add new users" />
      </Helmet>

      <div className="page-y">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Users</h1>
            </div>
            <p className="text-muted-foreground text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">Add and manage users who can log in to the app.</p>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end lg:shrink-0">
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              Refresh
            </Button>
            <Button
              onClick={() => {
                setEditingUser(null);
                setForm({ name: '', email: '', password: '', role: 'staff' });
                setIsDialogOpen(true);
              }}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input border border-border"
          />
        </div>

        <div className="w-full max-w-[1600px] rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <span className="text-foreground font-semibold text-lg">Users</span>
              <span className="bg-primary/20 text-primary text-xs font-medium px-2.5 py-0.5 rounded-full border border-primary/40">
                {filteredUsers.length} users
              </span>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary" aria-label="More options">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col divide-y divide-border md:hidden">
            {loading ? (
              <p className="px-4 py-8 text-center text-muted-foreground text-sm">Loading users…</p>
            ) : pageRows.map((user, index) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors"
              >
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm ring-2 ring-border flex-shrink-0">
                  {(user.name || 'U').charAt(0).toUpperCase()}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{user.name}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${isAdminRole(user) ? 'bg-primary/15 text-primary border-primary/40' : 'bg-secondary text-muted-foreground border-border'}`}>
                      {roleLabel(user)}
                    </span>
                    {isUserBlocked(user) ? (
                      <span className="inline-flex items-center gap-1 bg-destructive/15 border border-destructive/40 text-destructive text-xs font-medium px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />Blocked
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-secondary border border-border text-green-400 text-xs font-medium px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Active
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{user.email}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{formatDate(user.created_at)}</div>
                </div>
                {/* Actions */}
                <div className="flex items-center gap-1 text-muted-foreground flex-shrink-0">
                  {isUserBlocked(user) ? (
                    <button type="button" onClick={() => requestBlockToggle(user, false)} className="p-2 hover:text-green-500 hover:bg-secondary rounded transition-colors" title="Unblock">
                      <Unlock className="w-4 h-4" />
                    </button>
                  ) : (
                    <button type="button" onClick={() => requestBlockToggle(user, true)} disabled={user.email?.toLowerCase().trim() === PROTECTED_EMAIL} className="p-2 hover:text-amber-500 hover:bg-secondary rounded transition-colors disabled:opacity-40" title="Block">
                      <Ban className="w-4 h-4" />
                    </button>
                  )}
                  <button type="button" onClick={() => openEdit(user)} className="p-2 hover:text-foreground hover:bg-secondary rounded transition-colors" title="Edit">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(user)} className="p-2 hover:text-destructive hover:bg-secondary rounded transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Email address</th>
                  <th className="px-4 py-3 w-36" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading users...</td>
                  </tr>
                ) : (
                  pageRows.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-border transition-colors hover:bg-secondary/30"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm ring-2 ring-border">
                            {(user.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-foreground font-medium text-sm">{user.name}</div>
                            <div className="text-muted-foreground text-xs">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full border ${isAdminRole(user) ? 'bg-primary/15 text-primary border-primary/40' : 'bg-secondary text-muted-foreground border-border'}`}>
                          {roleLabel(user)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {isUserBlocked(user) ? (
                          <span className="inline-flex items-center gap-1.5 bg-destructive/15 border border-destructive/40 text-destructive text-xs font-medium px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive" />Blocked
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-secondary border border-border text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-sm">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          {isUserBlocked(user) ? (
                            <button type="button" onClick={() => requestBlockToggle(user, false)} className="hover:text-green-500 transition-colors p-1 rounded hover:bg-secondary" title="Unblock">
                              <Unlock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button type="button" onClick={() => requestBlockToggle(user, true)} disabled={user.email?.toLowerCase().trim() === PROTECTED_EMAIL} className="hover:text-amber-500 transition-colors p-1 rounded hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none" title={user.email?.toLowerCase().trim() === PROTECTED_EMAIL ? 'Protected account' : 'Block'}>
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button type="button" onClick={() => handleDelete(user)} className="hover:text-destructive transition-colors p-1 rounded hover:bg-secondary" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => openEdit(user)} className="hover:text-foreground transition-colors p-1 rounded hover:bg-secondary" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No users found</div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="gap-2 border-border"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {pageNumbers.map((page, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-secondary text-foreground'
                        : page === '...'
                        ? 'text-muted-foreground cursor-default'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="gap-2 border-border"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setEditingUser(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="user@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password {editingUser && '(leave blank to keep)'}</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  placeholder={editingUser ? 'Leave blank to keep current' : 'Password'}
                  required={!editingUser}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => handleChange('role', e.target.value)}
                  disabled={editingUser?.email?.toLowerCase() === PROTECTED_EMAIL}
                  className="flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Admins share one dataset; staff share another. The protected account role cannot be changed here.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : editingUser ? 'Update User' : 'Add User'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <ConfirmDialog
          open={!!blockAction}
          onOpenChange={(open) => {
            if (!open) setBlockAction(null);
          }}
          title={blockAction?.block ? 'Block user?' : 'Unblock user?'}
          description={
            blockAction
              ? blockAction.block
                ? `${blockAction.user.name} will be signed out and cannot log in until unblocked.`
                : `Allow ${blockAction.user.name} to log in again?`
              : ''
          }
          confirmText={blockAction?.block ? 'Block' : 'Unblock'}
          confirmVariant={blockAction?.block ? 'destructive' : 'default'}
          onConfirm={applyBlockToggle}
        />

        <Dialog
          open={!!deleteCandidate}
          onOpenChange={(open) => {
            if (!open && !deleteSubmitting) closeDeleteDialog();
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete user?</DialogTitle>
              <DialogDescription className="sr-only">
                Confirm permanent user removal by typing DELETE in the field below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <p className="text-lg font-semibold text-foreground">Are you sure?</p>
              {deleteCandidate ? (
                <p className="text-base text-muted-foreground">
                  This will permanently remove {deleteCandidate.name}
                  {deleteCandidate.email ? (
                    <>
                      {' '}
                      (<span className="truncate inline-block max-w-full align-bottom">{deleteCandidate.email}</span>)
                    </>
                  ) : null}{' '}
                  and their data. This cannot be undone.
                </p>
              ) : null}
            </div>
            <div className="space-y-2 pt-1">
              <label htmlFor="delete-confirm-input" className="text-base font-semibold text-foreground">
                Type DELETE to confirm
              </label>
              <Input
                id="delete-confirm-input"
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
                onClick={confirmDeleteUser}
                disabled={deleteConfirmInput.trim() !== 'DELETE' || deleteSubmitting}
              >
                {deleteSubmitting ? 'Deleting…' : 'Delete user'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default Users;
