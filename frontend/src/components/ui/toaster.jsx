import {
	Toast,
	ToastClose,
	ToastDescription,
	ToastProvider,
	ToastTitle,
	ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
	AlertCircle,
	AlertOctagon,
	AlertTriangle,
	Bell,
	CheckCircle2,
	Hexagon,
} from 'lucide-react';
import React from 'react';

const iconWrap = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10';

function ToastLeading({ variant }) {
	switch (variant) {
		case 'primary':
			return (
				<div className={cn(iconWrap, 'bg-primary text-primary-foreground shadow-sm')}>
					<Bell className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
				</div>
			);
		case 'success':
			return (
				<div className={cn(iconWrap, 'bg-emerald-500 text-white shadow-sm')}>
					<CheckCircle2 className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
				</div>
			);
		case 'destructive':
			return (
				<div className={cn(iconWrap, 'bg-destructive text-destructive-foreground shadow-sm')}>
					<AlertCircle className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
				</div>
			);
		case 'info':
			return (
				<div className={cn(iconWrap, 'bg-violet-600 text-white shadow-sm dark:bg-violet-500')}>
					<Hexagon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
				</div>
			);
		case 'warning':
			return (
				<div className={cn(iconWrap, 'bg-amber-500 text-white shadow-sm')}>
					<AlertOctagon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
				</div>
			);
		default:
			return (
				<div
					className={cn(
						iconWrap,
						'bg-foreground/10 text-foreground dark:bg-white/15 dark:text-white',
					)}
				>
					<AlertTriangle className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2} />
				</div>
			);
	}
}

export function Toaster() {
	const { toasts } = useToast();

	return (
		<ToastProvider swipeDirection="right" duration={5000}>
			{toasts.map(({ id, title, description, action, variant = 'default', ...props }) => {
				return (
					<Toast key={id} variant={variant} {...props}>
						<ToastLeading variant={variant} />
						<div className="min-w-0 flex-1 space-y-0.5 pt-0.5">
							{title ? <ToastTitle>{title}</ToastTitle> : null}
							{description ? (
								<ToastDescription>{description}</ToastDescription>
							) : null}
						</div>
						{action}
						<ToastClose />
					</Toast>
				);
			})}
			<ToastViewport />
		</ToastProvider>
	);
}
