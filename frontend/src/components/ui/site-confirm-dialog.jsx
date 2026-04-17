import React from 'react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

/**
 * Same styling as {@link ConfirmDialog} (shadcn Dialog + theme buttons).
 * Kept for call sites that use `message` / `confirmLabel` naming.
 */
export function SiteConfirmDialog({
  open,
  onOpenChange,
  title,
  headline,
  message,
  description,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmVariant = 'destructive',
  onConfirm,
}) {
  const resolvedTitle =
    title ?? (typeof headline === 'string' && headline.trim() ? headline.trim() : 'Delete?');
  const resolvedDescription = message ?? description ?? '';

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={resolvedTitle}
      description={resolvedDescription}
      confirmText={confirmLabel}
      cancelText={cancelLabel}
      confirmVariant={confirmVariant}
      onConfirm={onConfirm}
    />
  );
}
