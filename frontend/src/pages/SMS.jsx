import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Settings2, CalendarClock, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useFinance } from '@/contexts/FinanceContext';

const SMS = () => {
  const { clients } = useFinance();
  const { toast } = useToast();
  const [smsConfig, setSmsConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [message, setMessage] = useState('');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleModalSendAt, setScheduleModalSendAt] = useState('');
  const [scheduleModalMessage, setScheduleModalMessage] = useState('');
  const [scheduleModalSelectedIds, setScheduleModalSelectedIds] = useState(() => new Set());
  const [scheduledJobs, setScheduledJobs] = useState([]);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const [form, setForm] = useState({
    userId: '',
    apiKey: '',
    baseUrl: 'https://www.smslenz.lk/api',
    senderId: 'SMSlenzDEMO',
  });

  const loadSmsConfig = async () => {
    try {
      const cfg = await api.sms.getSettings();
      setSmsConfig(cfg?.userId ? cfg : null);
      if (cfg?.userId) {
        setForm((f) => ({
          ...f,
          userId: cfg.userId || '',
          apiKey: cfg.apiKey ? '••••••••' : '',
          baseUrl: cfg.baseUrl || f.baseUrl,
          senderId: cfg.senderId || f.senderId,
        }));
      }
    } catch {
      setSmsConfig(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSmsConfig();
  }, []);

  const loadScheduledList = async () => {
    try {
      const list = await api.sms.listScheduled();
      setScheduledJobs(Array.isArray(list) ? list : []);
    } catch {
      setScheduledJobs([]);
    }
  };

  useEffect(() => {
    if (!smsConfig) return undefined;
    loadScheduledList();
    const t = setInterval(loadScheduledList, 30000);
    return () => clearInterval(t);
  }, [smsConfig]);

  const handleSaveAndTest = async (e) => {
    e.preventDefault();
    if (!form.userId.trim() || !form.apiKey.trim() || !form.baseUrl.trim() || !form.senderId.trim()) {
      toast({
        title: 'All fields required',
        description: 'Please fill User ID, API Key, Base URL, and Sender ID.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    setTesting(true);
    try {
      await api.sms.saveSettings({
        userId: form.userId.trim(),
        apiKey: form.apiKey === '••••••••' ? undefined : form.apiKey.trim(),
        baseUrl: form.baseUrl.trim(),
        senderId: form.senderId.trim(),
      });
      await api.sms.test();
      setSmsConfig({ userId: form.userId, baseUrl: form.baseUrl, senderId: form.senderId });
      setSetupOpen(false);
      loadSmsConfig();
      toast({
        title: "You're all set!",
        description: 'SMS gateway is configured correctly.',
      });
    } catch (err) {
      toast({
        title: 'Setup failed',
        description: err.message || 'Invalid credentials or API error. Please check your details.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
      setTesting(false);
    }
  };

  const handleTestOnly = async () => {
    if (!form.userId.trim() || !form.apiKey.trim() || form.apiKey === '••••••••') {
      toast({
        title: 'Save first',
        description: 'Save your settings before testing.',
        variant: 'destructive',
      });
      return;
    }
    setTesting(true);
    try {
      await api.sms.saveSettings({
        userId: form.userId.trim(),
        apiKey: form.apiKey.trim(),
        baseUrl: form.baseUrl.trim(),
        senderId: form.senderId.trim(),
      });
      await api.sms.test();
      toast({
        title: "You're all set!",
        description: 'SMS gateway is configured correctly.',
      });
    } catch (err) {
      toast({
        title: 'Test failed',
        description: err.message || 'Please check your credentials and try again.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const withPhone = clients.filter((c) => c.phone?.trim());
    if (selectedIds.size === withPhone.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(withPhone.map((c) => c.id)));
    }
  };

  const getPhone = (c) => {
    const p = (c.phone || '').trim();
    if (!p) return null;
    return p.startsWith('+') ? p : `+94${p.replace(/^0/, '')}`;
  };

  const handleSendBulk = async () => {
    const selectedClients = clients.filter((c) => selectedIds.has(c.id));
    const phones = selectedClients.map(getPhone).filter(Boolean);
    if (phones.length === 0) {
      toast({
        title: 'No valid contacts',
        description: 'Select customers with phone numbers.',
        variant: 'destructive',
      });
      return;
    }
    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please enter a message.',
        variant: 'destructive',
      });
      return;
    }
    setSending(true);
    try {
      await api.sms.sendBulk({ contacts: phones, message: message.trim() });
      toast({
        title: 'SMS sent',
        description: `Message sent to ${phones.length} recipient(s).`,
      });
      setMessage('');
      setSelectedIds(new Set());
    } catch (err) {
      toast({
        title: 'Send failed',
        description: err.message || 'Could not send SMS.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const openScheduleDialog = () => {
    setScheduleModalSendAt('');
    setScheduleModalMessage('');
    setScheduleModalSelectedIds(new Set());
    setScheduleDialogOpen(true);
  };

  const toggleScheduleModalSelect = (id) => {
    setScheduleModalSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scheduleModalSelectAll = () => {
    const withPhone = clients.filter((c) => c.phone?.trim());
    if (scheduleModalSelectedIds.size === withPhone.length && withPhone.length > 0) {
      setScheduleModalSelectedIds(new Set());
    } else {
      setScheduleModalSelectedIds(new Set(withPhone.map((c) => c.id)));
    }
  };

  const handleSetSchedule = async () => {
    if (!scheduleModalSendAt) {
      toast({
        title: 'Date and time required',
        description: 'Choose when to send the message.',
        variant: 'destructive',
      });
      return;
    }
    const due = new Date(scheduleModalSendAt).getTime();
    if (Number.isNaN(due)) {
      toast({ title: 'Invalid date', description: 'Please pick a valid date and time.', variant: 'destructive' });
      return;
    }
    if (due <= Date.now()) {
      toast({
        title: 'Pick a future time',
        description: 'Scheduled send time must be in the future.',
        variant: 'destructive',
      });
      return;
    }
    if (scheduleModalSelectedIds.size === 0) {
      toast({
        title: 'Select recipients',
        description: 'Choose at least one customer with a phone number.',
        variant: 'destructive',
      });
      return;
    }
    if (!scheduleModalMessage.trim()) {
      toast({
        title: 'Message required',
        description: 'Enter the message to send at the scheduled time.',
        variant: 'destructive',
      });
      return;
    }
    setScheduleSaving(true);
    try {
      await api.sms.schedule({
        message: scheduleModalMessage.trim().slice(0, 621),
        sendAt: new Date(scheduleModalSendAt).toISOString(),
        clientIds: [...scheduleModalSelectedIds],
      });
      toast({
        title: 'Schedule saved',
        description: `The server will send SMS to ${scheduleModalSelectedIds.size} recipient(s) at the scheduled time — even if you close the app.`,
      });
      setScheduleDialogOpen(false);
      setScheduleModalSendAt('');
      setScheduleModalMessage('');
      setScheduleModalSelectedIds(new Set());
      await loadScheduledList();
    } catch (err) {
      toast({
        title: 'Could not save schedule',
        description: err.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setScheduleSaving(false);
    }
  };

  const cancelScheduled = async (id) => {
    try {
      await api.sms.cancelScheduled(id);
      toast({ title: 'Schedule removed', description: 'This message will not be sent.' });
      await loadScheduledList();
    } catch (err) {
      toast({
        title: 'Could not cancel',
        description: err.message || 'It may have already been sent.',
        variant: 'destructive',
      });
    }
  };

  const clientsWithPhone = clients.filter((c) => getPhone(c));

  const pendingJobs = scheduledJobs.filter((j) => j.status === 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Messages - LogozoPOS</title>
        <meta name="description" content="Send and schedule SMS to customers" />
      </Helmet>

      <div className="page-y">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">
              Send SMS instantly or use Schedule Messages — the server sends at the chosen time, even when you are not
              logged in. Set up your SMS gateway first.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {smsConfig && (
              <Button type="button" onClick={openScheduleDialog}>
                <CalendarClock className="w-4 h-4 mr-2" />
                Schedule Messages
              </Button>
            )}
            <Button variant="outline" type="button" onClick={() => setSetupOpen(true)}>
              <Settings2 className="w-4 h-4 mr-2" />
              {smsConfig ? 'Edit Gateway' : 'Setup Gateway'}
            </Button>
          </div>
        </div>

        {!smsConfig ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-lg p-8 text-center"
          >
            <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Setup your SMS gateway</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Enter your SMSlenz.lk (or compatible) gateway details to send SMS to customers.
            </p>
            <Button onClick={() => setSetupOpen(true)}>
              <Settings2 className="w-4 h-4 mr-2" />
              Setup SMS Gateway
            </Button>
          </motion.div>
        ) : (
          <>
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Select customers</h2>
              <p className="text-sm text-muted-foreground mb-4">
                {clientsWithPhone.length} customer(s) with phone numbers. Select recipients for instant send.
              </p>
              <div className="max-h-64 overflow-y-auto overflow-x-auto border border-border rounded-lg">
                <table className="w-full min-w-[280px]">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === clientsWithPhone.length && clientsWithPhone.length > 0}
                          onChange={selectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsWithPhone.map((c) => (
                      <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-2 text-sm">{c.name}</td>
                        <td className="px-4 py-2 text-sm text-muted-foreground">{c.phone}</td>
                      </tr>
                    ))}
                    {clientsWithPhone.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          No customers with phone numbers. Add phone numbers to your clients first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-sm font-medium">Message (max 621 chars)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full min-h-[100px] px-3 py-2 bg-card border border-border rounded-lg resize-none"
                  maxLength={621}
                />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <span className="text-xs text-muted-foreground">{message.length}/621</span>
                  <Button
                    type="button"
                    onClick={handleSendBulk}
                    disabled={selectedIds.size === 0 || !message.trim() || sending}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? 'Sending...' : `Send now to ${selectedIds.size} recipient(s)`}
                  </Button>
                </div>
              </div>
            </div>

            {scheduledJobs.length > 0 && (
              <div className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">Scheduled &amp; recent</h2>
                <div className="overflow-x-auto border border-border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">When (local)</th>
                        <th className="px-3 py-2 text-left font-medium">Recipients</th>
                        <th className="px-3 py-2 text-left font-medium">Preview</th>
                        <th className="px-3 py-2 text-left font-medium">Status</th>
                        <th className="px-3 py-2 text-right font-medium"> </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...scheduledJobs]
                        .sort((a, b) => new Date(b.sendAt) - new Date(a.sendAt))
                        .map((job) => (
                          <tr key={job.id} className="border-t border-border">
                            <td className="px-3 py-2 whitespace-nowrap">
                              {new Date(job.sendAt).toLocaleString(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </td>
                            <td className="px-3 py-2">{job.clientIds?.length ?? 0}</td>
                            <td className="px-3 py-2 max-w-[200px] truncate text-muted-foreground">{job.message}</td>
                            <td className="px-3 py-2 capitalize">
                              {job.status}
                              {job.error && (
                                <span className="block text-xs text-destructive truncate max-w-[140px]" title={job.error}>
                                  {job.error}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {job.status === 'pending' && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => cancelScheduled(job.id)}
                                  aria-label="Cancel scheduled message"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {pendingJobs.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-3">
                    {pendingJobs.length} pending — the server sends automatically at each scheduled time.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto sm:max-w-xl" aria-describedby="schedule-dialog-desc">
          <DialogHeader>
            <DialogTitle>Schedule Messages</DialogTitle>
            <DialogDescription id="schedule-dialog-desc">
              Pick date and time, choose clients, and enter your message. The server will send SMS at that time — you do
              not need to keep the app open.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="modal-schedule-at">Send date &amp; time</Label>
              <Input
                id="modal-schedule-at"
                type="datetime-local"
                value={scheduleModalSendAt}
                onChange={(e) => setScheduleModalSendAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-schedule-msg">Message (max 621 chars)</Label>
              <textarea
                id="modal-schedule-msg"
                value={scheduleModalMessage}
                onChange={(e) => setScheduleModalMessage(e.target.value)}
                placeholder="Type your message..."
                className="w-full min-h-[88px] px-3 py-2 bg-background border border-border rounded-lg resize-none text-sm"
                maxLength={621}
              />
              <span className="text-xs text-muted-foreground">{scheduleModalMessage.length}/621</span>
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-base">Clients</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={scheduleModalSelectAll}
                  disabled={clientsWithPhone.length === 0}
                >
                  {scheduleModalSelectedIds.size === clientsWithPhone.length && clientsWithPhone.length > 0
                    ? 'Deselect all'
                    : 'Select all'}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-10" />
                      <th className="px-3 py-2 text-left font-medium">Name</th>
                      <th className="px-3 py-2 text-left font-medium">Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientsWithPhone.map((c) => (
                      <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            className="rounded"
                            checked={scheduleModalSelectedIds.has(c.id)}
                            onChange={() => toggleScheduleModalSelect(c.id)}
                          />
                        </td>
                        <td className="px-3 py-2">{c.name}</td>
                        <td className="px-3 py-2 text-muted-foreground">{c.phone}</td>
                      </tr>
                    ))}
                    {clientsWithPhone.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-6 text-center text-muted-foreground">
                          No clients with phone numbers. Add phones in Clients first.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setScheduleDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSetSchedule} disabled={scheduleSaving}>
                {scheduleSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Set Schedule'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Setup SMS Gateway</DialogTitle>
            <DialogDescription>
              Enter your SMS gateway credentials. Use SMSlenzDEMO as Sender ID for testing.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAndTest} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                placeholder="e.g. 295"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                value={form.apiKey}
                onChange={(e) => setForm((f) => ({ ...f, apiKey: e.target.value }))}
                placeholder="Your API key"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">API Base URL</label>
              <Input
                value={form.baseUrl}
                onChange={(e) => setForm((f) => ({ ...f, baseUrl: e.target.value }))}
                placeholder="https://www.smslenz.lk/api"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sender ID</label>
              <Input
                value={form.senderId}
                onChange={(e) => setForm((f) => ({ ...f, senderId: e.target.value }))}
                placeholder="SMSlenzDEMO (for testing)"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Use SMSlenzDEMO for testing. Get your credentials from smslenz.lk
            </p>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestOnly}
                disabled={testing || !form.userId || !form.apiKey || form.apiKey === '••••••••'}
              >
                {testing ? 'Testing...' : 'Test'}
              </Button>
              <Button type="submit" disabled={saving || testing}>
                {saving ? 'Saving...' : 'Save & Test'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SMS;
