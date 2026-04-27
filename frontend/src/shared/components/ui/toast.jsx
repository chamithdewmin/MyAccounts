import { cn } from '@/lib/utils';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva } from 'class-variance-authority';
import { X } from 'lucide-react';
import React from 'react';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Viewport
		ref={ref}
		className={cn(
			'fixed z-[100] flex w-full max-w-lg flex-col gap-2',
			/* Mobile: full-width strip, centered */
			'bottom-0 left-0 right-0 mx-auto max-h-[min(50dvh,50svh)] overflow-y-auto overscroll-y-contain px-3 pt-2',
			'pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]',
			/* Desktop: bottom-right stack */
			'sm:bottom-4 sm:left-auto sm:right-4 sm:mx-0 sm:max-h-[min(60dvh,calc(100svh-2rem))] sm:max-w-md sm:w-[min(28rem,calc(100vw-2rem))] sm:px-0 sm:pb-0',
			className,
		)}
		{...props}
	/>
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
	[
		'data-[swipe=move]:transition-none group relative flex w-full min-w-0 items-start gap-3 rounded-lg border p-3 shadow-md transition-all sm:gap-4 sm:p-4',
		'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
		'data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80',
		'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-right-full',
	].join(' '),
	{
		variants: {
			variant: {
				default:
					'default border-border bg-muted/95 text-foreground dark:border-zinc-800 dark:bg-zinc-900/95',
				primary:
					'primary border-primary/35 bg-primary/10 text-foreground dark:border-primary/40 dark:bg-primary/15',
				success:
					'success border-emerald-500/35 bg-emerald-500/[0.08] text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
				destructive:
					'destructive border-destructive/40 bg-destructive/[0.08] text-red-900 dark:border-red-500/35 dark:bg-red-950/35 dark:text-red-200',
				info: 'info border-violet-500/35 bg-violet-500/[0.08] text-violet-900 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-200',
				warning:
					'warning border-amber-500/40 bg-amber-500/[0.09] text-amber-950 dark:border-amber-500/35 dark:bg-amber-500/10 dark:text-amber-100',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
	return (
		<ToastPrimitives.Root
			ref={ref}
			className={cn(toastVariants({ variant }), className)}
			{...props}
		/>
	);
});
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Action
		ref={ref}
		className={cn(
			'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
			'group-[.destructive]:border-destructive/30 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive',
			className,
		)}
		{...props}
	/>
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Close
		ref={ref}
		className={cn(
			'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-foreground/50 opacity-80 transition-opacity hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background',
			'group-[.destructive]:text-red-700 group-[.destructive]:hover:text-red-900 dark:group-[.destructive]:text-red-200 dark:group-[.destructive]:hover:text-white',
			className,
		)}
		toast-close=""
		aria-label="Dismiss notification"
		{...props}
	>
		<X className="h-4 w-4" strokeWidth={2} />
	</ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Title
		ref={ref}
		className={cn('text-sm font-semibold leading-snug break-words', className)}
		{...props}
	/>
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
	<ToastPrimitives.Description
		ref={ref}
		className={cn('text-xs leading-snug opacity-90 break-words sm:text-sm', className)}
		{...props}
	/>
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

export {
	Toast,
	ToastAction,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
};
