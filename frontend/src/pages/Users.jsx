import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Search, Plus, RefreshCw, UserPlus, Pencil, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';

const PROTECTED_EMAIL = 'logozodev@gmail.com';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
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

  useEffect(() => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (u) =>
            u.name?.toLowerCase().includes(q) ||
            u.email?.toLowerCase().includes(q)
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

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
        const payload = { name: form.name.trim(), email: form.email.trim() };
        if (form.password) payload.password = form.password;
        await api.users.update(editingUser.id, payload);
        toast({ title: 'User updated', description: `${form.name} has been updated.` });
      } else {
        await api.users.create({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        toast({ title: 'User added', description: `${form.name} can now log in.` });
      }
      setForm({ name: '', email: '', password: '' });
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
    setForm({ name: user.name, email: user.email, password: '' });
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
    if (!window.confirm(`Delete user "${user.name}"?`)) return;
    try {
      await api.users.delete(user.id);
      toast({ title: 'User deleted', description: `${user.name} has been removed.` });
      loadUsers();
    } catch (err) {
      toast({
        title: 'Failed to delete',
        description: err.message || 'Could not delete user',
        variant: 'destructive',
      });
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

  return (
    <>
      <Helmet>
        <title>Users - MyAccounts</title>
        <meta name="description" content="Manage app users and add new users" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Users</h1>
            <p className="text-muted-foreground">Add and manage users who can log in to the app.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadUsers} disabled={loading}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setIsDialogOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="bg-card rounded-lg border border-secondary overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                      Loading users...
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="border-b border-secondary hover:bg-secondary/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="p-2 hover:bg-secondary rounded-lg transition-colors text-green-500 hover:text-green-400"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {user.email !== PROTECTED_EMAIL && (
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              className="p-2 hover:bg-secondary rounded-lg transition-colors text-red-500 hover:text-red-400"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {!loading && filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No users found</p>
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
      </div>
    </>
  );
};

export default Users;
