import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, icon, ...props }, ref) => (
    <div className="relative flex items-center">
      {icon && (
        <span className="absolute left-2.5 flex text-text-soft pointer-events-none">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full rounded-2 border border-border bg-surface font-sans text-[13px] text-text',
          'px-2.5 py-2 outline-none',
          'focus:border-primary focus:ring-1 focus:ring-primary',
          'placeholder:text-text-soft',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          icon && 'pl-8',
          className,
        )}
        {...props}
      />
    </div>
  ),
)
Input.displayName = 'Input'
