// src/components/ui/GradientButton.tsx
import React from 'react';

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  /** Alias for variant - accepted but mapped internally */
  gradient?: 'primary' | 'secondary' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  /** Shows a spinner and disables the button when true */
  loading?: boolean;
  /** Adds a glow shadow effect — visual only, not forwarded to DOM */
  glow?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  gradient,            // alias for variant
  size = 'md',
  disabled,
  icon,
  loading = false,
  glow = false,
  ...props
}) => {
  // `gradient` is an alias for `variant` used by LoginPage
  const resolvedVariant = gradient ?? variant;

  const variants: Record<string, string> = {
    primary:   'from-primary-500 to-purple-600 hover:from-primary-600 hover:to-purple-700',
    secondary: 'from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800',
    success:   'from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700',
    danger:    'from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700',
  };

  const sizes: Record<string, string> = {
    sm: 'py-1.5 px-4 text-sm gap-1.5',
    md: 'py-2.5 px-6 text-base gap-2',
    lg: 'py-3 px-8 text-lg gap-2',
  };

  const glowStyle = glow
    ? { boxShadow: '0 0 20px rgba(44,62,144,0.4)' }
    : undefined;

  return (
    <button
      className={`
        inline-flex items-center justify-center
        bg-gradient-to-r ${variants[resolvedVariant] ?? variants.primary}
        text-white font-semibold rounded-xl
        ${sizes[size]}
        transition-all duration-200
        shadow-md hover:shadow-lg
        transform hover:-translate-y-0.5
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0
        ${className}
      `}
      disabled={disabled || loading}
      style={glowStyle}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin w-5 h-5 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
};
