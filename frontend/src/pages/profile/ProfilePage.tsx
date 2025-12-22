import React, { useState, useEffect, useRef } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Shield,
  Calendar,
  Clock,
  Key,
  CheckCircle,
  XCircle,
  Edit,
  Camera,
  Save,
  X,
  Upload,
  Trash2,
  Lock,
  Bell,
  Globe,
  Smartphone
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { User } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = () => {
    setLoading(true);
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setEditedUser(currentUser);
        // Load profile image from localStorage or user object
        const savedImage = localStorage.getItem(`profile_image_${currentUser.id}`);
        if (savedImage) {
          setProfileImage(savedImage);
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedUser(user || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedUser(user || {});
    setImageFile(null);
  };

  const handleSave = async () => {
    try {
      // Save profile image to localStorage if changed
      if (imageFile && user) {
        localStorage.setItem(`profile_image_${user.id}`, profileImage!);
      }

      // TODO: Implement API call to update user profile
      toast.success('Profile updated successfully');
      setIsEditing(false);
      if (user) {
        const updatedUser = { ...user, ...editedUser };
        setUser(updatedUser);
        // Update user in localStorage
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
      setImageFile(null);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleChange = (field: keyof User, value: string) => {
    setEditedUser(prev => ({ ...prev, [field]: value }));
  };

  const handleImageClick = () => {
    if (isEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size should be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
        setImageFile(file);
        toast.success('Image selected. Click Save to update.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setProfileImage(null);
    setImageFile(null);
    if (user) {
      localStorage.removeItem(`profile_image_${user.id}`);
    }
    toast.success('Profile image removed');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE'
      ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700'
      : 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon size={40} className="text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No User Data
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Please log in to view your profile
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              My Profile
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400 text-lg">
              Manage your personal information and account settings
            </p>
          </div>
          {!isEditing ? (
            <Button
              onClick={handleEdit}
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Edit size={18} />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                onClick={handleSave}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
              >
                <Save size={18} />
                Save Changes
              </Button>
              <Button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
              >
                <X size={18} />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Main Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Cover Image */}
          <div className="relative h-48 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNjAgMTAgTSAxMCAwIEwgMTAgNjAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
          </div>

          <div className="px-8 pb-8">
            {/* Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end -mt-20 mb-8">
              <div className="relative">
                {/* Avatar Container */}
                <div className="relative w-40 h-40">
                  {/* Main Avatar Circle */}
                  <div className="w-full h-full rounded-full bg-white dark:bg-gray-700 p-2 shadow-2xl">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center overflow-hidden">
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt={user.username}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <span className="text-5xl font-bold text-white">
                          {getUserInitials()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Camera Upload Button - Only in Edit Mode */}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={handleImageClick}
                      className="absolute bottom-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-3 rounded-full shadow-xl transition-all duration-200 hover:scale-110 border-4 border-white dark:border-gray-800"
                      title="Upload profile picture"
                    >
                      <Camera size={20} />
                    </button>
                  )}

                  {/* Remove Image Button - Only when image exists and in edit mode */}
                  {isEditing && profileImage && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-xl transition-all duration-200 hover:scale-110 border-4 border-white dark:border-gray-800"
                      title="Remove profile picture"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="sm:ml-8 mt-6 sm:mt-0 mb-4 text-center sm:text-left">
                
                <div className="flex flex-wrap items-center gap-3 mt-4 justify-center sm:justify-start">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
                </h2>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border-2 ${getStatusColor(user.status)} shadow-sm`}>
                    {user.status}
                  </span>
                  {user.roles && user.roles.length > 0 && (
                    <span className="px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 border-2 border-indigo-200 dark:from-indigo-900/30 dark:to-purple-900/30 dark:text-indigo-400 dark:border-indigo-700 shadow-sm">
                      <Shield className="inline-block w-4 h-4 mr-1" />
                      {user.roles.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Information Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <UserIcon className="text-white" size={20} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Personal Information
                  </h3>
                </div>

                <div className="space-y-5">
                  {/* First Name */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      First Name
                    </label>
                    {isEditing ? (
                      <Input
                        type="text"
                        value={editedUser.firstName || ''}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        placeholder="Enter first name"
                        className="font-medium text-lg"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium text-lg">
                        {user.firstName || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      Last Name
                    </label>
                    {isEditing ? (
                      <Input
                        type="text"
                        value={editedUser.lastName || ''}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        placeholder="Enter last name"
                        className="font-medium text-lg"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium text-lg">
                        {user.lastName || 'Not set'}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      <Mail className="inline-block w-4 h-4 mr-2" />
                      Email Address
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium text-lg">
                      {user.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                      <Lock className="w-3 h-3 mr-1" />
                      Email cannot be changed
                    </p>
                  </div>

                  {/* Phone */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      <Phone className="inline-block w-4 h-4 mr-2" />
                      Phone Number
                    </label>
                    {isEditing ? (
                      <Input
                        type="tel"
                        value={editedUser.phone || ''}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="Enter phone number"
                        className="font-medium text-lg"
                      />
                    ) : (
                      <p className="text-gray-900 dark:text-white font-medium text-lg">
                        {user.phone || 'Not set'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Information */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Key className="text-white" size={20} />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Account Information
                  </h3>
                </div>

                <div className="space-y-5">
                  {/* User ID */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      User ID
                    </label>
                    <p className="text-gray-900 dark:text-white font-mono text-sm break-all bg-white dark:bg-gray-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                      {user.id}
                    </p>
                  </div>

                  {/* Username */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      Username
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium text-lg">
                      {user.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center">
                      <Lock className="w-3 h-3 mr-1" />
                      Username cannot be changed
                    </p>
                  </div>

                  {/* Role */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      <Shield className="inline-block w-4 h-4 mr-2" />
                      Role & Permissions
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium text-lg">
                      {user.role || (user.roles && user.roles.length > 0 ? user.roles.join(', ') : 'No role assigned')}
                    </p>
                  </div>

                  {/* Last Login */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      <Clock className="inline-block w-4 h-4 mr-2" />
                      Last Login
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatDate(user.lastLogin)}
                    </p>
                  </div>

                  {/* Account Created */}
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <label className="block text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
                      <Calendar className="inline-block w-4 h-4 mr-2" />
                      Account Created
                    </label>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Security & Quick Actions */}
            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                  <Shield className="text-white" size={20} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Security & Settings
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Account Status */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-700">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="text-green-600" size={20} />
                    Account Status
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Account Active</span>
                      {user.status === 'ACTIVE' ? (
                        <CheckCircle className="text-green-500" size={20} />
                      ) : (
                        <XCircle className="text-red-500" size={20} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border-2 border-indigo-200 dark:border-indigo-700">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Lock className="text-indigo-600" size={20} />
                    Security
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => toast.info('Change password feature coming soon')}
                      className="w-full text-left text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-2"
                    >
                      <Key size={16} />
                      Change Password
                    </button>
                    <button
                      onClick={() => toast.info('2FA setup coming soon')}
                      className="w-full text-left text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium flex items-center gap-2"
                    >
                      <Smartphone size={16} />
                      Enable 2FA
                    </button>
                  </div>
                </div>

                {/* Preferences */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-700">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Bell className="text-purple-600" size={20} />
                    Preferences
                  </h4>
                  <div className="space-y-3">
                    <button
                      onClick={() => toast.info('Notification settings coming soon')}
                      className="w-full text-left text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-2"
                    >
                      <Bell size={16} />
                      Notifications
                    </button>
                    <button
                      onClick={() => toast.info('Language settings coming soon')}
                      className="w-full text-left text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium flex items-center gap-2"
                    >
                      <Globe size={16} />
                      Language & Region
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
