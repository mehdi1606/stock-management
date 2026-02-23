/**
 * ConfirmAction — Inline confirm pattern, no modal/popup.
 *
 * Usage:
 *   <ConfirmAction
 *     label="Delete"
 *     onConfirm={() => handleDelete(id)}
 *   />
 *
 * When the user clicks the trigger button a compact "Are you sure? Cancel / Yes"
 * row slides in inline — zero popups, zero swal, zero windows.confirm.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, AlertTriangle, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConfirmActionProps {
  /** Label shown on the trigger button (default "Delete") */
  label?: string;
  /** Custom trigger content */
  trigger?: React.ReactNode;
  /** Confirmation message (default "Are you sure?") */
  message?: string;
  /** Async action to run on confirm */
  onConfirm: () => Promise<void> | void;
  /** Variant colours */
  variant?: 'danger' | 'warning' | 'primary';
  /** Extra class on wrapper */
  className?: string;
  disabled?: boolean;
}

const VARIANT = {
  danger: {
    trigger: 'text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20',
    confirm: 'bg-red-500 hover:bg-red-600 text-white',
    icon: <Trash2 className="w-3.5 h-3.5" />,
    alertIcon: <AlertTriangle className="w-3 h-3 text-red-500" />,
  },
  warning: {
    trigger: 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20',
    confirm: 'bg-amber-500 hover:bg-amber-600 text-white',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
    alertIcon: <AlertTriangle className="w-3 h-3 text-amber-500" />,
  },
  primary: {
    trigger: 'text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20',
    confirm: 'bg-blue-500 hover:bg-blue-600 text-white',
    icon: <Check className="w-3.5 h-3.5" />,
    alertIcon: <AlertTriangle className="w-3 h-3 text-blue-500" />,
  },
};

export const ConfirmAction: React.FC<ConfirmActionProps> = ({
  label = 'Delete',
  trigger,
  message = 'Are you sure?',
  onConfirm,
  variant = 'danger',
  className,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const v = VARIANT[variant];

  const handleConfirm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOpen(false);
  };

  const handleTrigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled) setOpen(true);
  };

  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="trigger"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.12 }}
            type="button"
            disabled={disabled}
            onClick={handleTrigger}
            title={label}
            className={cn(
              'p-1.5 rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed',
              v.trigger,
            )}
          >
            {trigger ?? v.icon}
          </motion.button>
        ) : (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-lg shadow-neutral-200/50 dark:shadow-neutral-900/50"
          >
            {v.alertIcon}
            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
              {message}
            </span>
            {/* Cancel */}
            <button
              type="button"
              onClick={handleCancel}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            {/* Confirm */}
            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-60',
                v.confirm,
              )}
            >
              {loading ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Yes
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConfirmAction;
