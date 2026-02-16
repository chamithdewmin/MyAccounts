import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
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
  const [local, setLocal] = useState(settings);
  const [bankForm, setBankForm] = useState({ accountNumber: '', accountName: '', bankName: '', branch: '' });
  const [bankSaving, setBankSaving] = useState(false);
  const saveTimeoutRef = useRef(null);
  const initialSync = useRef(false);

  useEffect(() => {
    if (!initialSync.current && settings?.businessName != null) {
      setLocal((prev) => ({ ...prev, ...settings }));
      initialSync.current = true;
    }
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
    'businessName', 'phone', 'taxRate', 'currency', 'logo',
    'openingCash', 'ownerCapital', 'payables', 'theme', 'taxEnabled',
  ];
  const hasMainSettingsChanges = mainFields.some(
    (k) => String(s[k] ?? '') !== String((settings ?? {})[k] ?? '')
  );

  return (
    <>
      <Helmet>
        <title>Settings - MyAccounts</title>
        <meta name="description" content="Configure business settings, tax, and currency" />
      </Helmet>

      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Configure application settings and preferences.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-6 border border-secondary space-y-6"
        >
          {/* Business Information */}
          <div>
            <h2 className="text-xl font-bold mb-4">Business Information</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input
                  id="company-name"
                  value={s.businessName}
                  onChange={(e) => debouncedSave({ businessName: e.target.value })}
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
              <div className="space-y-3 p-4 rounded-lg border border-secondary bg-secondary/30">
                <h3 className="text-sm font-semibold">Bank Account Details</h3>
                <p className="text-xs text-muted-foreground">Saved to database only. Used for Bank Transfer invoices. Account number is encrypted.</p>
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
                    <Label htmlFor="bank-branch">Branch Location (optional)</Label>
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
                    if (an && !/^[0-9A-Za-z\s-]+$/.test(an)) {
                      errors.push('Account Number can only contain numbers, letters, spaces, and hyphens');
                    }
                    if (errors.length > 0) {
                      toast({ title: 'Validation failed', description: errors.join('. '), variant: 'destructive' });
                      return;
                    }
                    setBankSaving(true);
                    try {
                      await saveBankDetails({ accountNumber: an, accountName: aname, bankName: bn, branch: bankForm.branch?.trim() || null });
                      toast({ title: 'Bank details saved to database' });
                    } catch (err) {
                      const msg = err?.message || err?.error || 'Failed to save';
                      toast({ title: 'Save failed', description: typeof msg === 'string' ? msg : JSON.stringify(msg), variant: 'destructive' });
                    } finally {
                      setBankSaving(false);
                    }
                  }}
                >
                  {bankSaving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  value={s.taxRate}
                  onChange={(e) =>
                    debouncedSave({ taxRate: Number(e.target.value || 0) })
                  }
                />
              </div>
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
                <Label htmlFor="logo-upload">Invoice Logo</Label>
                <p className="text-xs text-muted-foreground">
                  Optional logo shown on invoice header. Square images around 80×80 work best.
                </p>
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
                        saveNow({ logo: reader.result });
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="block w-full text-sm text-muted-foreground
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-secondary file:text-foreground
                      hover:file:bg-secondary/80"
                  />
                  {s.logo && (
                    <div className="flex items-center gap-2">
                      <img
                        src={s.logo}
                        alt="Logo preview"
                        className="h-10 w-10 rounded border border-secondary object-contain bg-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => saveNow({ logo: null })}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Opening Balances (for Balance Sheet) */}
          <div>
            <h2 className="text-xl font-bold mb-4">Opening Balances</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Used for Balance Sheet calculations. Set your starting figures when you first use the system.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening-cash">Opening Cash</Label>
                <Input
                  id="opening-cash"
                  type="number"
                  value={s.openingCash ?? 0}
                  onChange={(e) =>
                    debouncedSave({ openingCash: Number(e.target.value || 0) })
                  }
                />
                <p className="text-xs text-muted-foreground">Cash at business start</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-capital">Owner Capital</Label>
                <Input
                  id="owner-capital"
                  type="number"
                  value={s.ownerCapital ?? 0}
                  onChange={(e) =>
                    debouncedSave({ ownerCapital: Number(e.target.value || 0) })
                  }
                />
                <p className="text-xs text-muted-foreground">Owner deposits / investment</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payables">Payables</Label>
                <Input
                  id="payables"
                  type="number"
                  value={s.payables ?? 0}
                  onChange={(e) =>
                    debouncedSave({ payables: Number(e.target.value || 0) })
                  }
                />
                <p className="text-xs text-muted-foreground">Unpaid bills at start</p>
              </div>
            </div>
          </div>

          {/* Preferences / Toggles */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Preferences</h2>
            <div className="space-y-4">
              <div className="rounded-lg border border-secondary bg-card px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Theme</p>
                  <p className="text-xs text-muted-foreground">
                    Switch between light and dark mode.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    saveNow({ theme: s.theme === 'dark' ? 'light' : 'dark' })
                  }
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    s.theme === 'dark'
                      ? 'bg-primary border-primary'
                      : 'bg-muted border-secondary',
                  )}
                  aria-pressed={s.theme === 'dark'}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                      s.theme === 'dark' ? 'translate-x-7' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
              <div className="rounded-lg border border-secondary bg-card px-4 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Tax Estimation</p>
                  <p className="text-xs text-muted-foreground">
                    Enable simple tax estimation based on profit
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={s.taxEnabled}
                  onClick={() => saveNow({ taxEnabled: !s.taxEnabled })}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    s.taxEnabled
                      ? 'bg-primary border-primary'
                      : 'bg-muted border-secondary',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                      s.taxEnabled ? 'translate-x-7' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
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