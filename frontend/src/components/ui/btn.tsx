import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const btnVariants = cva(
  // Base
  'inline-flex items-center gap-1.5 font-medium font-sans rounded-2 cursor-pointer whitespace-nowrap leading-[1.2] transition-colors disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary:   'bg-primary text-primary-fg border border-primary-dark shadow-1 hover:bg-primary-dark',
        secondary: 'bg-surface text-text border border-border shadow-1 hover:bg-surface2',
        ghost:     'bg-transparent text-text border border-transparent hover:bg-surface2',
        danger:    'bg-surface text-danger border border-danger-light hover:bg-danger-light',
      },
      size: {
        sm: 'px-2.5 py-1.5 text-[12.5px]',
        md: 'px-3.5 py-2 text-[13px]',
        lg: 'px-[18px] py-2.5 text-[14px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

export interface BtnProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof btnVariants> {
  icon?: React.ReactNode
}

export const Btn = React.forwardRef<HTMLButtonElement, BtnProps>(
  ({ className, variant, size, icon, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(btnVariants({ variant, size }), className)}
      {...props}
    >
      {icon && <span className="flex shrink-0">{icon}</span>}
      {children}
    </button>
  ),
)
Btn.displayName = 'Btn'
