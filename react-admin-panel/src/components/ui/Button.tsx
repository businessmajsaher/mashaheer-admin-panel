import * as React from 'react';
import { cn } from '@/utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', loading, children, ...props }, ref) => {
    return (
      <button
        className={cn(
          // Modern, bold, black and white button style
          'inline-flex items-center justify-center rounded-lg text-base font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
          variant === 'default' && 'bg-black text-white dark:bg-white dark:text-black hover:bg-gray-900 dark:hover:bg-gray-100 shadow-lg py-3 px-6',
          variant === 'outline' && 'border-2 border-black dark:border-white bg-white dark:bg-black text-black dark:text-white hover:bg-gray-100 dark:hover:bg-gray-900 shadow-md py-3 px-6',
          variant === 'ghost' && 'hover:bg-gray-100 dark:hover:bg-gray-900 text-black dark:text-white py-3 px-6',
          variant === 'link' && 'underline-offset-4 hover:underline text-black dark:text-white',
          className
        )}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {loading ? (
          <span className="mr-2 inline-block h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-white dark:border-black dark:border-t-transparent align-middle" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button'; 