import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';

const hostnameSays = () => {
  if (typeof window === 'undefined') return 'This app says';
  const h = window.location.hostname || 'App';
  return `${h} says`;
};

/**
 * Browser-style confirm (dark panel, pill OK / Cancel) — replaces window.confirm.
 */
export function SiteConfirmDialog({
  open,
  onOpenChange,
  headline = hostnameSays,
  message,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  onConfirm,
}) {
  const [submitting, setSubmitting] = useState(false);
  const titleLine = typeof headline === 'function' ? headline() : headline;

  const handleOpenChange = (v) => {
    if (v === false && submitting) return;
    onOpenChange?.(v);
  };

  const handleConfirm = async () => {
    if (!onConfirm) return;
    try {
      setSubmitting(true);
      await onConfirm();
      onOpenChange?.(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[100] bg-black/55 data-[state=open]:animate-dialog-overlay-in data-[state=closed]:animate-dialog-overlay-out',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-[100] w-[min(92vw,420px)] translate-x-[-50%] translate-y-[-50%]',
            'rounded-[18px] border border-[#3d3229] bg-[#1a1511] p-6 shadow-2xl',
            'data-[state=open]:animate-dialog-content-in data-[state=closed]:animate-dialog-content-out',
            'focus:outline-none',
          )}
        >
          <DialogPrimitive.Title className="text-[15px] font-semibold text-white tracking-tight">
            {titleLine}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[14px] font-normal text-white/95 leading-relaxed">
            {message}
          </DialogPrimitive.Description>
          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={submitting}
              onClick={() => onOpenChange?.(false)}
              className={cn(
                'rounded-full px-7 py-2.5 text-sm font-medium text-white transition-colors',
                'bg-[#6b3018] hover:bg-[#7e3a1f] disabled:opacity-50',
              )}
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className={cn(
                'rounded-full px-7 py-2.5 text-sm font-semibold transition-colors',
                'border border-[#e8a882] bg-[#f4c2a8] text-[#2a1810] hover:bg-[#ffd4b8] disabled:opacity-50',
              )}
            >
              {submitting ? '…' : confirmLabel}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
