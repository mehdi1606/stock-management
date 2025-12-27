import React, { useState } from 'react';
import { X, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import { apiClient } from '@/services/api';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+€£µ§?/\\|{}\[\]]/.test(password),
    };
  };

  const validation = validatePassword(newPassword);
  const isPasswordValid = Object.values(validation).every(v => v);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword !== '';

  // Calculate password strength
  const getPasswordStrength = (): 'critical' | 'good' | 'great' | null => {
    if (!newPassword) return null;

    const validationCount = Object.values(validation).filter(v => v).length;
    const hasLongPassword = newPassword.length >= 15;

    // Critical: Less than all requirements met
    if (validationCount < 5) return 'critical';

    // Great: All requirements + 15+ characters
    if (validationCount === 5 && hasLongPassword) return 'great';

    // Good: All requirements but less than 15 characters
    return 'good';
  };

  const passwordStrength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Please enter your current password');
      return;
    }

    if (!isPasswordValid) {
      toast.error('Password does not meet security requirements');
      return;
    }

    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.put('/api/users/change-password', {
        currentPassword,
        newPassword,
      });

      toast.success('Password changed successfully');
      onSuccess();
      handleClose();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
              <Lock className="text-indigo-600 dark:text-indigo-400" size={20} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Change Password
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <Input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicators */}
            {newPassword && (
              <div className="mt-3 flex gap-2">
                <div className={`flex-1 h-3 rounded-md border-2 transition-all ${
                  passwordStrength === 'critical'
                    ? 'bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                }`} />
                <div className={`flex-1 h-3 rounded-md border-2 transition-all ${
                  passwordStrength === 'good'
                    ? 'bg-orange-50 border-orange-500 dark:bg-orange-900/20 dark:border-orange-500'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                }`} />
                <div className={`flex-1 h-3 rounded-md border-2 transition-all ${
                  passwordStrength === 'great'
                    ? 'bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500'
                    : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
                }`} />
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                required
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirmPassword && (
              <div className="mt-2 flex items-center gap-2">
                {passwordsMatch ? (
                  <div className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle size={16} />
                    <span>Passwords match</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600 text-sm">
                    <AlertCircle size={16} />
                    <span>Passwords do not match</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Password Requirements:
            </h4>
            <div className="space-y-2 text-sm">
              <div className={`flex items-center gap-2 ${validation.minLength ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {validation.minLength ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>At least 8 characters (15+ recommended)</span>
              </div>
              <div className={`flex items-center gap-2 ${validation.hasUppercase ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {validation.hasUppercase ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>At least one uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-2 ${validation.hasLowercase ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {validation.hasLowercase ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>At least one lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-2 ${validation.hasNumber ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {validation.hasNumber ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>At least one number (0-9)</span>
              </div>
              <div className={`flex items-center gap-2 ${validation.hasSpecialChar ? 'text-green-600' : 'text-gray-600 dark:text-gray-400'}`}>
                {validation.hasSpecialChar ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>At least one special character (!@#$%^&*()_+€£µ§?/\|{'{'}{'}'}{' '}[])</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              onClick={handleClose}
              variant="secondary"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={loading || !isPasswordValid || !passwordsMatch || !currentPassword}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
