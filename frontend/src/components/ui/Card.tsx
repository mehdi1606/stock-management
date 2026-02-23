// src/components/ui/Card.tsx

import { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  // Enhanced props
  title?: string;
  subtitle?: string;
  variant?: 'default' | 'glass' | 'bordered' | 'elevated';
  action?: ReactNode;
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const variantStyles = {
  default: 'bg-white dark:bg-neutral-800 shadow-sm',
  glass: 'bg-white/80 dark:bg-neutral-800/80 backdrop-blur-sm shadow-md',
  bordered: 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700',
  elevated: 'bg-white dark:bg-neutral-800 shadow-lg',
};

export const Card = ({
  children,
  className = '',
  padding,
  title,
  subtitle,
  variant,
  action,
}: CardProps) => {
  // Auto-apply padding when using enhanced mode (title or variant present)
  const resolvedPadding = padding ?? ((title || variant) ? 'md' : 'none');
  const resolvedVariant = variant ?? 'default';
  return (
    <div className={cn(
      'rounded-2xl transition-all',
      variantStyles[resolvedVariant],
      paddingStyles[resolvedPadding],
      className,
    )}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="ml-4 shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
