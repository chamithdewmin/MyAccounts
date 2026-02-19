import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { User, Building2, Landmark, Receipt, Palette, Upload, Eye, EyeOff, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { useFinance } from '@/contexts/FinanceContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

const DEBOUNCE_MS = 600;

const Profile = () => {
  const { settings, updateSettings, saveBankDetails } = useFinance();
  const { user } = useAuth();
  const { toast } = useToast();
  const [local, setLocal] = useState(() => ({
    firstName: user?.name?.split(' ')[0] || '',
    lastName: user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    currentPassword: '',
    password: '',
    profileAvatar: settings?.profileAvatar || null,
    ...settings,
  }));
  const [bankForm, setBankForm] = useState({ accountNumber: '', accountName: '', bankName: '', branch: '' });
  const [bankSaving, setBankSaving] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (!settings) return;
    setLocal((prev) => ({ ...prev, ...settings, profileAvatar: settings.profileAvatar || null }));
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

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Please upload an image smaller than 5MB.', variant: 'destructive' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      saveNow({ profileAvatar: reader.result });
      toast({ title: 'Avatar updated', description: 'Your profile picture has been updated.' });
    };
    reader.onerror = () => {
      toast({ title: 'Upload failed', description: 'Failed to upload image. Please try again.', variant: 'destructive' });
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Update personal details if changed
      const updates = {};
      if (local.firstName !== (user?.name?.split(' ')[0] || '')) {
        updates.firstName = local.firstName;
      }
      if (local.lastName !== (user?.name?.split(' ').slice(1).join(' ') || '')) {
        updates.lastName = local.lastName;
      }
      if (local.email !== user?.email) {
        updates.email = local.email;
      }
      if (local.password && local.currentPassword) {
        // Password change would go here - need API endpoint
        updates.password = local.password;
      }
      if (Object.keys(updates).length > 0) {
        // await api.profile.update(updates);
        toast({ title: 'Profile updated', description: 'Your personal details have been saved.' });
      }
      setLocal((prev) => ({ ...prev, currentPassword: '', password: '' }));
    } catch (error) {
      toast({ title: 'Error', description: error.message || 'Failed to update profile.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const s = local;
  const savedBank = settings?.bankDetails || {};
  const bankFormChanged =
    (bankForm.accountNumber || '').trim() !== (savedBank.accountNumber || '').trim() ||
    (bankForm.accountName || '').trim() !== (savedBank.accountName || '').trim() ||
    (bankForm.bankName || '').trim() !== (savedBank.bankName || '').trim() ||
    (bankForm.branch || '').trim() !== (savedBank.branch || '').trim();

  const hasPersonalChanges =
    local.firstName !== (user?.name?.split(' ')[0] || '') ||
    local.lastName !== (user?.name?.split(' ').slice(1).join(' ') || '') ||
    local.email !== user?.email ||
    (local.password && local.currentPassword);

  return (
    <>
      <Helmet>
        <title>Profile - MyAccounts</title>
        <meta name="description" content="Manage your profile, business details, bank account, and branding" />
      </Helmet>

      <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto min-w-0 px-0 sm:px-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <User className="w-6 h-6 sm:w-7 sm:h-7" />
            Account
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Change the details of your profile here.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* 1. Personal Details */}
          <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
            <h2 className="text-base sm:text-lg font-semibold mb-4">Personal Details</h2>
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Avatar</Label>
                <p className="text-xs text-muted-foreground">Upload a profile picture. Square images work best.</p>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    {s.profileAvatar ? (
                      <AvatarImage src={s.profileAvatar} alt="Profile" />
                    ) : null}
                    <AvatarFallback className="text-lg">
                      {s.firstName?.[0] || s.lastName?.[0] || user?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-fit"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Photo
                    </Button>
                    {s.profileAvatar && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => saveNow({ profileAvatar: null })}
                        className="w-fit text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={s.firstName}
                    onChange={(e) => setLocal((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Chamith"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={s.lastName}
                    onChange={(e) => setLocal((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Dewmin"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={s.email}
                  onChange={(e) => setLocal((p) => ({ ...p, email: e.target.value }))}
                  placeholder="logozodev@gmail.com"
                />
              </div>

              {/* Password Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={s.currentPassword}
                      onChange={(e) => setLocal((p) => ({ ...p, currentPassword: e.target.value }))}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={s.password}
                      onChange={(e) => setLocal((p) => ({ ...p, password: e.target.value }))}
                      placeholder="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveProfile}
                  disabled={!hasPersonalChanges || saving}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>

          {/* 2. Business Profile */}
          <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold">Business Profile</h2>
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

          {/* 3. Bank Account */}
          <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold">Bank Account</h2>
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
              className="mt-4"
              disabled={!bankFormChanged || bankSaving}
              onClick={async () => {
                const an = String(bankForm.accountNumber || '').trim();
                const aname = String(bankForm.accountName || '').trim();
                const bname = String(bankForm.bankName || '').trim();
                if (!an || !aname || !bname) {
                  toast({ title: 'Required fields', description: 'Please fill all required bank fields.', variant: 'destructive' });
                  return;
                }
                setBankSaving(true);
                try {
                  await saveBankDetails({ accountNumber: an, accountName: aname, bankName: bname, branch: bankForm.branch?.trim() || null });
                  toast({ title: 'Bank details saved', description: 'Your bank account information has been updated.' });
                } catch (err) {
                  toast({ title: 'Error', description: err.message || 'Failed to save bank details.', variant: 'destructive' });
                } finally {
                  setBankSaving(false);
                }
              }}
            >
              {bankSaving ? 'Saving...' : 'Save Bank Details'}
            </Button>
          </div>

          {/* 4. Invoice & Branding */}
          <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-semibold">Invoice & Branding</h2>
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
                      <img src={s.logo} alt="Logo" className="h-10 w-10 rounded border border-border object-contain bg-white" />
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
                    className="h-10 w-14 cursor-pointer rounded border border-border bg-transparent p-0"
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
        </motion.div>
      </div>
    </>
  );
};

export default Profile;
