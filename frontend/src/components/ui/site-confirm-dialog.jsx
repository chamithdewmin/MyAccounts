import React, { useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/**
 * App-styled confirm dialog (title, muted description, close X, Cancel + destructive primary).
 */
export function SiteConfirmDialog({
  open,
  onOpenChange,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
}) {
  const [submitting, setSubmitting] = useState(false);

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
            'fixed inset-0 z-[100] bg-black/60 data-[state=open]:animate-dialog-overlay-in data-[state=closed]:animate-dialog-overlay-out',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-[100] w-[min(92vw,400px)] translate-x-[-50%] translate-y-[-50%]',
            'overflow-hidden rounded-2xl border border-border bg-card shadow-2xl',
            'data-[state=open]:animate-dialog-content-in data-[state=closed]:animate-dialog-content-out',
            'focus:outline-none p-0 gap-0',
          )}
        >
          <div className="relative border-b border-border px-5 pt-5 pb-4 pr-12">
            <DialogPrimitive.Title className="text-base font-semibold text-foreground tracking-tight pr-1">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              type="button"
              disabled={submitting}
              className={cn(
                'absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground opacity-80 transition-opacity',
                'hover:bg-secondary hover:text-foreground hover:opacity-100',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
                'disabled:pointer-events-none disabled:opacity-40',
              )}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
            <DialogPrimitive.Description
              className={cn(
                'mt-2 text-sm leading-relaxed',
                message ? 'text-muted-foreground' : 'sr-only',
              )}
            >
              {message || 'Confirm this action.'}
            </DialogPrimitive.Description>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 px-5 py-4 bg-muted/20">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange?.(false)}>
              {cancelLabel}
            </Button>
            <Button type="button" variant="destructive" disabled={submitting} onClick={handleConfirm}>
              {submitting ? '…' : confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
