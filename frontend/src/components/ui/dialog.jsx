import React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Default `modal={false}` so portaled pickers (HeroUI `Input type="date"`) stay clickable in every dialog. Override with `modal` when needed. */
const Dialog = ({ modal = false, ...props }) => (
  <DialogPrimitive.Root modal={modal} {...props} />
);
const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = ({ ...props }) => (
  <DialogPrimitive.Portal {...props} />
);
DialogPortal.displayName = DialogPrimitive.Portal.displayName;

const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-dialog-overlay-in data-[state=closed]:animate-dialog-overlay-out",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const isHeroDatePickerInPath = (target) => {
  if (!(target instanceof Element)) return false;
  return !!target.closest('.app-heroui-date-popover, .app-date-calendar');
};

/** Radix "outside" events may target a wrapper; HeroUI calendar is portaled — use composedPath. */
const eventTouchesHeroDatePicker = (e) => {
  const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
  for (const node of path) {
    if (node instanceof Element && isHeroDatePickerInPath(node)) return true;
  }
  return e.target instanceof Element && isHeroDatePickerInPath(e.target);
};

const focusOutsideTouchesHeroDatePicker = (e) => {
  const orig = e.detail?.originalEvent;
  const related =
    orig && typeof orig === 'object' && 'relatedTarget' in orig ? orig.relatedTarget : null;
  if (related instanceof Element && isHeroDatePickerInPath(related)) return true;
  return e.target instanceof Element && isHeroDatePickerInPath(e.target);
};

const DialogContent = React.forwardRef(
  ({ className, children, onPointerDownOutside, onInteractOutside, onFocusOutside, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 grid w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-card p-4 shadow-lg rounded-lg sm:p-6",
        "pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]",
        "max-h-[min(90dvh,calc(100svh-2rem))] overflow-y-auto overscroll-y-contain",
        "data-[state=open]:animate-dialog-content-in data-[state=closed]:animate-dialog-content-out",
        className
      )}
      onPointerDownOutside={(e) => {
        if (eventTouchesHeroDatePicker(e)) e.preventDefault();
        onPointerDownOutside?.(e);
      }}
      onInteractOutside={(e) => {
        if (eventTouchesHeroDatePicker(e)) e.preventDefault();
        onInteractOutside?.(e);
      }}
      onFocusOutside={(e) => {
        if (focusOutsideTouchesHeroDatePicker(e)) e.preventDefault();
        onFocusOutside?.(e);
      }}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground sm:right-3 sm:top-3">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  ));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("pr-10 text-lg font-semibold leading-none tracking-tight sm:pr-12", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

const DialogFooter = ({ className, ...props }) => (
  <div
    className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
};