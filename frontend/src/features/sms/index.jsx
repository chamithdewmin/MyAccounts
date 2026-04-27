import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { MessageSquare, Send, Settings2, CalendarClock, Trash2, Loader2, Search, Users, CheckCheck, Clock, X } from 'lucide-react';
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
  const [clientSearch, setClientSearch] = useState('');
  const [scheduleClientSearch, setScheduleClientSearch] = useState('');

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
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clientsWithPhone;
    return clientsWithPhone.filter(c => c.name?.toLowerCase().includes(q) || getPhone(c)?.includes(q));
  }, [clientsWithPhone, clientSearch]);

  const scheduleFilteredClients = useMemo(() => {
    const q = scheduleClientSearch.trim().toLowerCase();
    if (!q) return clientsWithPhone;
    return clientsWithPhone.filter(c => c.name?.toLowerCase().includes(q) || getPhone(c)?.includes(q));
  }, [clientsWithPhone, scheduleClientSearch]);

  const pendingJobs = scheduledJobs.filter((j) => j.status === 'pending');
  const sortedJobs = useMemo(() => [...scheduledJobs].sort((a, b) => new Date(b.sendAt) - new Date(a.sendAt)), [scheduledJobs]);

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
        <title>Messages - LOGOZODEV</title>
        <meta name="description" content="Send and schedule SMS to customers" />
      </Helmet>

      <div className="page-y">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight">Messages</h1>
              <p className="text-muted-foreground text-sm">Send bulk SMS to your customers instantly or schedule for later.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {smsConfig && (
              <Button type="button" variant="outline" onClick={openScheduleDialog} className="gap-2">
                <CalendarClock className="w-4 h-4" />
                Schedule
              </Button>
            )}
            <Button variant={smsConfig ? 'outline' : 'default'} type="button" onClick={() => setSetupOpen(true)} className="gap-2">
              <Settings2 className="w-4 h-4" />
              {smsConfig ? 'Gateway' : 'Setup Gateway'}
            </Button>
          </div>
        </div>

        {/* Gateway not configured */}
        {!smsConfig ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-12 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Connect your SMS gateway</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto text-sm">
              Enter your SMSlenz.lk (or compatible) credentials to start sending SMS to your customers.
            </p>
            <Button onClick={() => setSetupOpen(true)} className="gap-2">
              <Settings2 className="w-4 h-4" />
              Setup Gateway
            </Button>
          </motion.div>
        ) : (
          <>
            {/* COMPOSE PANEL */}
            <div className="grid gap-5 lg:grid-cols-[1fr_340px]">

              {/* Left — message compose */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-border flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold">Compose Message</h2>
                  {selectedIds.size > 0 && (
                    <span className="ml-auto inline-flex items-center gap-1 bg-primary/15 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
                      <Users className="w-3 h-3" />
                      {selectedIds.size} selected
                    </span>
                  )}
                </div>
                <div className="p-5 flex flex-col gap-4 flex-1">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium">Message</label>
                    <div className="relative">
                      <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message here…"
                        className="w-full min-h-[140px] px-4 py-3 bg-input border border-border rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        maxLength={621}
                      />
                      <span className={`absolute bottom-3 right-3 text-xs font-medium tabular-nums ${message.length > 580 ? 'text-red-400' : 'text-muted-foreground'}`}>
                        {message.length}/621
                      </span>
                    </div>
                    {/* Character bar */}
                    <div className="h-1 rounded-full bg-secondary overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${message.length > 580 ? 'bg-red-400' : 'bg-primary'}`}
                        style={{ width: `${(message.length / 621) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-auto flex flex-col sm:flex-row gap-3 pt-2">
                    {selectedIds.size > 0 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())} className="gap-1 text-muted-foreground">
                        <X className="w-4 h-4" /> Clear selection
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleSendBulk}
                      disabled={selectedIds.size === 0 || !message.trim() || sending}
                      className="gap-2 sm:ml-auto"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {sending ? 'Sending…' : selectedIds.size === 0 ? 'Select recipients first' : `Send to ${selectedIds.size} recipient${selectedIds.size > 1 ? 's' : ''}`}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right — recipients */}
              <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col">
                <div className="px-4 py-4 border-b border-border">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Recipients
                    </h2>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === clientsWithPhone.length && clientsWithPhone.length > 0}
                        onChange={selectAll}
                        className="rounded"
                      />
                      Select all
                    </label>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search customers…"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                    />
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 max-h-[320px] divide-y divide-border">
                  {clientsWithPhone.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No customers with phone numbers.</p>
                    </div>
                  ) : filteredClients.length === 0 ? (
                    <p className="px-4 py-8 text-center text-muted-foreground text-sm">No matches for "{clientSearch}"</p>
                  ) : (
                    filteredClients.map((c) => {
                      const isSelected = selectedIds.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/8' : 'hover:bg-secondary/40'}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(c.id)}
                            className="rounded flex-shrink-0"
                          />
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                            {(c.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium flex-1 truncate">{c.name}</span>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{getPhone(c)}</span>
                          {isSelected && <CheckCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                        </label>
                      );
                    })
                  )}
                </div>

                <div className="px-4 py-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {clientsWithPhone.length} customer{clientsWithPhone.length !== 1 ? 's' : ''} with phone numbers
                  </p>
                </div>
              </div>
            </div>

            {/* HISTORY */}
            {scheduledJobs.length > 0 && (
              <div className="bg-card border border-border rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                  <h2 className="font-semibold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Scheduled &amp; Recent
                  </h2>
                  {pendingJobs.length > 0 && (
                    <span className="text-xs bg-amber-500/15 text-amber-500 font-semibold px-2.5 py-1 rounded-full">
                      {pendingJobs.length} pending
                    </span>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {sortedJobs.map((job) => (
                    <div key={job.id} className="flex items-start gap-4 px-5 py-4 hover:bg-secondary/20 transition-colors">
                      {/* Status dot */}
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                        job.status === 'sent' ? 'bg-green-500' : job.status === 'failed' ? 'bg-red-500' : 'bg-amber-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-1">{job.message}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(job.sendAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{job.clientIds?.length ?? 0}</span>
                          {job.error && <span className="text-red-400 truncate max-w-[200px]">{job.error}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                          job.status === 'sent' ? 'bg-green-500/15 text-green-500'
                          : job.status === 'failed' ? 'bg-red-500/15 text-red-500'
                          : 'bg-amber-500/15 text-amber-500'
                        }`}>{job.status}</span>
                        {job.status === 'pending' && (
                          <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => cancelScheduled(job.id)} aria-label="Cancel">
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {pendingJobs.length > 0 && (
                  <div className="px-5 py-3 border-t border-border bg-amber-500/5">
                    <p className="text-xs text-muted-foreground">{pendingJobs.length} pending — server sends automatically at the scheduled time.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={scheduleDialogOpen} onOpenChange={(o) => { setScheduleDialogOpen(o); if (!o) setScheduleClientSearch(''); }}>
        <DialogContent className="max-w-lg max-h-[min(92dvh,calc(100svh-2rem))] overflow-y-auto sm:max-w-xl" aria-describedby="schedule-dialog-desc">
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
                <div className="flex items-center gap-2">
                  <Label className="text-base">Clients</Label>
                  {scheduleModalSelectedIds.size > 0 && (
                    <span className="inline-flex items-center gap-1 bg-primary/15 text-primary text-xs font-semibold px-2 py-0.5 rounded-full">
                      <CheckCheck className="w-3 h-3" />
                      {scheduleModalSelectedIds.size} selected
                    </span>
                  )}
                </div>
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

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by name or phone…"
                  value={scheduleClientSearch}
                  onChange={(e) => setScheduleClientSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-input border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
              </div>

              {/* Client list */}
              <div className="max-h-48 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                {clientsWithPhone.length === 0 ? (
                  <p className="px-4 py-6 text-center text-muted-foreground text-sm">
                    No clients with phone numbers. Add phones in Clients first.
                  </p>
                ) : scheduleFilteredClients.length === 0 ? (
                  <p className="px-4 py-6 text-center text-muted-foreground text-sm">No matches for "{scheduleClientSearch}"</p>
                ) : (
                  scheduleFilteredClients.map((c) => {
                    const isSelected = scheduleModalSelectedIds.has(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-primary/8' : 'hover:bg-secondary/40'}`}
                      >
                        <input
                          type="checkbox"
                          className="rounded flex-shrink-0"
                          checked={isSelected}
                          onChange={() => toggleScheduleModalSelect(c.id)}
                        />
                        <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                          {(c.name || '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium flex-1 truncate">{c.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{getPhone(c)}</span>
                        {isSelected && <CheckCheck className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                      </label>
                    );
                  })
                )}
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
