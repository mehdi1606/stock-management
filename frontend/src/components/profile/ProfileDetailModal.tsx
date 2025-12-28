// src/components/profile/ProfileDetailModal.tsx
import React from 'react';
import { X, User, Mail, Phone, Shield, Calendar, Clock, Key } from 'lucide-react';
import { User as UserType } from '@/types';
import { Button } from '@/components/ui/Button';
import { format } from 'date-fns';

interface ProfileDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType;
  onEdit?: () => void;
}

export const ProfileDetailModal: React.FC<ProfileDetailModalProps> = ({
  isOpen,
  onClose,
  user,
  onEdit
}) => {
  if (!isOpen) return null;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'PPp');
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE'
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Profile Header */}
          <div className="flex items-center gap-4 pb-6 border-b border-gray-200 dark:border-gray-700">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.firstName} {user.lastName}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
              <div className="flex gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(user.status)}`}>
                  {user.status}
                </span>
                {user.roles && user.roles.length > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                    {user.roles.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <User size={20} className="text-indigo-600" />
              Personal Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">First Name</label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">{user.firstName || 'Not set'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Name</label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">{user.lastName || 'Not set'}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 col-span-2">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Mail size={16} />
                  Email Address
                </label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">{user.email}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 col-span-2">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Phone size={16} />
                  Phone Number
                </label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">{user.phoneNumber || user.phone || 'Not set'}</p>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Shield size={20} className="text-purple-600" />
              Account Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 col-span-2">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Key size={16} />
                  User ID
                </label>
                <p className="text-gray-900 dark:text-white font-mono text-sm mt-1 break-all">{user.id}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">{user.username}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</label>
                <p className="text-gray-900 dark:text-white font-medium mt-1">
                  {user.role || (user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'No role')}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Clock size={16} />
                  Last Login
                </label>
                <p className="text-gray-900 dark:text-white text-sm mt-1">{formatDate(user.lastLogin)}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <Calendar size={16} />
                  Account Created
                </label>
                <p className="text-gray-900 dark:text-white text-sm mt-1">{formatDate(user.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={onClose}
            variant="secondary"
          >
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={onEdit}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
