import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { resetDemoData } from '@/utils/storage';
import { useFinance } from '@/contexts/FinanceContext';
import { useToast } from '@/components/ui/use-toast';

const Settings = () => {
  const { toast } = useToast();
  const { settings, updateSettings } = useFinance();

  const handleResetData = () => {
    resetDemoData();
    toast({
      title: 'Data reset successful',
      description: 'All financial data has been cleared.',
    });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <>
      <Helmet>
        <title>Settings - MyAccounts</title>
        <meta name="description" content="Configure business settings, tax, and currency" />
      </Helmet>

      <div className="space-y-6 max-w-2xl">
        <div>
            <h1 className="text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground">Configure your business profile and tax.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-6 border border-secondary space-y-6"
        >
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
                <Label>Theme</Label>
                <p className="text-xs text-muted-foreground">
                  Choose between a clean light theme or the original dark theme.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => updateSettings({ theme: 'light' })}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      settings.theme === 'dark'
                        ? 'bg-card text-muted-foreground border-secondary'
                        : 'bg-primary text-primary-foreground border-primary'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSettings({ theme: 'dark' })}
                    className={`px-3 py-2 rounded-lg text-sm border ${
                      settings.theme === 'dark'
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-secondary'
                    }`}
                  >
                    Dark
                  </button>
                </div>
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
              <div className="space-y-2">
                <Label>Tax Estimation</Label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={settings.taxEnabled}
                    onChange={(e) => updateSettings({ taxEnabled: e.target.checked })}
                    className="rounded border-secondary bg-secondary text-primary focus:ring-primary"
                  />
                  <span>Enable simple tax estimation based on profit</span>
                </label>
              </div>
              <div className="space-y-2">
                <Label>Expense Categories</Label>
                <p className="text-xs text-muted-foreground mb-1">
                  Predefined categories used when logging expenses.
                </p>
                <textarea
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
                  value={settings.expenseCategories.join('\n')}
                  onChange={(e) =>
                    updateSettings({
                      expenseCategories: e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-secondary">
            <h2 className="text-xl font-bold mb-4">Data</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Reset all financial data. This will clear incomes, expenses, clients, and invoices from this browser.
            </p>
            <Button onClick={handleResetData} variant="destructive">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset All Data
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Settings;