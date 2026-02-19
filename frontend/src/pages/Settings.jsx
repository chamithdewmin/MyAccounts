import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Save, Palette, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { api } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const DEBOUNCE_MS = 600;

const Settings = () => {
  const { settings, updateSettings, loadData } = useFinance();
  const { toast } = useToast();
  const [local, setLocal] = useState(() => ({ ...settings }));
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetOtpOpen, setResetOtpOpen] = useState(false);
  const [resetOtp, setResetOtp] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (!settings) return;
    setLocal((prev) => ({ ...prev, ...settings }));
  }, [settings]);

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

  const mainFields = [
    'theme',
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

      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto min-w-0 px-0 sm:px-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Organize and manage your business settings.</p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 1. App Preferences */}
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

          {/* Reset Data */}
          <div className="bg-card rounded-lg p-6 border border-destructive/30 border-secondary">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              <h2 className="text-lg font-semibold text-destructive">Danger Zone</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete all your data (orders, incomes, expenses, clients, invoices, etc.). Your login account will remain. This cannot be undone.
            </p>
            <Button variant="destructive" onClick={() => setResetConfirmOpen(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              Reset Data
            </Button>
          </div>
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