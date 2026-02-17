import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-[var(--background)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-dark)] shadow-sm',
        destructive:
          'bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:bg-[var(--destructive)]/90 shadow-sm',
        outline:
          'border border-[var(--border)] bg-transparent text-[var(--foreground)] hover:bg-[var(--muted)]',
        secondary:
          'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80',
        ghost:
          'text-[var(--foreground)] hover:bg-[var(--muted)]',
        link: 'text-[var(--primary)] underline-offset-4 hover:underline',
        success:
          'bg-[var(--success)] text-[var(--success-foreground)] hover:bg-[var(--success)]/90 shadow-sm',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-lg px-3',
        lg: 'h-12 rounded-xl px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
