import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Save, Palette, Trash2, Percent, Receipt, Bell, Mail, Smartphone, Zap, DollarSign, Calendar, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  ApiPanel,
  DetailsBusinessPanel,
  PasswordPanel,
  ProfileAccountPanel,
  TeamPanel,
} from '@/pages/settings/SettingsAccountPanels';

const VALID_TABS = new Set(['details', 'profile', 'password', 'team', 'notifications', 'integrations', 'api']);

const normalizeApiBase = (raw) => {
  const fallback = '/api';
  const value = String(raw ?? '').trim();
  if (!value) return fallback;
  if (/^https?:\/\//i.test(value) || value.startsWith('//')) return value.replace(/\/+$/, '');
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, '') || fallback;
};

const Settings = () => {
  const { settings, updateSettings, loadData, saveBankDetails } = useFinance();
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const initialTab = VALID_TABS.has(tabFromUrl) ? tabFromUrl : 'details';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [local, setLocal] = useState(() => ({ ...settings }));
  const [bankForm, setBankForm] = useState({ accountNumber: '', accountName: '', bankName: '', branch: '' });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [savingBusiness, setSavingBusiness] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetOtpOpen, setResetOtpOpen] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [saving, setSaving] = useState({});
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  const apiDisplay = useMemo(() => normalizeApiBase(import.meta.env.VITE_API_URL), []);

  const setTab = (id) => {
    setActiveTab(id);
    if (id === 'details') setSearchParams({}, { replace: true });
    else setSearchParams({ tab: id }, { replace: true });
  };

  useEffect(() => {
    const t = searchParams.get('tab');
    if (VALID_TABS.has(t)) setActiveTab(t);
    else setActiveTab('details');
  }, [searchParams]);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(localStorage.getItem('theme') || 'light');
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    if (!settings) return;
    setLocal((prev) => {
      const merged = { ...prev, ...settings };
      merged.companyEmail = settings.email != null ? String(settings.email) : merged.companyEmail ?? '';
      merged.accountEmail = user?.email ?? merged.accountEmail ?? '';
      merged.firstName = user?.name?.split(' ')[0] ?? merged.firstName ?? '';
      merged.lastName = user?.name?.split(' ').slice(1).join(' ') ?? merged.lastName ?? '';
      merged.currentPassword = prev.currentPassword ?? '';
      merged.newPassword = prev.newPassword ?? '';
      return merged;
    });
  }, [settings, user]);

  useEffect(() => {
    const b = settings?.bankDetails;
    if (b) {
      setBankForm({
        accountNumber: b.accountNumber || '',
        accountName: b.accountName || '',
        bankName: b.bankName || '',
        branch: b.branch || '',
      });
    }
  }, [settings?.bankDetails]);

  const handleSaveSection = async (sectionName, fields) => {
    setSaving((prev) => ({ ...prev, [sectionName]: true }));
    try {
      const updates = {};
      fields.forEach((field) => {
        if (local[field] !== undefined) {
          updates[field] = local[field];
        }
      });
      await updateSettings(updates);
      toast({
        title: 'Settings saved',
        description: `${sectionName} settings have been saved successfully.`,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: err.message || `Failed to save ${sectionName} settings.`,
        variant: 'destructive',
      });
    } finally {
      setSaving((prev) => ({ ...prev, [sectionName]: false }));
    }
  };

  const hasChanges = (fields) => {
    return fields.some((k) => {
      const current = local[k];
      const saved = settings?.[k];
      if (current === undefined || saved === undefined) return false;
      return String(current ?? '') !== String(saved ?? '');
    });
  };

  const savedBank = settings?.bankDetails || {};
  const bankFormChanged =
    (bankForm.accountNumber || '').trim() !== (savedBank.accountNumber || '').trim() ||
    (bankForm.accountName || '').trim() !== (savedBank.accountName || '').trim() ||
    (bankForm.bankName || '').trim() !== (savedBank.bankName || '').trim() ||
    (bankForm.branch || '').trim() !== (savedBank.branch || '').trim();

  const businessProfileChanged =
    (local.businessName || '').trim() !== (settings?.businessName || '').trim() ||
    (local.phone || '').trim() !== (settings?.phone || '').trim() ||
    (local.companyEmail || '').trim() !== (settings?.email || '').trim() ||
    (local.address || '').trim() !== (settings?.address || '').trim() ||
    (local.website || '').trim() !== (settings?.website || '').trim();

  const openingBalancesChanged =
    (local.openingCash ?? 0) !== (settings?.openingCash ?? 0) ||
    (local.ownerCapital ?? 0) !== (settings?.ownerCapital ?? 0) ||
    (local.payables ?? 0) !== (settings?.payables ?? 0);

  const hasBusinessChanges = businessProfileChanged || bankFormChanged || openingBalancesChanged;

  const hasPersonalChanges =
    (local.firstName || '') !== (user?.name?.split(' ')[0] || '') ||
    (local.lastName || '') !== (user?.name?.split(' ').slice(1).join(' ') || '') ||
    (local.accountEmail || '') !== (user?.email || '');

  const canSavePassword = Boolean(local.currentPassword?.trim() && local.newPassword?.trim());

  const handleSaveBusinessAndBank = async () => {
    setSavingBusiness(true);
    try {
      if (businessProfileChanged) {
        await updateSettings({
          businessName: local.businessName?.trim() || 'My Business',
          phone: local.phone?.trim() || '',
          email: local.companyEmail?.trim() || '',
          address: local.address?.trim() || '',
          website: local.website?.trim() || '',
        });
      }
      if (openingBalancesChanged) {
        await updateSettings({
          openingCash: local.openingCash ?? 0,
          ownerCapital: local.ownerCapital ?? 0,
          payables: local.payables ?? 0,
        });
      }
      if (bankFormChanged) {
        const an = String(bankForm.accountNumber || '').trim();
        const aname = String(bankForm.accountName || '').trim();
        const bname = String(bankForm.bankName || '').trim();
        if (an && aname && bname) {
          await saveBankDetails({
            accountNumber: an,
            accountName: aname,
            bankName: bname,
            branch: bankForm.branch?.trim() || null,
          });
        }
      }
      toast({ title: 'Saved', description: 'Business details updated.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to save.', variant: 'destructive' });
    } finally {
      setSavingBusiness(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingPersonal(true);
    try {
      const fullName = `${String(local.firstName || '').trim()} ${String(local.lastName || '').trim()}`.trim() || user?.name || 'User';
      const nameChanged = fullName !== user?.name;
      const emailChanged = String(local.accountEmail || '').trim() !== String(user?.email || '');
      if (nameChanged || emailChanged) {
        await api.users.update(user?.id, { name: fullName, email: String(local.accountEmail || '').trim() });
        window.dispatchEvent(new CustomEvent('auth:login'));
      }
      await updateSettings({
        businessName: local.businessName,
        phone: local.phone?.trim() ?? '',
        profileAvatar: local.profileAvatar,
      });
      toast({ title: 'Profile saved', description: 'Your account details were updated.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to save profile.', variant: 'destructive' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSavePassword = async () => {
    if (!canSavePassword) return;
    setSavingPersonal(true);
    try {
      await api.users.update(user?.id, { password: local.newPassword });
      setLocal((p) => ({ ...p, currentPassword: '', newPassword: '' }));
      toast({ title: 'Password updated', description: 'You can use your new password next time you sign in.' });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Failed to update password.', variant: 'destructive' });
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Use an image under 5MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await updateSettings({ profileAvatar: reader.result });
        setLocal((prev) => ({ ...prev, profileAvatar: reader.result }));
        toast({ title: 'Avatar updated' });
      } catch (err) {
        toast({ title: 'Upload failed', description: err.message || 'Could not save avatar.', variant: 'destructive' });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveAvatar = async () => {
    try {
      await updateSettings({ profileAvatar: null });
      setLocal((prev) => ({ ...prev, profileAvatar: null }));
      toast({ title: 'Avatar removed' });
    } catch (err) {
      toast({ title: 'Error', description: err.message || 'Could not remove avatar.', variant: 'destructive' });
    }
  };

  const notificationBadgeCount =
    (local.emailNotifications === true ? 1 : 0) + (local.smsNotifications === true ? 1 : 0);

  const tabs = [
    { id: 'details', label: 'My details' },
    { id: 'profile', label: 'Profile' },
    { id: 'password', label: 'Password' },
    { id: 'team', label: 'Team' },
    { id: 'notifications', label: 'Notifications', badge: notificationBadgeCount },
    { id: 'integrations', label: 'Integrations' },
    { id: 'api', label: 'API' },
  ];

  const s = local;

  return (
    <>
      <Helmet>
        <title>Settings - LogozoPOS</title>
        <meta name="description" content="Organize and manage business settings, invoices, tax, bank, and preferences" />
      </Helmet>

      <div className="page-y-sm max-w-5xl mx-auto min-w-0 px-0 sm:px-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Organize and manage your business settings.</p>
        </div>

        <div
          className="mt-5 rounded-xl border border-border bg-muted/40 p-1 flex flex-wrap gap-1 overflow-x-auto"
          role="tablist"
          aria-label="Settings sections"
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0',
                activeTab === t.id
                  ? 'bg-background text-foreground shadow-sm border border-border/80 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
              )}
            >
              <span>{t.label}</span>
              {t.badge != null && t.badge > 0 ? (
                <span className="min-w-[1.25rem] h-5 px-1.5 inline-flex items-center justify-center rounded-md border border-border bg-muted text-[11px] font-semibold tabular-nums">
                  {t.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="page-y mt-6 space-y-6"
        >
          {activeTab === 'details' && (
            <>
              <DetailsBusinessPanel
                local={local}
                setLocal={setLocal}
                settings={settings}
                bankForm={bankForm}
                setBankForm={setBankForm}
                savingBusiness={savingBusiness}
                onSaveBusinessAndBank={handleSaveBusinessAndBank}
                hasBusinessChanges={hasBusinessChanges}
              />

              {/* 3. Tax & Currency */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Tax & Currency</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Configure taxes and currency for invoices and reports.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full px-3 py-2 bg-input border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={s.currency || 'LKR'}
                  onChange={(e) => setLocal((prev) => ({ ...prev, currency: e.target.value }))}
                >
                  <option value="LKR">LKR (රු)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  value={s.taxRate ?? 10}
                  onChange={(e) => setLocal((prev) => ({ ...prev, taxRate: Number(e.target.value || 0) }))}
                />
              </div>
              <div className="md:col-span-2 rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tax Estimation</p>
                  <p className="text-xs text-muted-foreground">Enable simple tax estimation in reports</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.taxEnabled}
                  onClick={() => setLocal((prev) => ({ ...prev, taxEnabled: !prev.taxEnabled }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    s.taxEnabled ? 'bg-primary border-primary' : 'bg-muted border-border',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    s.taxEnabled ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['currency', 'taxRate', 'taxEnabled']) || saving.tax}
                onClick={() => handleSaveSection('Tax & Currency', ['currency', 'taxRate', 'taxEnabled'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.tax ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
            </>
          )}

          {activeTab === 'profile' && (
            <ProfileAccountPanel
              local={local}
              setLocal={setLocal}
              user={user}
              onAvatarUpload={handleAvatarUpload}
              onRemoveAvatar={handleRemoveAvatar}
              onSaveProfile={handleSaveProfile}
              saving={savingPersonal}
              hasPersonalChanges={hasPersonalChanges}
            />
          )}

          {activeTab === 'password' && (
            <PasswordPanel
              local={local}
              setLocal={setLocal}
              showCurrentPassword={showCurrentPassword}
              setShowCurrentPassword={setShowCurrentPassword}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              onSavePassword={handleSavePassword}
              saving={savingPersonal}
              canSavePassword={canSavePassword}
            />
          )}

          {activeTab === 'team' && <TeamPanel user={user} />}

          {activeTab === 'integrations' && (
            <>
              <div className="rounded-lg border border-border bg-card px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">SMS gateway</p>
                  <p className="text-xs text-muted-foreground">Templates, credentials, and sending.</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link to="/sms">Open SMS settings</Link>
                </Button>
              </div>

              <div className="bg-card rounded-lg p-6 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Palette className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Appearance</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Interface preferences.</p>
                <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Theme</p>
                    <p className="text-xs text-muted-foreground">Light or dark mode (saved locally)</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nextTheme = theme === 'dark' ? 'light' : 'dark';
                      localStorage.setItem('theme', nextTheme);
                      setTheme(nextTheme);
                      window.dispatchEvent(new Event('theme-change'));
                    }}
                    className={cn(
                      'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                      theme === 'dark' ? 'bg-primary border-primary' : 'bg-muted border-border',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                        theme === 'dark' ? 'translate-x-7' : 'translate-x-1',
                      )}
                    />
                  </button>
                </div>
              </div>

              <div className="bg-card rounded-lg p-6 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Format settings</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">Customize date and number formats.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Date format</Label>
                    <select
                      id="date-format"
                      className="w-full px-3 py-2 bg-input border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      value={s.dateFormat || 'DD/MM/YYYY'}
                      onChange={(e) => setLocal((prev) => ({ ...prev, dateFormat: e.target.value }))}
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (e.g., 19/02/2026)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (e.g., 02/19/2026)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (e.g., 2026-02-19)</option>
                      <option value="DD-MM-YYYY">DD-MM-YYYY (e.g., 19-02-2026)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number-format">Number format</Label>
                    <select
                      id="number-format"
                      className="w-full px-3 py-2 bg-input border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      value={s.numberFormat || '1,234.56'}
                      onChange={(e) => setLocal((prev) => ({ ...prev, numberFormat: e.target.value }))}
                    >
                      <option value="1,234.56">1,234.56 (Comma thousands, dot decimal)</option>
                      <option value="1.234,56">1.234,56 (Dot thousands, comma decimal)</option>
                      <option value="1 234.56">1 234.56 (Space thousands, dot decimal)</option>
                      <option value="1234.56">1234.56 (No separator)</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!hasChanges(['dateFormat', 'numberFormat']) || saving.format}
                    onClick={() => handleSaveSection('Format', ['dateFormat', 'numberFormat'])}
                    className="gap-2"
                  >
                    <Save className="h-4 w-4" />
                    {saving.format ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>

          {/* 4. Invoice & Branding (Integrations tab) */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Invoice & Branding</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Customize how your invoices look to clients.</p>
            <div className="space-y-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="logo-upload">Invoice Logo</Label>
                <p className="text-xs text-muted-foreground">Optional logo on invoice header. Square images ~80×80 work best.</p>
                <div className="flex items-center gap-4">
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                  onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        setLocal((prev) => ({ ...prev, logo: reader.result }));
                        try {
                          if (reader.result) {
                            localStorage.setItem('ma_invoice_logo', reader.result);
                          }
                        } catch {
                          // ignore
                        }
                      };
                      reader.onerror = () => {
                        toast({ title: 'Upload failed', description: 'Failed to read image file.', variant: 'destructive' });
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                      file:text-sm file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
                  />
                  {s.logo && (
                    <div className="flex items-center gap-2">
                      <img src={s.logo} alt="Logo" className="h-10 w-10 rounded border border-border object-contain bg-white" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setLocal((prev) => ({ ...prev, logo: null }));
                          try {
                            localStorage.removeItem('ma_invoice_logo');
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoice-theme-color">Invoice Theme Color</Label>
                <p className="text-xs text-muted-foreground">Color for headers, totals, and accents on invoices.</p>
                <div className="flex items-center gap-3">
                  <input
                    id="invoice-theme-color"
                    type="color"
                    value={s.invoiceThemeColor || '#F97316'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocal((prev) => ({ ...prev, invoiceThemeColor: value }));
                      try {
                        localStorage.setItem('ma_invoice_theme_color', value);
                      } catch {
                        // ignore
                      }
                    }}
                    className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0"
                  />
                  <Input
                    type="text"
                    value={s.invoiceThemeColor || '#F97316'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLocal((prev) => ({ ...prev, invoiceThemeColor: value }));
                      try {
                        localStorage.setItem('ma_invoice_theme_color', value);
                      } catch {
                        // ignore
                      }
                    }}
                    placeholder="#F97316"
                    className="font-mono w-28"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['logo', 'invoiceThemeColor']) || saving.branding}
                onClick={() => handleSaveSection('Invoice & Branding', ['logo', 'invoiceThemeColor'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.branding ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>

          {/* 5. General Settings */}
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">General Settings</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Common preferences and behaviors.</p>
            <div className="space-y-3 mb-4">
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Show Currency Symbol</p>
                    <p className="text-xs text-muted-foreground">Display currency symbol in amounts</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.showCurrencySymbol ?? true}
                  onClick={() => setLocal((prev) => ({ ...prev, showCurrencySymbol: !(prev.showCurrencySymbol ?? true) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.showCurrencySymbol ?? true) ? 'bg-primary border-primary' : 'bg-muted border-border',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.showCurrencySymbol ?? true) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Invoice Auto-Numbering</p>
                    <p className="text-xs text-muted-foreground">Automatically generate invoice numbers</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.invoiceAutoNumbering ?? false}
                  onClick={() => setLocal((prev) => ({ ...prev, invoiceAutoNumbering: !(prev.invoiceAutoNumbering ?? false) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.invoiceAutoNumbering ?? false) ? 'bg-primary border-primary' : 'bg-muted border-border',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.invoiceAutoNumbering ?? false) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Auto Export</p>
                    <p className="text-xs text-muted-foreground">Automatically export data periodically</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.autoExport ?? false}
                  onClick={() => setLocal((prev) => ({ ...prev, autoExport: !(prev.autoExport ?? false) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.autoExport ?? false) ? 'bg-primary border-primary' : 'bg-muted border-border',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.autoExport ?? false) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['showCurrencySymbol', 'invoiceAutoNumbering', 'autoExport']) || saving.general}
                onClick={() => handleSaveSection('General', ['showCurrencySymbol', 'invoiceAutoNumbering', 'autoExport'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.general ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
            </>
          )}

          {activeTab === 'api' && (
            <>
              <ApiPanel apiBase={apiDisplay} />
              <div className="bg-card rounded-lg p-6 border border-destructive/30">
                <div className="flex items-center gap-2 mb-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <h2 className="text-lg font-semibold text-destructive">Danger zone</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently delete all your data (orders, incomes, expenses, clients, invoices, etc.). Your login account will remain. This cannot be undone.
                </p>
                <Button variant="destructive" onClick={() => setResetConfirmOpen(true)} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Reset data
                </Button>
              </div>
            </>
          )}

          {activeTab === 'notifications' && (
          <div className="bg-card rounded-lg p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Notifications</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Manage how you receive updates and alerts.</p>
            <div className="space-y-3 mb-4">
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Email Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates via email</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.emailNotifications ?? false}
                  onClick={() => setLocal((prev) => ({ ...prev, emailNotifications: !(prev.emailNotifications ?? false) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.emailNotifications ?? false) ? 'bg-primary border-primary' : 'bg-muted border-border',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.emailNotifications ?? false) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
              <div className="rounded-lg border border-border bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">SMS Notifications</p>
                    <p className="text-xs text-muted-foreground">Receive updates via SMS</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.smsNotifications ?? false}
                  onClick={() => setLocal((prev) => ({ ...prev, smsNotifications: !(prev.smsNotifications ?? false) }))}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    (s.smsNotifications ?? false) ? 'bg-primary border-primary' : 'bg-muted border-border',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    (s.smsNotifications ?? false) ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={!hasChanges(['emailNotifications', 'smsNotifications']) || saving.notifications}
                onClick={() => handleSaveSection('Notifications', ['emailNotifications', 'smsNotifications'])}
                className="gap-2"
              >
                <Save className="h-4 w-4" />
                {saving.notifications ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
          )}
        </motion.div>
      </div>

      {/* Reset confirmation dialog */}
      <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset All Data?</DialogTitle>
            <DialogDescription>
              This will delete all data from our database. Are you sure you want to reset? An OTP will be sent to your registered phone number to confirm.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={resetLoading}
              onClick={async () => {
                setResetLoading(true);
                try {
                  const res = await api.auth.sendResetDataOtp();
                  setResetConfirmOpen(false);
                  setResetOtp('');
                  setDevOtp(res.devOtp || '');
                  setResetOtpOpen(true);
                  toast({ title: 'OTP sent', description: res.devOtp ? `Dev OTP: ${res.devOtp}` : 'Check your phone for the OTP.' });
                } catch (err) {
                  toast({ title: 'Failed', description: err?.message || 'Could not send OTP. Add a phone number in Settings first.', variant: 'destructive' });
                } finally {
                  setResetLoading(false);
                }
              }}
            >
              {resetLoading ? 'Sending...' : 'Yes, Reset Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP verification dialog */}
      <Dialog open={resetOtpOpen} onOpenChange={(open) => { setResetOtpOpen(open); if (!open) setResetOtp(''); setDevOtp(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enter OTP</DialogTitle>
            <DialogDescription>
              Enter the OTP sent to your registered phone number to confirm reset.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="reset-otp">OTP</Label>
              <Input
                id="reset-otp"
                type="text"
                placeholder="123456"
                value={resetOtp}
                onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
              />
            </div>
            {devOtp && (
              <p className="text-xs text-muted-foreground">Dev OTP: {devOtp}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setResetOtpOpen(false); setResetOtp(''); setDevOtp(''); }}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={resetLoading || resetOtp.length < 4}
              onClick={async () => {
                setResetLoading(true);
                try {
                  await api.auth.confirmResetData(resetOtp);
                  setResetOtpOpen(false);
                  setResetOtp('');
                  setDevOtp('');
                  await loadData();
                  toast({ title: 'Data reset successfully', description: 'All your data has been deleted.' });
                } catch (err) {
                  toast({ title: 'Verification failed', description: err?.message || 'Invalid or expired OTP.', variant: 'destructive' });
                } finally {
                  setResetLoading(false);
                }
              }}
            >
              {resetLoading ? 'Verifying...' : 'Verify & Reset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Settings;