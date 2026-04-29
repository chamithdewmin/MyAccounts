import React from 'react';
import { cn } from '@/lib/utils';
import { DatePicker } from '@heroui/react';
import { parseDate } from '@internationalized/date';

const toDateValue = (value) => {
  if (!value) return null;
  try {
    return parseDate(String(value).slice(0, 10));
  } catch {
    return null;
  }
};

const toDateString = (dateValue) => {
  if (!dateValue) return '';
  const raw = typeof dateValue?.toString === 'function' ? dateValue.toString() : '';
  if (raw) return raw.slice(0, 10);
  const year = String(dateValue.year ?? '').padStart(4, '0');
  const month = String(dateValue.month ?? '').padStart(2, '0');
  const day = String(dateValue.day ?? '').padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  if (type === 'date') {
    const {
      value,
      onChange,
      name,
      required,
      disabled,
      'aria-label': ariaLabel,
    } = props;

    const dateValue = toDateValue(value);
    const emitChange = (nextValue) => {
      if (!onChange) return;
      onChange({
        type: 'change',
        target: { value: nextValue, name },
        currentTarget: { value: nextValue, name },
      });
    };
    const handleDateValue = (next) => emitChange(toDateString(next));

    return (
      <DatePicker
        className={cn('w-full', className)}
        name={name}
        granularity="day"
        value={dateValue ?? undefined}
        isClearable
        isRequired={required}
        isDisabled={disabled}
        aria-label={ariaLabel || name || 'Date'}
        classNames={{
          base: 'w-full',
          inputWrapper:
            'h-10 rounded-lg border border-border bg-input text-foreground shadow-none data-[focus=true]:ring-2 data-[focus=true]:ring-primary',
          input: 'text-sm',
          selectorButton: 'text-muted-foreground hover:text-foreground',
          popoverContent: 'rounded-xl border border-border bg-card text-foreground shadow-2xl',
        }}
        calendarProps={{
          classNames: {
            base: 'bg-card text-foreground',
            headerWrapper: 'pb-2',
            title: 'text-sm font-semibold text-foreground',
            gridHeaderCell: 'text-xs text-muted-foreground',
            cellButton:
              'text-sm data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground data-[today=true]:text-primary',
          },
        }}
        onChange={handleDateValue}
        onValueChange={handleDateValue}
        onClear={() => emitChange('')}
      />
    );
  }

  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Input.displayName = "Input";

export { Input };