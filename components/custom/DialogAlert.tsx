import { JSX } from 'react';
import { Button } from '../ui/button';
import { CustomButton } from './CustomButton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface DialogAlert {
  open: boolean;
  cancel: () => void;
  callback: () => void;
  title: string;
  description: string;
  type?: 'success' | 'error';
  isLoading?: boolean;
}

export function DialogAlert({
  open,
  cancel,
  callback,
  title,
  description,
  type = 'error',
  isLoading,
}: DialogAlert): JSX.Element {
  const buttonTitle: { [key: string]: string } = {
    success: 'Save',
    error: 'Remove',
  };

  const buttonVariant: { [key: string]: 'default' | 'destructive' } = {
    success: 'default',
    error: 'destructive',
  };

  return (
    <Dialog open={open} onOpenChange={cancel}>
      <DialogContent className="custom-scrollbar overflow-auto sm:max-h-[40rem] sm:max-w-[30rem]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <p className="text-gray-500">{description}</p>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={cancel}>
            Cancel
          </Button>
          <CustomButton
            type="button"
            variant={buttonVariant[type]}
            onClick={callback}
            isLoading={isLoading}
          >
            {buttonTitle[type]}
          </CustomButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
