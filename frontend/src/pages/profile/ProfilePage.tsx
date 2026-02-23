import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
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
  Edit3,
  Camera,
  Save,
  X,
  Trash2,
  Lock,
  Bell,
  Globe,
  Smartphone,
  AtSign,
  BadgeCheck,
  Activity,
} from 'lucide-react';
import { authService } from '@/services/auth.service';
import { userService, UserUpdateRequest } from '@/services/user.service';
import { User } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'react-hot-toast';
import { ProfileDetailModal } from '@/components/profile/ProfileDetailModal';
import { ProfileFormModal } from '@/components/profile/ProfileFormModal';
import { NotificationPreferencesModal } from '@/components/profile/NotificationPreferencesModal';
import { LanguageRegionModal } from '@/components/profile/LanguageRegionModal';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';
import { preferencesService, NotificationPreferences, LanguageRegionPreferences } from '@/services/preferences.service';
import { cn } from '@/utils/cn';

// Strip ROLE_ prefix from role strings
const formatRole = (role: string) =>
  role.replace(/^ROLE_/i, '').replace(/_/g, ' ');

const ROLE_GRADIENTS: Record<string, string> = {
  ADMIN: 'from-amber-500 to-orange-500',
  MANAGER: 'from-indigo-500 to-blue-500',
  WAREHOUSE_MANAGER: 'from-cyan-500 to-teal-500',
  QUALITY_MANAGER: 'from-emerald-500 to-green-500',
  SUPERVISOR: 'from-violet-500 to-purple-500',
  OPERATOR: 'from-pink-500 to-rose-500',
  PROCUREMENT: 'from-sky-500 to-blue-500',
  AUDITOR: 'from-slate-500 to-gray-500',
};

const getRoleGradient = (roles: string[]) => {
  const r = roles[0]?.replace(/^ROLE_/i, '') ?? '';
  return ROLE_GRADIENTS[r] ?? 'from-indigo-500 to-purple-500';
};

// Info row used in both view and edit mode
const InfoRow = ({
  icon: Icon,
  label,
  value,
  locked,
  lockNote,
  editing,
  editValue,
  onEdit,
  type = 'text',
  placeholder,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  locked?: boolean;
  lockNote?: string;
  editing?: boolean;
  editValue?: string;
  onEdit?: (v: string) => void;
  type?: string;
  placeholder?: string;
}) => (
  <div className="flex items-start gap-4 py-4 border-b border-neutral-100 dark:border-neutral-700/60 last:border-0">
    <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-700/60 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
        {label}
      </p>
      {editing && !locked ? (
        <Input
          type={type}
          value={editValue ?? ''}
          onChange={(e) => onEdit?.(e.target.value)}
          placeholder={placeholder}
          className="font-medium"
        />
      ) : (
        <>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate">
            {value || 'Not set'}
          </p>
          {locked && lockNote && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {lockNote}
            </p>
          )}
        </>
      )}
    </div>
  </div>
);

