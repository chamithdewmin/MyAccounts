import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { resetDemoData } from '@/utils/storage';
import { useToast } from '@/components/ui/use-toast';

const Settings = () => {
  const { toast } = useToast();

  const handleResetData = () => {
    resetDemoData();
    toast({
      title: "Data reset successful",
      description: "All demo data has been restored to defaults",
    });
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  return (
    <>
      <Helmet>
        <title>Settings - AutoPOS</title>
        <meta name="description" content="Configure your AutoPOS settings" />
      </Helmet>

      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your POS system</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-lg p-6 border border-secondary space-y-6"
        >
          <div>
            <h2 className="text-xl font-bold mb-4">Company Information</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company-name">Company Name</Label>
                <Input id="company-name" defaultValue="AutoPOS" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input id="tax-rate" type="number" defaultValue="10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full px-3 py-2 bg-secondary border border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-secondary">
            <h2 className="text-xl font-bold mb-4">Demo Data</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Reset all data to default demo values. This will clear all orders, reset inventory, and restore sample customers.
            </p>
            <Button onClick={handleResetData} variant="destructive">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Demo Data
            </Button>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default Settings;