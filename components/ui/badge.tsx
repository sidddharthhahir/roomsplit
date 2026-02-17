import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]',
        secondary:
          'border-transparent bg-[var(--muted)] text-[var(--muted-foreground)]',
        destructive:
          'border-transparent bg-[var(--destructive)] text-[var(--destructive-foreground)]',
        success:
          'border-transparent bg-[var(--success)] text-[var(--success-foreground)]',
        warning:
          'border-transparent bg-[var(--warning)] text-[var(--warning-foreground)]',
        outline: 
          'text-[var(--foreground)] border-[var(--border)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
