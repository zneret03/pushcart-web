import * as React from 'react';
import { Label } from '@/components/ui/label';

import { cn } from '@/lib/utils';

interface TextareaTypes extends React.ComponentProps<'textarea'> {
  title?: string;
  hasError?: boolean;
  errorMessage?: string;
}

function Textarea({
  title,
  className,
  hasError,
  errorMessage,
  ...props
}: TextareaTypes) {
  return (
    <div className="space-y-1">
      <Label className="mb-1.5 text-sm font-medium">{title}</Label>
      <textarea
        data-slot="textarea"
        className={cn(
          'border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
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

export { Textarea };
