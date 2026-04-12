import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Settings2, CalendarClock, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { getStorageData, setStorageData } from '@/utils/storage';

const newJobId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `sch_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

const SMS = () => {
  const { clients } = useFinance();
  const { user } = useAuth();
  const { toast } = useToast();
  const [smsConfig, setSmsConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupOpen, setSetupOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [message, setMessage] = useState('');
  const [scheduleSendAt, setScheduleSendAt] = useState('');
  const [scheduledJobs, setScheduledJobs] = useState([]);
  const processingRef = useRef(new Set());

  const [form, setForm] = useState({
    userId: '',
    apiKey: '',
    baseUrl: 'https://www.smslenz.lk/api',
    senderId: 'SMSlenzDEMO',
  });

  const storageKey = useMemo(
    () => `logozopos_scheduled_sms_v1_${user?.email || user?.id || 'default'}`,
    [user?.email, user?.id],
  );

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

  useEffect(() => {
    setScheduledJobs(getStorageData(storageKey, []));
  }, [storageKey]);

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

  const persistJobs = (jobs) => {
    setStorageData(storageKey, jobs);
    setScheduledJobs(jobs);
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

  const handleSchedule = () => {
    if (!scheduleSendAt) {
      toast({
        title: 'Date and time required',
        description: 'Choose when to send the message.',
        variant: 'destructive',
      });
      return;
    }
    const due = new Date(scheduleSendAt).getTime();
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
    if (selectedIds.size === 0) {
      toast({
        title: 'Select recipients',
        description: 'Choose at least one customer with a phone number.',
        variant: 'destructive',
      });
      return;
    }
    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Enter the message to send at the scheduled time.',
        variant: 'destructive',
      });
      return;
    }
    const job = {
      id: newJobId(),
      message: message.trim().slice(0, 621),
      sendAt: new Date(scheduleSendAt).toISOString(),
      clientIds: [...selectedIds],
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const next = [...getStorageData(storageKey, []), job];
    persistJobs(next);
    toast({
      title: 'Message scheduled',
      description: `Will send to ${selectedIds.size} recipient(s) at the chosen time (while the app is open).`,
    });
    setScheduleSendAt('');
  };

  const cancelScheduled = (id) => {
    const next = getStorageData(storageKey, []).filter((j) => j.id !== id);
    persistJobs(next);
    toast({ title: 'Schedule removed', description: 'This message will not be sent.' });
  };

  useEffect(() => {
    if (!smsConfig) return;

    const processDue = async () => {
      const jobs = getStorageData(storageKey, []);
      if (!jobs.length) return;

      const now = Date.now();
      let next = [...jobs];
      let changed = false;

      for (let i = 0; i < next.length; i++) {
        const job = next[i];
        if (job.status !== 'pending') continue;
        const due = new Date(job.sendAt).getTime();
        if (due > now) continue;
        if (processingRef.current.has(job.id)) continue;

        processingRef.current.add(job.id);
        try {
          const selectedClients = clients.filter((c) => job.clientIds.includes(c.id));
          const phones = selectedClients.map(getPhone).filter(Boolean);
          if (phones.length === 0) {
            next[i] = {
              ...job,
              status: 'failed',
              error: 'No valid phone numbers for selected clients',
              processedAt: new Date().toISOString(),
            };
            changed = true;
          } else {
            await api.sms.sendBulk({ contacts: phones, message: job.message.slice(0, 621) });
            next[i] = {
              ...job,
              status: 'sent',
              sentAt: new Date().toISOString(),
            };
            changed = true;
            toast({
              title: 'Scheduled SMS sent',
              description: `Message sent to ${phones.length} recipient(s).`,
            });
          }
        } catch (err) {
          next[i] = {
            ...job,
            status: 'failed',
            error: err.message || 'Send failed',
            processedAt: new Date().toISOString(),
          };
          changed = true;
          toast({
            title: 'Scheduled send failed',
            description: err.message || 'Could not send SMS.',
            variant: 'destructive',
          });
        } finally {
          processingRef.current.delete(job.id);
        }
      }

      if (changed) {
        setStorageData(storageKey, next);
        setScheduledJobs(next);
      }
    };

    processDue();
    const interval = setInterval(processDue, 15000);
    return () => clearInterval(interval);
  }, [smsConfig, storageKey, clients]);

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

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Messages</h1>
            <p className="text-muted-foreground">
              Send SMS to your customers or schedule messages for a date and time. Set up your SMS gateway first.
            </p>
          </div>
          <Button variant="outline" onClick={() => setSetupOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            {smsConfig ? 'Edit Gateway' : 'Setup Gateway'}
          </Button>
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
                {clientsWithPhone.length} customer(s) with phone numbers. Use the selection for instant send or for a
                scheduled send below.
              </p>
              <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                <table className="w-full">
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

            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Schedule a message</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Choose date and time, keep your recipients and message above, then schedule. At that time, the app will
                send SMS to the same selected clients using the message above (phones are resolved from your client list
                at send time).
              </p>
              <p className="text-xs text-muted-foreground border border-border rounded-md px-3 py-2 bg-secondary/30">
                Scheduled sends run while LogozoPOS is open in your browser. Open the app before the scheduled time so
                messages can go out automatically.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div className="space-y-2">
                  <Label htmlFor="schedule-send-at">Send date &amp; time</Label>
                  <Input
                    id="schedule-send-at"
                    type="datetime-local"
                    value={scheduleSendAt}
                    onChange={(e) => setScheduleSendAt(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={handleSchedule} disabled={selectedIds.size === 0 || !message.trim()}>
                  <CalendarClock className="w-4 h-4 mr-2" />
                  Schedule message
                </Button>
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
                    {pendingJobs.length} pending — next check every 15 seconds while the app is open.
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

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
