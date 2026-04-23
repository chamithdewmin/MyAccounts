import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Eye, EyeOff, Landmark, Save, User, Upload, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ADMIN_EMAIL = 'logozodev@gmail.com';
const isAdminUser = (u) =>
  String(u?.role || '').toLowerCase() === 'admin' ||
  String(u?.email || '').toLowerCase().trim() === ADMIN_EMAIL;

export function formatPhoneDisplay(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length >= 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return String(phone).trim();
}

export function DetailsBusinessPanel({
  local,
  setLocal,
  settings,
  bankForm,
  setBankForm,
  savingBusiness,
  onSaveBusinessAndBank,
  hasBusinessChanges,
}) {
  const s = local;

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold">Business profile</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Used on invoices and reports.</p>
        <div className="mb-6 p-4 rounded-lg border border-border bg-muted/30">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Invoice from (preview)</p>
          <p className="font-bold text-lg text-foreground mb-2">{s.businessName || 'Company name'}</p>
          <div className="text-sm text-muted-foreground space-y-1">
            {s.phone && <p>Phone — {formatPhoneDisplay(s.phone)}</p>}
            {s.companyEmail != null && s.companyEmail !== '' && <p>Email — {s.companyEmail}</p>}
            {s.website && <p>Website — {s.website}</p>}
            {s.address && <p>Address — {s.address}</p>}
            {!s.phone && !s.companyEmail && !s.website && !s.address && (
              <p className="text-muted-foreground/80">Add phone, email, and website below.</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="st-company-name">Company name</Label>
            <Input
              id="st-company-name"
              value={s.businessName ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, businessName: e.target.value }))}
              placeholder="My Business"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-phone">Phone</Label>
            <Input
              id="st-phone"
              type="tel"
              value={s.phone ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="07x xxx xxxx"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-company-email">Company email</Label>
            <Input
              id="st-company-email"
              type="email"
              value={s.companyEmail ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, companyEmail: e.target.value }))}
              placeholder="hello@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-address">Address (optional)</Label>
            <Input
              id="st-address"
              value={s.address ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="Business address"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="st-website">Website</Label>
            <Input
              id="st-website"
              value={s.website ?? ''}
              onChange={(e) => setLocal((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="www.example.com"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Landmark className="w-5 h-5 text-primary shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold">Bank account</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">For bank transfer on invoices. Stored encrypted.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="st-bank-acct">Account number *</Label>
            <Input
              id="st-bank-acct"
              value={bankForm.accountNumber}
              onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value }))}
              placeholder="1234567890"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-bank-name-field">Account name *</Label>
            <Input
              id="st-bank-name-field"
              value={bankForm.accountName}
              onChange={(e) => setBankForm((p) => ({ ...p, accountName: e.target.value }))}
              placeholder="Your business name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-bank-bank">Bank name *</Label>
            <Input
              id="st-bank-bank"
              value={bankForm.bankName}
              onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
              placeholder="Commercial Bank"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-bank-branch">Branch (optional)</Label>
            <Input
              id="st-bank-branch"
              value={bankForm.branch}
              onChange={(e) => setBankForm((p) => ({ ...p, branch: e.target.value }))}
              placeholder="Main branch"
            />
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg p-4 sm:p-6 border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-5 h-5 text-primary shrink-0" />
          <h2 className="text-base sm:text-lg font-semibold">Opening balances</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Starting figures for the balance sheet.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="st-opening-cash">Opening cash</Label>
            <Input
              id="st-opening-cash"
              type="number"
              value={s.openingCash ?? 0}
              onChange={(e) => setLocal((prev) => ({ ...prev, openingCash: Number(e.target.value || 0) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-owner-capital">Owner capital</Label>
            <Input
              id="st-owner-capital"
              type="number"
              value={s.ownerCapital ?? 0}
              onChange={(e) => setLocal((prev) => ({ ...prev, ownerCapital: Number(e.target.value || 0) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="st-payables">Payables</Label>
            <Input
              id="st-payables"
              type="number"
              value={s.payables ?? 0}
              onChange={(e) => setLocal((prev) => ({ ...prev, payables: Number(e.target.value || 0) }))}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="button" size="sm" disabled={!hasBusinessChanges || savingBusiness} onClick={onSaveBusinessAndBank} className="gap-2">
          <Save className="h-4 w-4" />
          {savingBusiness ? 'Saving…' : 'Save business details'}
        </Button>
      </div>
    </div>
  );
}

export function ProfileAccountPanel({ local, setLocal, user, onAvatarUpload, onRemoveAvatar, onSaveProfile, saving, hasPersonalChanges }) {
  const s = local;
  const fileInputRef = useRef(null);

  return (
    <div className="bg-card rounded-lg p-4 sm:p-6 border border-border space-y-6">
      <div className="flex items-center gap-2">
        <User className="w-5 h-5 text-primary" />
        <h2 className="text-base sm:text-lg font-semibold">Profile</h2>
      </div>
      <div className="space-y-2">
        <Label>Avatar</Label>
        <p className="text-xs text-muted-foreground">Square images work best.</p>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {s.profileAvatar ? <AvatarImage src={s.profileAvatar} alt="Profile" /> : null}
            <AvatarFallback className="text-lg">{s.firstName?.[0] || s.lastName?.[0] || user?.name?.[0] || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onAvatarUpload} className="hidden" />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-fit">
              <Upload className="w-4 h-4 mr-2" />
              Upload photo
            </Button>
            {s.profileAvatar ? (
              <Button type="button" variant="ghost" size="sm" onClick={onRemoveAvatar} className="w-fit text-destructive hover:text-destructive">
                Remove
              </Button>
            ) : null}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="st-first">First name</Label>
          <Input id="st-first" value={s.firstName} onChange={(e) => setLocal((p) => ({ ...p, firstName: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="st-last">Last name</Label>
          <Input id="st-last" value={s.lastName} onChange={(e) => setLocal((p) => ({ ...p, lastName: e.target.value }))} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="st-acct-email">Account email</Label>
        <Input
          id="st-acct-email"
          type="email"
          value={s.accountEmail}
          onChange={(e) => setLocal((p) => ({ ...p, accountEmail: e.target.value }))}
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onSaveProfile} disabled={!hasPersonalChanges || saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </div>
  );
}

export function PasswordPanel({
  local,
  setLocal,
  showCurrentPassword,
  setShowCurrentPassword,
  showPassword,
  setShowPassword,
  onSavePassword,
  saving,
  canSavePassword,
}) {
  const s = local;
  return (
    <div className="bg-card rounded-lg p-4 sm:p-6 border border-border space-y-4 max-w-lg">
      <h2 className="text-base sm:text-lg font-semibold">Password</h2>
      <p className="text-sm text-muted-foreground">Enter your current password, then a new password.</p>
      <div className="space-y-2">
        <Label htmlFor="st-cur-pw">Current password</Label>
        <div className="relative">
          <Input
            id="st-cur-pw"
            type={showCurrentPassword ? 'text' : 'password'}
            value={s.currentPassword}
            onChange={(e) => setLocal((p) => ({ ...p, currentPassword: e.target.value }))}
            autoComplete="current-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
          >
            {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="st-new-pw">New password</Label>
        <div className="relative">
          <Input
            id="st-new-pw"
            type={showPassword ? 'text' : 'password'}
            value={s.newPassword}
            onChange={(e) => setLocal((p) => ({ ...p, newPassword: e.target.value }))}
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onSavePassword} disabled={!canSavePassword || saving}>
          {saving ? 'Saving…' : 'Update password'}
        </Button>
      </div>
    </div>
  );
}

export function TeamPanel({ user }) {
  const admin = isAdminUser(user);
  return (
    <div className="bg-card rounded-lg p-4 sm:p-6 border border-border space-y-3 max-w-2xl">
      <h2 className="text-base sm:text-lg font-semibold">Team</h2>
      <p className="text-sm text-muted-foreground">
        Invite and manage staff accounts from the Users area (administrators only).
      </p>
      {admin ? (
        <Button variant="outline" asChild>
          <Link to="/users">Open users</Link>
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">Ask an administrator to manage team members.</p>
      )}
    </div>
  );
}

export function ApiPanel({ apiBase }) {
  return (
    <div className="bg-card rounded-lg p-4 sm:p-6 border border-border space-y-2 max-w-2xl">
      <h2 className="text-base sm:text-lg font-semibold">API</h2>
      <p className="text-sm text-muted-foreground">Frontend talks to this API base path (from configuration).</p>
      <code className="block text-xs font-mono bg-muted/50 border border-border rounded-md px-3 py-2 break-all">{apiBase || '/api'}</code>
    </div>
  );
}
