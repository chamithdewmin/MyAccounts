import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Save, Building2, Receipt, Landmark, Wallet, Palette, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 600;

const Settings = () => {
  const { settings, updateSettings, saveBankDetails } = useFinance();
  const { toast } = useToast();
  const [local, setLocal] = useState(() => ({ ...settings }));
  const [bankForm, setBankForm] = useState({ accountNumber: '', accountName: '', bankName: '', branch: '' });
  const [bankSaving, setBankSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (!settings) return;
    setLocal((prev) => ({ ...prev, ...settings }));
  }, [settings]);

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

  const debouncedSave = useCallback(
    (partial) => {
      setLocal((prev) => ({ ...prev, ...partial }));
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        updateSettings(partial);
        saveTimeoutRef.current = null;
      }, DEBOUNCE_MS);
    },
    [updateSettings]
  );

  const saveNow = useCallback(
    (partial) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      setLocal((prev) => ({ ...prev, ...partial }));
      updateSettings(partial);
    },
    [updateSettings]
  );

  const s = local;

  const savedBank = settings?.bankDetails || {};
  const bankFormChanged =
    (bankForm.accountNumber || '').trim() !== (savedBank.accountNumber || '').trim() ||
    (bankForm.accountName || '').trim() !== (savedBank.accountName || '').trim() ||
    (bankForm.bankName || '').trim() !== (savedBank.bankName || '').trim() ||
    (bankForm.branch || '').trim() !== (savedBank.branch || '').trim();

  const mainFields = [
    'businessName', 'phone', 'taxRate', 'currency', 'logo', 'invoiceThemeColor',
    'openingCash', 'ownerCapital', 'payables', 'theme', 'taxEnabled',
  ];
  const hasMainSettingsChanges = mainFields.some(
    (k) => String(s[k] ?? '') !== String((settings ?? {})[k] ?? '')
  );

  return (
    <>
      <Helmet>
        <title>Settings - MyAccounts</title>
        <meta name="description" content="Organize and manage business settings, invoices, tax, bank, and preferences" />
      </Helmet>

      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Organize and manage your business settings.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 1. Business Profile */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Business Profile</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Your core business information used across invoices and reports.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={s.businessName}
                  onChange={(e) => debouncedSave({ businessName: e.target.value })}
                  placeholder="My Business"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  value={s.phone ?? ''}
                  onChange={(e) => debouncedSave({ phone: e.target.value })}
                  placeholder="+94761234567 or 0761234567"
                />
              </div>
            </div>
          </div>

          {/* 2. Invoice & Branding */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Invoice & Branding</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Customize how your invoices look to clients.</p>
            <div className="space-y-4">
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
                      reader.onload = () => saveNow({ logo: reader.result });
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0
                      file:text-sm file:font-semibold file:bg-secondary file:text-foreground hover:file:bg-secondary/80"
                  />
                  {s.logo && (
                    <div className="flex items-center gap-2">
                      <img src={s.logo} alt="Logo" className="h-10 w-10 rounded border border-secondary object-contain bg-white" />
                      <Button type="button" variant="outline" size="sm" onClick={() => saveNow({ logo: null })}>Remove</Button>
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
                    onChange={(e) => debouncedSave({ invoiceThemeColor: e.target.value })}
                    className="h-10 w-14 cursor-pointer rounded border border-secondary bg-transparent p-0"
                  />
                  <Input
                    type="text"
                    value={s.invoiceThemeColor || '#F97316'}
                    onChange={(e) => debouncedSave({ invoiceThemeColor: e.target.value })}
                    placeholder="#F97316"
                    className="font-mono w-28"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Tax & Currency */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Percent className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Tax & Currency</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Configure taxes and currency for invoices and reports.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={s.currency}
                  onChange={(e) => debouncedSave({ currency: e.target.value })}
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
                  value={s.taxRate}
                  onChange={(e) => debouncedSave({ taxRate: Number(e.target.value || 0) })}
                />
              </div>
              <div className="md:col-span-2 rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tax Estimation</p>
                  <p className="text-xs text-muted-foreground">Enable simple tax estimation in reports</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.taxEnabled}
                  onClick={() => saveNow({ taxEnabled: !s.taxEnabled })}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    s.taxEnabled ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                  )}
                >
                  <span className={cn(
                    'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                    s.taxEnabled ? 'translate-x-7' : 'translate-x-1',
                  )} />
                </button>
              </div>
            </div>
          </div>

          {/* 4. Bank Details */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Bank Account</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">For Bank Transfer invoices. Account details are encrypted.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank-account-number">Account Number *</Label>
                <Input
                  id="bank-account-number"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))}
                  placeholder="1234567890"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-account-name">Account Name *</Label>
                <Input
                  id="bank-account-name"
                  value={bankForm.accountName}
                  onChange={(e) => setBankForm((p) => ({ ...p, accountName: e.target.value }))}
                  placeholder="Your Business Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-name">Bank Name *</Label>
                <Input
                  id="bank-name"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
                  placeholder="Commercial Bank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank-branch">Branch (optional)</Label>
                <Input
                  id="bank-branch"
                  value={bankForm.branch}
                  onChange={(e) => setBankForm((p) => ({ ...p, branch: e.target.value }))}
                  placeholder="Colombo Main"
                />
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              disabled={!bankFormChanged || bankSaving}
              onClick={async () => {
                const an = String(bankForm.accountNumber || '').trim();
                const aname = String(bankForm.accountName || '').trim();
                const bn = String(bankForm.bankName || '').trim();
                const errors = [];
                if (!an) errors.push('Account Number is required');
                if (!aname) errors.push('Account Name is required');
                if (!bn) errors.push('Bank Name is required');
                if (an && !/^[0-9A-Za-z\s-]+$/.test(an)) errors.push('Account Number: numbers, letters, spaces, hyphens only');
                if (errors.length) {
                  toast({ title: 'Validation failed', description: errors.join('. '), variant: 'destructive' });
                  return;
                }
                setBankSaving(true);
                try {
                  await saveBankDetails({ accountNumber: an, accountName: aname, bankName: bn, branch: bankForm.branch?.trim() || null });
                  toast({ title: 'Bank details saved' });
                } catch (err) {
                  toast({ title: 'Save failed', description: err?.message || 'Failed', variant: 'destructive' });
                } finally {
                  setBankSaving(false);
                }
              }}
            >
              {bankSaving ? 'Saving...' : 'Save Bank Details'}
            </Button>
          </div>

          {/* 5. Opening Balances */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Wallet className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Opening Balances</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Starting figures for Balance Sheet. Set when you first use the system.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening-cash">Opening Cash</Label>
                <Input
                  id="opening-cash"
                  type="number"
                  value={s.openingCash ?? 0}
                  onChange={(e) => debouncedSave({ openingCash: Number(e.target.value || 0) })}
                />
                <p className="text-xs text-muted-foreground">Cash at business start</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-capital">Owner Capital</Label>
                <Input
                  id="owner-capital"
                  type="number"
                  value={s.ownerCapital ?? 0}
                  onChange={(e) => debouncedSave({ ownerCapital: Number(e.target.value || 0) })}
                />
                <p className="text-xs text-muted-foreground">Owner deposits / investment</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payables">Payables</Label>
                <Input
                  id="payables"
                  type="number"
                  value={s.payables ?? 0}
                  onChange={(e) => debouncedSave({ payables: Number(e.target.value || 0) })}
                />
                <p className="text-xs text-muted-foreground">Unpaid bills at start</p>
              </div>
            </div>
          </div>

          {/* 6. App Preferences */}
          <div className="bg-card rounded-lg p-6 border border-secondary">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Appearance</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Interface preferences.</p>
            <div className="rounded-lg border border-secondary bg-secondary/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Theme</p>
                <p className="text-xs text-muted-foreground">Light or dark mode</p>
              </div>
              <button
                type="button"
                onClick={() => saveNow({ theme: s.theme === 'dark' ? 'light' : 'dark' })}
                className={cn(
                  'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                  s.theme === 'dark' ? 'bg-primary border-primary' : 'bg-muted border-secondary',
                )}
              >
                <span className={cn(
                  'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                  s.theme === 'dark' ? 'translate-x-7' : 'translate-x-1',
                )} />
              </button>
            </div>
          </div>

          {/* Save All */}
          <div className="flex justify-end">
            <Button
              disabled={!hasMainSettingsChanges}
              onClick={() => {
                if (saveTimeoutRef.current) {
                  clearTimeout(saveTimeoutRef.current);
                  saveTimeoutRef.current = null;
                }
                updateSettings(local);
                toast({
                  title: 'Changes saved',
                  description: 'Your settings have been updated successfully.',
                });
              }}
              className="gap-2"
            >
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>

        </motion.div>
      </div>
    </>
  );
};

export default Settings;