// ─── Stat mini card
const StatCard = ({ label, value, icon: Icon, color }: {
  label: string; value: string; icon: React.ElementType; color: string;
}) => (
  <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-700/40">
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="min-w-0">
      <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{value}</p>
    </div>
  </div>
);

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editedUser, setEditedUser] = useState<Partial<User>>({});
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [_imageFile, setImageFile] = useState<File | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences | null>(null);
  const [languagePrefs, setLanguagePrefs] = useState<LanguageRegionPreferences | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUser();
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const prefs = await preferencesService.loadPreferencesFromBackend();
    setNotificationPrefs(prefs.notifications);
    setLanguagePrefs(prefs.languageRegion);
  };

  const fetchUser = async () => {
    setLoading(true);
    try {
      const currentUser = await userService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.profileImageUrl) setProfileImage(currentUser.profileImageUrl);
      }
    } catch {
      const localUser = authService.getCurrentUser();
      if (localUser) setUser(localUser);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    await fetchUser();
    setShowFormModal(false);
  };

  const handleSaveNotificationPreferences = async (prefs: NotificationPreferences) => {
    await preferencesService.saveNotificationPreferences(prefs);
    setNotificationPrefs(prefs);
  };

  const handleSaveLanguagePreferences = async (prefs: LanguageRegionPreferences) => {
    await preferencesService.saveLanguageRegionPreferences(prefs);
    setLanguagePrefs(prefs);
  };

  const handleEdit = () => { setIsEditing(true); setEditedUser(user || {}); };
  const handleCancel = () => { setIsEditing(false); setEditedUser(user || {}); setImageFile(null); };

  const handleSave = async () => {
    if (!user) return;
    try {
      const updateData: UserUpdateRequest = {
        firstName: editedUser.firstName,
        lastName: editedUser.lastName,
        phoneNumber: editedUser.phoneNumber || editedUser.phone,
        email: editedUser.email,
      };
      if (profileImage) updateData.profileImageUrl = profileImage;
      const updatedUser = await userService.updateUser(user.id, updateData);
      setUser(updatedUser);
      setEditedUser(updatedUser);
      if (profileImage) localStorage.setItem(`profile_image_${user.id}`, profileImage);
      toast.success('Profile updated successfully');
      setIsEditing(false);
      setImageFile(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update profile');
    }
  };

  const handleChange = (field: keyof User, value: string) =>
    setEditedUser(prev => ({ ...prev, [field]: value }));

  const handleImageClick = () => { if (isEditing) fileInputRef.current?.click(); };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be < 5MB'); return; }
    if (!file.type.startsWith('image/')) { toast.error('Select a valid image'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const MAX = 400;
        let { width, height } = img;
        if (width > height) { if (width > MAX) { height = (height * MAX) / width; width = MAX; } }
        else { if (height > MAX) { width = (width * MAX) / height; height = MAX; } }
        canvas.width = width; canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        const b64 = canvas.toDataURL('image/jpeg', 0.8);
        if (b64.length > 500 * 1024) { toast.error('Image too large after compression'); return; }
        setProfileImage(b64); setImageFile(file);
        toast.success('Image selected — click Save to apply');
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setProfileImage(null); setImageFile(null);
    if (user) localStorage.removeItem(`profile_image_${user.id}`);
    toast.success('Profile image removed');
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName)
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user?.username) return user.username.substring(0, 2).toUpperCase();
    return 'U';
  };

  const userRoles = user?.roles ?? (user?.role ? [user.role] : []);
  const roleGradient = getRoleGradient(userRoles);
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.username || '';

  // ─── Loading
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin mx-auto" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading profile…</p>
      </div>
    </div>
  );

  if (!user) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto">
          <UserIcon className="w-8 h-8 text-neutral-400" />
        </div>
        <p className="font-semibold text-neutral-700 dark:text-neutral-300">No user data</p>
        <p className="text-sm text-neutral-500">Please log in to view your profile.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-10">
      {/* ── Page Header ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            My Profile
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Manage your personal information and account settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" icon={<X className="w-4 h-4" />} onClick={handleCancel}>
                Cancel
              </Button>
              <Button variant="accent" size="sm" icon={<Save className="w-4 h-4" />} onClick={handleSave}>
                Save Changes
              </Button>
            </>
          ) : (
            <Button variant="primary" size="sm" icon={<Edit3 className="w-4 h-4" />} onClick={handleEdit}>
              Edit Profile
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Hero Card ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 shadow-sm overflow-hidden"
      >
        {/* Cover strip */}
        <div className={cn('h-32 bg-gradient-to-r', roleGradient, 'relative')}>
          <div className="absolute inset-0 bg-black/10" />
          {/* Subtle pattern overlay */}
          <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        <div className="px-6 pb-6">
          {/* Avatar + Identity */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 mb-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl ring-4 ring-white dark:ring-neutral-800 bg-neutral-100 dark:bg-neutral-700 overflow-hidden shadow-lg">
                {profileImage ? (
                  <img src={profileImage} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  <div className={cn('w-full h-full bg-gradient-to-br flex items-center justify-center', roleGradient)}>
                    <span className="text-2xl font-bold text-white">{getUserInitials()}</span>
                  </div>
                )}
              </div>
              {isEditing && (
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  <button
                    onClick={handleImageClick}
                    className="w-8 h-8 bg-primary-600 hover:bg-primary-700 text-white rounded-xl flex items-center justify-center shadow-lg transition-colors"
                    title="Upload photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  {profileImage && (
                    <button
                      onClick={handleRemoveImage}
                      className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-xl flex items-center justify-center shadow-lg transition-colors"
                      title="Remove photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>

            {/* Name + Role */}
            <div className="sm:mb-1 flex-1 min-w-0">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 truncate">
                {fullName}
              </h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">@{user.username}</span>
                {userRoles.length > 0 && (
                  <span className={cn(
                    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-white bg-gradient-to-r',
                    roleGradient,
                  )}>
                    <BadgeCheck className="w-3 h-3" />
                    {userRoles.map(r => formatRole(r)).join(' · ')}
                  </span>
                )}
                {user.status === 'ACTIVE' ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Inactive
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
            <StatCard
              label="Member Since"
              value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}
              icon={Calendar}
              color="bg-primary-500"
            />
            <StatCard
              label="Last Login"
              value={user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
              icon={Clock}
              color="bg-violet-500"
            />
            <StatCard
              label="Role"
              value={userRoles.map(r => formatRole(r)).join(', ') || 'No role'}
              icon={Shield}
              color="bg-amber-500"
            />
            <StatCard
              label="Status"
              value={user.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              icon={Activity}
              color={user.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}
            />
          </div>
        </div>
      </motion.div>

      {/* ── Two-column info grid ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Personal Information */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
              <UserIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
              Personal Information
            </h3>
          </div>

          <InfoRow
            icon={UserIcon}
            label="First Name"
            value={user.firstName || ''}
            editing={isEditing}
            editValue={editedUser.firstName || ''}
            onEdit={v => handleChange('firstName', v)}
            placeholder="Enter first name"
          />
          <InfoRow
            icon={UserIcon}
            label="Last Name"
            value={user.lastName || ''}
            editing={isEditing}
            editValue={editedUser.lastName || ''}
            onEdit={v => handleChange('lastName', v)}
            placeholder="Enter last name"
          />
          <InfoRow
            icon={Mail}
            label="Email Address"
            value={user.email || ''}
            locked
            lockNote="Email cannot be changed"
          />
          <InfoRow
            icon={Phone}
            label="Phone Number"
            value={user.phoneNumber || user.phone || ''}
            editing={isEditing}
            editValue={editedUser.phoneNumber || editedUser.phone || ''}
            onEdit={v => handleChange('phoneNumber', v)}
            type="tel"
            placeholder="Enter phone number"
          />
        </motion.div>

        {/* Account Information */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
              <Key className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
              Account Information
            </h3>
          </div>

          <InfoRow
            icon={AtSign}
            label="Username"
            value={user.username || ''}
            locked
            lockNote="Username cannot be changed"
          />
          <InfoRow
            icon={Shield}
            label="Role & Permissions"
            value={userRoles.map(r => formatRole(r)).join(', ') || 'No role assigned'}
          />
          <InfoRow
            icon={Clock}
            label="Last Login"
            value={formatDate(user.lastLogin)}
          />
          <InfoRow
            icon={Calendar}
            label="Account Created"
            value={formatDate(user.createdAt)}
          />
        </motion.div>
      </div>

      {/* ── Security & Preferences ───────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 shadow-sm p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wide">
            Security & Preferences
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Account Status */}
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-700/40 p-4">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
              Account Status
            </p>
            <div className="flex items-center gap-2">
              {user.status === 'ACTIVE' ? (
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
              )}
              <span className={cn(
                'text-sm font-semibold',
                user.status === 'ACTIVE'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-700 dark:text-red-400',
              )}>
                {user.status === 'ACTIVE' ? 'Account Active' : 'Account Inactive'}
              </span>
            </div>
          </div>

          {/* Security */}
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-700/40 p-4">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
              Security
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => setShowChangePasswordModal(true)}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                <Key className="w-4 h-4 shrink-0" />
                Change Password
              </button>
              <button
                onClick={() => toast.success('2FA coming soon')}
                className="flex items-center gap-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
              >
                <Smartphone className="w-4 h-4 shrink-0" />
                Enable 2FA
              </button>
            </div>
          </div>

          {/* Preferences */}
          <div className="rounded-xl bg-neutral-50 dark:bg-neutral-700/40 p-4">
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
              Preferences
            </p>
            <div className="space-y-2.5">
              <button
                onClick={() => setShowNotificationsModal(true)}
                className="flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <Bell className="w-4 h-4 shrink-0" />
                Notifications
              </button>
              <button
                onClick={() => setShowLanguageModal(true)}
                className="flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                <Globe className="w-4 h-4 shrink-0" />
                Language & Region
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modals */}
      <ProfileDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        user={user}
        onEdit={() => { setShowDetailModal(false); setShowFormModal(true); }}
      />
      <ProfileFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        user={user}
        onSuccess={handleProfileUpdate}
      />
      <NotificationPreferencesModal
        isOpen={showNotificationsModal}
        onClose={() => setShowNotificationsModal(false)}
        onSave={handleSaveNotificationPreferences}
        initialPreferences={notificationPrefs || undefined}
      />
      <LanguageRegionModal
        isOpen={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
        onSave={handleSaveLanguagePreferences}
        initialPreferences={languagePrefs || undefined}
      />
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        onSuccess={() => setShowChangePasswordModal(false)}
      />
    </div>
  );
};
