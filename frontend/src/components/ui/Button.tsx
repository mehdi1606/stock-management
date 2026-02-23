// src/components/ui/Button.tsx

import { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'accent' | 'ghost' | 'warning' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  icon?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-sm focus:ring-2 focus:ring-primary-300',
  secondary: 'bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-300 dark:hover:bg-neutral-600 focus:ring-2 focus:ring-neutral-300',
  danger: 'bg-red-600 hover:bg-red-700 text-white shadow-sm focus:ring-2 focus:ring-red-300',
  success: 'bg-green-600 hover:bg-green-700 text-white shadow-sm focus:ring-2 focus:ring-green-300',
  accent: 'bg-accent-teal hover:bg-teal-600 text-white shadow-sm focus:ring-2 focus:ring-teal-300',
  ghost: 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 focus:ring-2 focus:ring-neutral-200',
  warning: 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm focus:ring-2 focus:ring-orange-300',
  outline: 'bg-transparent border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 focus:ring-2 focus:ring-neutral-200',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-5 py-2.5 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled,
  icon,
  iconRight,
  loading,
  ...props
}: ButtonProps) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant] ?? variantStyles.primary,
        sizeStyles[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && <span className="shrink-0">{iconRight}</span>}
    </button>
  );
};
