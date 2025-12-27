import { apiClient } from './api';
import { API_ENDPOINTS } from '@/config/constants';

export interface NotificationPreferences {
  emailNotifications: boolean;
  inAppNotifications: boolean;
  lowStockAlerts: boolean;
  qualityAlerts: boolean;
  movementAlerts: boolean;
  dailyReports: boolean;
  weeklyReports: boolean;
  notificationFrequency: 'immediate' | 'daily' | 'weekly';
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

export interface LanguageRegionPreferences {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 'sunday' | 'monday';
  numberFormat: string;
  currency: string;
  weightUnit: 'kg' | 'lbs';
  temperatureUnit: 'celsius' | 'fahrenheit';
}

export interface UserPreferences {
  notifications: NotificationPreferences;
  languageRegion: LanguageRegionPreferences;
}

const PREFERENCES_STORAGE_KEY = 'user_preferences';

const defaultNotificationPreferences: NotificationPreferences = {
  emailNotifications: true,
  inAppNotifications: true,
  lowStockAlerts: true,
  qualityAlerts: true,
  movementAlerts: false,
  dailyReports: false,
  weeklyReports: true,
  notificationFrequency: 'immediate',
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

const defaultLanguageRegionPreferences: LanguageRegionPreferences = {
  language: 'en',
  timezone: 'UTC',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '24h',
  firstDayOfWeek: 'monday',
  numberFormat: '1,000.00',
  currency: 'USD',
  weightUnit: 'kg',
  temperatureUnit: 'celsius',
};

export const preferencesService = {
  /**
   * Get user preferences from localStorage
   */
  getPreferences: (): UserPreferences => {
    try {
      const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          notifications: { ...defaultNotificationPreferences, ...parsed.notifications },
          languageRegion: { ...defaultLanguageRegionPreferences, ...parsed.languageRegion },
        };
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }

    return {
      notifications: defaultNotificationPreferences,
      languageRegion: defaultLanguageRegionPreferences,
    };
  },

  /**
   * Get notification preferences
   */
  getNotificationPreferences: (): NotificationPreferences => {
    const prefs = preferencesService.getPreferences();
    return prefs.notifications;
  },

  /**
   * Get language & region preferences
   */
  getLanguageRegionPreferences: (): LanguageRegionPreferences => {
    const prefs = preferencesService.getPreferences();
    return prefs.languageRegion;
  },

  /**
   * Save notification preferences
   */
  saveNotificationPreferences: async (preferences: NotificationPreferences): Promise<void> => {
    const current = preferencesService.getPreferences();
    const updated: UserPreferences = {
      ...current,
      notifications: preferences,
    };

    // Save to localStorage
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));

    // Save to backend (metadata field)
    try {
      await apiClient.put(API_ENDPOINTS.USERS.PREFERENCES, {
        metadata: JSON.stringify(updated),
      });
    } catch (error) {
      console.error('Failed to save preferences to backend:', error);
      // Don't throw - localStorage already updated
    }
  },

  /**
   * Save language & region preferences
   */
  saveLanguageRegionPreferences: async (preferences: LanguageRegionPreferences): Promise<void> => {
    const current = preferencesService.getPreferences();
    const updated: UserPreferences = {
      ...current,
      languageRegion: preferences,
    };

    // Save to localStorage
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(updated));

    // Save to backend
    try {
      await apiClient.put(API_ENDPOINTS.USERS.PREFERENCES, {
        language: preferences.language,
        timezone: preferences.timezone,
        metadata: JSON.stringify(updated),
      });
    } catch (error) {
      console.error('Failed to save preferences to backend:', error);
      // Don't throw - localStorage already updated
    }
  },

  /**
   * Load preferences from backend
   */
  loadPreferencesFromBackend: async (): Promise<UserPreferences> => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS.CURRENT_USER);
      const user = response.data;

      if (user.metadata) {
        try {
          const parsed = JSON.parse(user.metadata);
          const prefs: UserPreferences = {
            notifications: { ...defaultNotificationPreferences, ...parsed.notifications },
            languageRegion: { ...defaultLanguageRegionPreferences, ...parsed.languageRegion },
          };

          // Update with direct fields if available
          if (user.language) {
            prefs.languageRegion.language = user.language;
          }
          if (user.timezone) {
            prefs.languageRegion.timezone = user.timezone;
          }

          // Save to localStorage
          localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs));

          return prefs;
        } catch (error) {
          console.error('Failed to parse metadata:', error);
        }
      }
    } catch (error) {
      console.error('Failed to load preferences from backend:', error);
    }

    // Return defaults if backend fails
    return {
      notifications: defaultNotificationPreferences,
      languageRegion: defaultLanguageRegionPreferences,
    };
  },
};
