import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { JSX, ReactNode } from 'react';

interface TooltipComponent {
  children: ReactNode;
  value: string;
}

export function TooltipComponent({
  children,
  value,
}: TooltipComponent): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>
        <p className={value.length > 20 ? 'w-40' : 'w-fit'}>{value}</p>
      </TooltipContent>
    </Tooltip>
  );
}
