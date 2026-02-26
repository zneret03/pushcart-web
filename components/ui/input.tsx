import * as React from 'react';
import { Label } from './label';
import { cn } from '@/lib/utils';

interface InputType extends React.ComponentProps<'input'> {
  hasError?: boolean;
  errorMessage?: string;
  title?: string;
  isOptional?: boolean;
}

function Input({
  className,
  type,
  title,
  hasError,
  errorMessage,
  isOptional = false,
  ...props
}: InputType) {
  return (
    <div className="grid w-full">
      <Label className="mb-1.5 text-sm font-medium">
        {title}
        {!isOptional ? (title ? '*' : '') : ' (optional)'}
      </Label>
      <input
        type={type}
        data-slot="input"
        className={cn(
          'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
          'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
          className,
        )}
        {...props}
      />
      {hasError && (
        <span className="mt-1.5 text-sm text-red-500" aria-label="input-error">
          {errorMessage}
        </span>
      )}
    </div>
  );
}

export { Input };
