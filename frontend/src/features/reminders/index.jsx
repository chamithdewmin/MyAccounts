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
  const [smsDefaultMessage, setSmsDefaultMessage] = useState('');
  const [smsConfigured, setSmsConfigured] = useState(false);
  const [form, setForm] = useState({
    reason: '',
    amount: '',
    reminderDate: '',
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
    const contact = (settings?.phone || '').trim();
    if (!form.reason?.trim() || !form.reminderDate) {
      toast({ title: 'Required fields', description: 'Enter reminder reason/name and date.', variant: 'destructive' });
      return;
    }
    if (!contact) {
      toast({ title: 'Phone required', description: 'Add your phone number in Settings first.', variant: 'destructive' });
      return;
    }
    const amountNum = parseFloat(form.amount) || 0;
    try {
      await api.reminders.create({
        reason: form.reason.trim(),
        amount: amountNum,
        reminderDate: form.reminderDate,
        smsContact: formatPhone(contact) || contact,
        message: form.message,
      });
      toast({ title: 'Reminder added', description: 'Reminder has been saved.' });
      setAddOpen(false);
      setForm({ reason: '', amount: '', reminderDate: '', message: '' });
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
    const amt = reminder.amount ?? item?.amount ?? item?.total ?? 0;
    setSmsItem(item ? { ...item, amount: amt, phone: reminder.smsContact, client_phone: reminder.smsContact } : { amount: amt, phone: reminder.smsContact, client_phone: reminder.smsContact });
    setSmsType(reminder.type || 'reminder');
    const amtStr = (reminder.amount && Number(reminder.amount) > 0) ? ` ${settings?.currency || 'LKR'} ${Number(reminder.amount).toLocaleString()}` : '';
    setSmsDefaultMessage(reminder.message || (reminder.reason ? `Reminder: ${reminder.reason}${amtStr}` : ''));
    setSmsOpen(true);
  };

  const handleSendReminderNow = async (reminder) => {
    const contact = reminder.smsContact?.trim();
    if (!contact) {
      toast({ title: 'No contact', description: 'This reminder has no phone number.', variant: 'destructive' });
      return;
    }
    const amtStr = (reminder.amount && Number(reminder.amount) > 0) ? ` ${settings?.currency || 'LKR'} ${Number(reminder.amount).toLocaleString()}` : '';
    const msg = reminder.message?.trim() || (reminder.reason ? `Reminder: ${reminder.reason}${amtStr}` : 'Reminder');
    try {
      await api.sms.sendBulk({ contacts: [formatPhone(contact)], message: msg.slice(0, 621) });
      toast({ title: 'Reminder sent', description: 'SMS sent successfully.' });
      loadReminders();
    } catch (err) {
      toast({ title: 'Send failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <>
      <Helmet>
        <title>Reminders - LOGOZODEV</title>
        <meta name="description" content="Payment and expense reminders with SMS" />
      </Helmet>

      <div className="page-y">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reminders</h1>
            <p className="text-muted-foreground text-sm sm:text-base mt-1 max-w-2xl leading-relaxed">
              Create reminders and send them via SMS when ready.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center w-full lg:w-auto lg:justify-end lg:shrink-0">
            {!smsConfigured && (
              <div className="flex flex-wrap items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm w-full sm:w-auto">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">SMS not set up</span>
                <Button asChild variant="outline" size="sm">
                  <Link to="/sms">Setup</Link>
                </Button>
              </div>
            )}
            <Button onClick={() => setAddOpen(true)} className="w-full sm:w-auto">
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
            className="bg-card border border-border rounded-lg p-12 text-center"
          >
            <Bell className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No reminders yet</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add reminders with a reason or name. When ready, send them via SMS with one click.
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add your first reminder
            </Button>
          </motion.div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="flex flex-col gap-3 md:hidden">
            {reminders.map((r) => {
              const item = getRefItem(r.type, r.referenceId);
              const label = r.reason
                ? r.reason
                : r.type === 'income'
                  ? (item?.clientName || 'Unknown') + ' - ' + (settings.currency || '') + ' ' + (item?.amount || 0).toLocaleString()
                  : (item?.category || 'Expense') + ' - ' + (settings.currency || '') + ' ' + (item?.amount || 0).toLocaleString();
              return (
                <div key={r.id} className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
                  {/* Name + status */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-foreground leading-snug">{label}</span>
                    <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${r.status === 'sent' ? 'bg-green-500/20 text-green-600' : 'bg-amber-500/20 text-amber-600'}`}>
                      {r.status || 'pending'}
                    </span>
                  </div>

                  {/* Date + amount + contact */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {(r.reminderDate || '').slice(0, 10) && (
                      <span>📅 {(r.reminderDate || '').slice(0, 10)}</span>
                    )}
                    {r.amount > 0 && (
                      <span className="font-medium text-foreground">{settings?.currency || 'LKR'} {Number(r.amount).toLocaleString()}</span>
                    )}
                    {r.smsContact && (
                      <span>{r.smsContact}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-wrap border-t border-border pt-3">
                    <Button
                      size="sm"
                      onClick={() => handleSendReminderNow(r)}
                      disabled={!smsConfigured}
                      className="flex-1"
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      Remind
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openRemindSms(r)}
                      disabled={!smsConfigured}
                      className="flex-1"
                    >
                      Edit & send
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDeleteReminder(r.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Reason / Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Reminder Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reminders.map((r) => {
                    const item = getRefItem(r.type, r.referenceId);
                    const label = r.reason
                      ? r.reason
                      : r.type === 'income'
                        ? (item?.clientName || 'Unknown') + ' - ' + (settings.currency || '') + ' ' + (item?.amount || 0).toLocaleString()
                        : (item?.category || 'Expense') + ' - ' + (settings.currency || '') + ' ' + (item?.amount || 0).toLocaleString();
                    return (
                      <tr key={r.id} className="border-t border-border hover:bg-secondary/20">
                        <td className="px-4 py-3 text-sm">{label}</td>
                        <td className="px-4 py-3 text-sm">{(r.amount && r.amount > 0) ? `${settings?.currency || 'LKR'} ${Number(r.amount).toLocaleString()}` : '—'}</td>
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
                              onClick={() => handleSendReminderNow(r)}
                              disabled={!smsConfigured}
                              title={!smsConfigured ? 'Setup SMS first' : 'Send reminder SMS now (e.g. day before)'}
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Remind by SMS
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openRemindSms(r)}
                              disabled={!smsConfigured}
                              title="Edit message and send"
                            >
                              Edit & send
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
          </>
        )}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Reminder</DialogTitle>
            <DialogDescription>Create a reminder. You can send it via SMS later.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddReminder} className="space-y-4">
            <div>
              <Label>Reminder reason or name</Label>
              <Input
                value={form.reason}
                onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Payment follow-up, Invoice reminder"
                required
              />
            </div>
            <div>
              <Label>Amount (optional)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder={`${settings?.currency || 'LKR'} 0`}
              />
            </div>
            <div>
              <Label>Reminder date</Label>
              <Input type="date" value={form.reminderDate} onChange={(e) => setForm((f) => ({ ...f, reminderDate: e.target.value }))} required />
            </div>
            {settings?.phone && (
              <p className="text-xs text-muted-foreground">
                SMS will be sent to: {settings.phone} (from Settings)
              </p>
            )}
            {!settings?.phone && (
              <p className="text-xs text-amber-600">
                Add phone number in Settings to enable SMS reminders.
              </p>
            )}
            <div>
              <Label>Message (optional)</Label>
              <textarea
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                className="w-full min-h-[80px] px-3 py-2 bg-card border border-border rounded-lg resize-none text-sm"
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
        defaultMessage={smsDefaultMessage}
        settings={settings}
        clients={clients}
      />
    </>
  );
};

export default Reminders;
