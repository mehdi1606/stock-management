import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { logout as logoutAction } from '@/store/slices/auth.slice';
import { authService } from '@/services/auth.service';
import {
  LogOut,
  User,
  Settings,
  Bell,
  Search,
  Menu,
  ChevronDown,
  Package,
  Sparkles,
  Moon,
  Sun,
} from 'lucide-react';
import { ROUTES } from '@/config/constants';
import toast from 'react-hot-toast';
import { NotificationDropdown, useUnreadAlertCount } from '@/components/NotificationDropdown';

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header = ({ onMenuClick }: HeaderProps) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    // Initialize from localStorage or system preference
    const saved = localStorage.getItem('theme');
    if (saved) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [searchQuery, setSearchQuery] = useState('');

  // Get unread alert count from the custom hook
  const unreadCount = useUnreadAlertCount();

  // Load profile image from user object or localStorage
  useEffect(() => {
    if (user?.id) {
      // First check if user has profileImageUrl in their data
      if (user.profileImageUrl) {
        setProfileImage(user.profileImageUrl);
      } else {
        // Fallback to localStorage
        const savedImage = localStorage.getItem(`profile_image_${user.id}`);
        if (savedImage) {
          setProfileImage(savedImage);
        }
      }
    }
  }, [user?.id, user?.profileImageUrl]);

  // Apply dark mode class to document element
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      dispatch(logoutAction());
      toast.success('Logged out successfully');
      navigate(ROUTES.LOGIN);
    } catch (error) {
      dispatch(logoutAction());
      navigate(ROUTES.LOGIN);
    }
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    toast.success(!isDark ? 'Dark mode activated' : 'Light mode activated');
  };

  const getUserInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.username) {
      return user.username.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, type: 'spring' }}
      className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-b border-neutral-200/50 dark:border-neutral-700/50 z-50 shadow-lg"
    >
      <div className="flex items-center justify-between h-full px-4 lg:px-6 max-w-full">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <Menu className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
          </motion.button>

          {/* Logo & Brand */}
          <motion.div
            className="flex items-center gap-3 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            onClick={() => navigate(ROUTES.DASHBOARD)}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 via-purple-500 to-accent-teal flex items-center justify-center shadow-lg shadow-primary-500/30">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary-600 via-purple-600 to-accent-teal bg-clip-text text-transparent">
                StockFlow
              </h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 -mt-1">Management System</p>
            </div>
          </motion.div>

          {/* Search Bar - Desktop */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="hidden md:flex items-center gap-2 ml-8 bg-neutral-100 dark:bg-neutral-800 rounded-xl px-4 py-2 w-96"
          >
            <Search className="w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search products, inventory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-neutral-700 dark:text-neutral-300 placeholder-neutral-400 flex-1"
            />
            <kbd className="px-2 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 rounded">⌘K</kbd>
          </motion.div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2 lg:gap-3">
          {/* Quick Actions */}
          <motion.button
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="hidden lg:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl transition-all"
            onClick={() => toast.success('Quick action feature coming soon!')}
          >
            <Sparkles className="w-4 h-4" />
            <span>Quick Add</span>
          </motion.button>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleTheme}
            className="p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-500" />
            ) : (
              <Moon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            )}
          </motion.button>

          {/* Notifications */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowUserMenu(false);
              }}
              className="relative p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </motion.span>
              )}
            </motion.button>

            {/* Notifications Dropdown - Using our new component */}
            <NotificationDropdown
              isOpen={showNotifications}
              onClose={() => setShowNotifications(false)}
            />
          </div>

          {/* User Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowNotifications(false);
              }}
              className="flex items-center gap-2 lg:gap-3 pl-2 lg:pl-3 pr-2 py-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
            >
              <div className="hidden lg:flex flex-col items-end">
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                  {user?.firstName || user?.username || 'User'}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {user?.email || 'user@example.com'}
                </span>
              </div>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-lg overflow-hidden border-0 outline-none">
                {profileImage ? (
                  <img src={profileImage} alt="Profile" className="w-full h-full object-cover border-0 outline-none" />
                ) : (
                  <span className="border-0 outline-none">{getUserInitials()}</span>
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-neutral-500 hidden lg:block" />
            </motion.button>

            {/* User Dropdown */}
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden"
                >
                  <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg overflow-hidden">
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          getUserInitials()
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-neutral-800 dark:text-neutral-100">
                          {user?.firstName && user?.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user?.username || 'User'}
                        </p>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400">
                          {user?.email || 'user@example.com'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        navigate(ROUTES.PROFILE);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left transition-colors"
                    >
                      <User className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">My Profile</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        navigate(ROUTES.SETTINGS);
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700 text-left transition-colors"
                    >
                      <Settings className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">Settings</span>
                    </motion.button>
                  </div>

                  <div className="p-2 border-t border-neutral-200 dark:border-neutral-700">
                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() => {
                        handleLogout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-left transition-colors group"
                    >
                      <LogOut className="w-4 h-4 text-neutral-600 dark:text-neutral-400 group-hover:text-red-600" />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300 group-hover:text-red-600 font-semibold">
                        Logout
                      </span>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showUserMenu || showNotifications) && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
    </motion.header>
  );
};