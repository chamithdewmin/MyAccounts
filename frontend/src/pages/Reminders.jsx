import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, MessageSquare, Plus, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useFinance } from '@/contexts/FinanceContext';
import RemindBySmsModal from '@/components/RemindBySmsModal';

const formatPhone = (p) => {
  if (!p?.trim()) return '';
  const s = String(p).trim();
  return s.startsWith('+') ? s : `+94${s.replace(/^0/, '')}`;
};

const Reminders = () => {
  const { incomes, expenses, clients, settings } = useFinance();
  const { toast } = useToast();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [smsItem, setSmsItem] = useState(null);
  const [smsType, setSmsType] = useState('income');
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [form, setForm] = useState({
    type: 'income',
    referenceId: '',
    reminderDate: '',
    smsContact: '',
    message: '',
  });

  const loadReminders = async () => {
    try {
      const list = await api.reminders.list();
      setReminders(Array.isArray(list) ? list : []);
    } catch {
      setReminders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReminders();
    api.sms.getSettings().then((cfg) => setSmsConfigured(!!cfg?.userId)).catch(() => setSmsConfigured(false));
  }, []);

  const getRefItem = (type, id) => {
    if (type === 'income') return incomes.find((i) => i.id === id);
    return expenses.find((e) => e.id === id);
  };

  const handleAddReminder = async (e) => {
    e.preventDefault();
    if (!form.referenceId || !form.reminderDate || !form.smsContact) {
      toast({ title: 'Required fields', description: 'Select item, date, and phone number.', variant: 'destructive' });
      return;
    }
    try {
      await api.reminders.create({
        type: form.type,
        referenceId: form.referenceId,
        reminderDate: form.reminderDate,
        smsContact: formatPhone(form.smsContact) || form.smsContact.trim(),
        message: form.message,
      });
      toast({ title: 'Reminder added', description: 'Reminder has been saved.' });
      setAddOpen(false);
      setForm({ type: 'income', referenceId: '', reminderDate: '', smsContact: '', message: '' });
      loadReminders();
    } catch (err) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleDeleteReminder = async (id) => {
    try {
      await api.reminders.delete(id);
      setReminders((prev) => prev.filter((r) => r.id !== id));
      toast({ title: 'Reminder removed' });
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const openRemindSms = (reminder) => {
    const item = getRefItem(reminder.type, reminder.referenceId);
    setSmsItem(item ? { ...item, phone: reminder.smsContact, client_phone: reminder.smsContact } : { amount: 0, phone: reminder.smsContact, client_phone: reminder.smsContact });
    setSmsType(reminder.type);
    setSmsOpen(true);
  };

  const incomeOptions = incomes.map((i) => ({ id: i.id, label: `${i.clientName || 'Unknown'} - ${settings.currency} ${(i.amount || 0).toLocaleString()} (${(i.date || '').slice(0, 10)})` }));
  const expenseOptions = expenses.map((e) => ({ id: e.id, label: `${e.category} - ${settings.currency} ${(e.amount || 0).toLocaleString()} (${(e.date || '').slice(0, 10)})` }));

  return (
    <>
      <Helmet>
        <title>Reminders - MyAccounts</title>
        <meta name="description" content="Payment and expense reminders with SMS" />
      </Helmet>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reminders</h1>
            <p className="text-muted-foreground">
              Schedule and send SMS reminders for income payments and expenses.
            </p>
          </div>
          <div className="flex gap-2">
            {!smsConfigured && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="text-muted-foreground">SMS not set up</span>
                <Button asChild variant="outline" size="sm">
                  <Link to="/sms">Setup</Link>
                </Button>
              </div>
            )}
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Reminder
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : reminders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-secondary rounded-lg p-12 text-center"
          >
            <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No reminders yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add reminders for income payments or expenses. When ready, send them via SMS with one click.
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first reminder
            </Button>
          </motion.div>
        ) : (
          <div className="bg-card border border-secondary rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Item</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Reminder Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.map((r) => {
                    const item = getRefItem(r.type, r.referenceId);
                    const label = r.type === 'income'
                      ? (item?.clientName || 'Unknown') + ' - ' + (settings.currency || '') + ' ' + (item?.amount || 0).toLocaleString()
                      : (item?.category || 'Expense') + ' - ' + (settings.currency || '') + ' ' + (item?.amount || 0).toLocaleString();
                    return (
                      <tr key={r.id} className="border-t border-secondary hover:bg-secondary/20">
                        <td className="px-4 py-3 text-sm capitalize">{r.type}</td>
                        <td className="px-4 py-3 text-sm">{label}</td>
                        <td className="px-4 py-3 text-sm">{(r.reminderDate || '').slice(0, 10)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{r.smsContact}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${r.status === 'sent' ? 'bg-green-500/20 text-green-600' : 'bg-amber-500/20 text-amber-600'}`}>
                            {r.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRemindSms(r)}
                              disabled={!smsConfigured}
                              title={!smsConfigured ? 'Setup SMS first' : 'Send reminder via SMS'}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Remind by SMS
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteReminder(r.id)}>
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>Link a reminder to an income or expense. You can send it via SMS later.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddReminder} className="space-y-4">
            <div>
              <Label>Type</Label>
              <select
                className="w-full px-3 py-2 bg-background border border-secondary rounded-lg"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value, referenceId: '' }))}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>
            <div>
              <Label>{form.type === 'income' ? 'Income' : 'Expense'}</Label>
              <select
                className="w-full px-3 py-2 bg-background border border-secondary rounded-lg"
                value={form.referenceId}
                onChange={(e) => setForm((f) => ({ ...f, referenceId: e.target.value }))}
                required
              >
                <option value="">Select...</option>
                {(form.type === 'income' ? incomeOptions : expenseOptions).map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
              {(form.type === 'income' ? incomeOptions : expenseOptions).length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No {form.type}s yet. Add some first.</p>
              )}
            </div>
            <div>
              <Label>Reminder date</Label>
              <Input type="date" value={form.reminderDate} onChange={(e) => setForm((f) => ({ ...f, reminderDate: e.target.value }))} required />
            </div>
            <div>
              <Label>SMS contact number</Label>
              <Input
                value={form.smsContact}
                onChange={(e) => setForm((f) => ({ ...f, smsContact: e.target.value }))}
                placeholder="+94761234567 or 0761234567"
                required
              />
            </div>
            <div>
              <Label>Message (optional)</Label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full min-h-[80px] px-3 py-2 bg-background border border-secondary rounded-lg resize-none text-sm"
                placeholder="Custom message when sending..."
              />
            </div>
            <Button type="submit">Add Reminder</Button>
          </form>
        </DialogContent>
      </Dialog>

      <RemindBySmsModal
        open={smsOpen}
        onOpenChange={setSmsOpen}
        item={smsItem}
        type={smsType}
        settings={settings}
        clients={clients}
      />
    </>
  );
};

export default Reminders;
