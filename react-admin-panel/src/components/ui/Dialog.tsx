import * as React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { cn } from '@/utils/cn';

export interface DialogProps extends RadixDialog.DialogProps {}

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogPortal = RadixDialog.Portal;
export const DialogOverlay = React.forwardRef<HTMLDivElement, RadixDialog.DialogOverlayProps>(
  ({ className, ...props }, ref) => (
    <RadixDialog.Overlay
      ref={ref}
      className={cn('fixed inset-0 z-50 bg-black/50 backdrop-blur-sm', className)}
      {...props}
    />
  )
);
DialogOverlay.displayName = 'DialogOverlay';

export const DialogContent = React.forwardRef<HTMLDivElement, RadixDialog.DialogContentProps>(
  ({ className, ...props }, ref) => (
    <RadixDialog.Content
      ref={ref}
      className={cn('fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200', className)}
      {...props}
    />
  )
);
DialogContent.displayName = 'DialogContent';

export const DialogTitle = RadixDialog.Title;
export const DialogDescription = RadixDialog.Description; 