import Swal, { SweetAlertOptions } from 'sweetalert2';

const isDark = () =>
  document.documentElement.getAttribute('data-theme') === 'dark' ||
  document.documentElement.classList.contains('dark');

const base = (): SweetAlertOptions => ({
  background: isDark() ? '#1a1a2e' : '#ffffff',
  color: isDark() ? '#e2e8f0' : '#1e293b',
  showCancelButton: true,
  cancelButtonText: 'Cancel',
  reverseButtons: true,
  buttonsStyling: true,
  focusConfirm: false,
  customClass: { popup: 'rounded-2xl shadow-2xl' },
});

/** Green confirm — positive actions (complete, approve) */
export const confirmAction = async (title: string, text: string, confirmText = 'Confirm'): Promise<boolean> => {
  const result = await Swal.fire({
    ...base(),
    icon: 'question',
    title,
    text,
    confirmButtonText: confirmText,
    confirmButtonColor: '#10b981',
    cancelButtonColor: isDark() ? '#4b5563' : '#9ca3af',
    iconColor: '#10b981',
  });
  return result.isConfirmed;
};

/** Red confirm — destructive actions (delete) */
export const confirmDelete = async (title: string, text: string, confirmText = 'Delete'): Promise<boolean> => {
  const result = await Swal.fire({
    ...base(),
    icon: 'warning',
    title,
    text,
    confirmButtonText: confirmText,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: isDark() ? '#4b5563' : '#9ca3af',
    iconColor: '#ef4444',
  });
  return result.isConfirmed;
};

/** Amber confirm — caution actions (reset, update status, revoke) */
export const confirmWarning = async (title: string, text: string, confirmText = 'Proceed'): Promise<boolean> => {
  const result = await Swal.fire({
    ...base(),
    icon: 'warning',
    title,
    text,
    confirmButtonText: confirmText,
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: isDark() ? '#4b5563' : '#9ca3af',
    iconColor: '#f59e0b',
  });
  return result.isConfirmed;
};

/** Textarea input dialog — replaces window.prompt for cancel/hold reasons */
export const promptInput = async (
  title: string,
  inputLabel: string,
  placeholder = ''
): Promise<string | null> => {
  const result = await Swal.fire({
    ...base(),
    title,
    input: 'textarea',
    inputLabel,
    inputPlaceholder: placeholder,
    inputAttributes: { rows: '3', style: 'resize:none; border-radius:0.75rem; padding:0.75rem;' },
    confirmButtonText: 'Confirm',
    confirmButtonColor: '#4f46e5',
    cancelButtonColor: isDark() ? '#4b5563' : '#9ca3af',
    showCancelButton: true,
    inputValidator: (value) => {
      if (!value?.trim()) return 'Please enter a reason to continue.';
    },
  });
  return result.isConfirmed ? (result.value as string) : null;
};
