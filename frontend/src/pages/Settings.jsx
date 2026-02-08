import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { cn } from '@/lib/utils';

const Settings = () => {
  const { settings, updateSettings } = useFinance();
  const { toast } = useToast();

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
                  value={settings.businessName}
                  onChange={(e) => updateSettings({ businessName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  value={settings.taxRate}
                  onChange={(e) =>
                    updateSettings({ taxRate: Number(e.target.value || 0) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  value={settings.currency}
                  onChange={(e) => updateSettings({ currency: e.target.value })}
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
                        updateSettings({ logo: reader.result });
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
                  {settings.logo && (
                    <div className="flex items-center gap-2">
                      <img
                        src={settings.logo}
                        alt="Logo preview"
                        className="h-10 w-10 rounded border border-secondary object-contain bg-white"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateSettings({ logo: null })}
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
                  value={settings.openingCash ?? 0}
                  onChange={(e) =>
                    updateSettings({ openingCash: Number(e.target.value || 0) })
                  }
                />
                <p className="text-xs text-muted-foreground">Cash at business start</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="owner-capital">Owner Capital</Label>
                <Input
                  id="owner-capital"
                  type="number"
                  value={settings.ownerCapital ?? 0}
                  onChange={(e) =>
                    updateSettings({ ownerCapital: Number(e.target.value || 0) })
                  }
                />
                <p className="text-xs text-muted-foreground">Owner deposits / investment</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payables">Payables</Label>
                <Input
                  id="payables"
                  type="number"
                  value={settings.payables ?? 0}
                  onChange={(e) =>
                    updateSettings({ payables: Number(e.target.value || 0) })
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
                    updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
                  }
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    settings.theme === 'dark'
                      ? 'bg-primary border-primary'
                      : 'bg-muted border-secondary',
                  )}
                  aria-pressed={settings.theme === 'dark'}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                      settings.theme === 'dark' ? 'translate-x-7' : 'translate-x-1',
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
                  aria-checked={settings.taxEnabled}
                  onClick={() => updateSettings({ taxEnabled: !settings.taxEnabled })}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border transition-colors',
                    settings.taxEnabled
                      ? 'bg-primary border-primary'
                      : 'bg-muted border-secondary',
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
                      settings.taxEnabled ? 'translate-x-7' : 'translate-x-1',
                    )}
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              onClick={() =>
                toast({
                  title: 'Changes saved',
                  description: 'Your settings have been updated successfully.',
                })
              }
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