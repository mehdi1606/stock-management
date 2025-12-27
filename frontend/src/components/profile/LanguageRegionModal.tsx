import React, { useState, useEffect } from 'react';
import { X, Globe, Calendar, Clock, DollarSign, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';

interface LanguageRegionPreferences {
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

interface LanguageRegionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (preferences: LanguageRegionPreferences) => Promise<void>;
  initialPreferences?: LanguageRegionPreferences;
}

const defaultPreferences: LanguageRegionPreferences = {
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

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

const timezones = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const currencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'MAD', symbol: 'د.م.', name: 'Moroccan Dirham' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
];

export const LanguageRegionModal: React.FC<LanguageRegionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialPreferences
}) => {
  const [preferences, setPreferences] = useState<LanguageRegionPreferences>(
    initialPreferences || defaultPreferences
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && initialPreferences) {
      setPreferences(initialPreferences);
    }
  }, [isOpen, initialPreferences]);

  const handleChange = (key: keyof LanguageRegionPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(preferences);
      toast.success('Language & Region preferences saved successfully');
      onClose();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <Globe className="text-purple-600 dark:text-purple-400" size={20} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Language & Region
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Globe size={16} className="text-indigo-600" />
              Language
            </label>
            <select
              value={preferences.language}
              onChange={(e) => handleChange('language', e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.name}
                </option>
              ))}
            </select>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Clock size={16} className="text-indigo-600" />
              Timezone
            </label>
            <select
              value={preferences.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          {/* Date & Time Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />
                Date Format
              </label>
              <select
                value={preferences.dateFormat}
                onChange={(e) => handleChange('dateFormat', e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Clock size={16} className="text-indigo-600" />
                Time Format
              </label>
              <select
                value={preferences.timeFormat}
                onChange={(e) => handleChange('timeFormat', e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="12h">12-hour (2:30 PM)</option>
                <option value="24h">24-hour (14:30)</option>
              </select>
            </div>
          </div>

          {/* First Day of Week */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600" />
              First Day of Week
            </label>
            <select
              value={preferences.firstDayOfWeek}
              onChange={(e) => handleChange('firstDayOfWeek', e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="sunday">Sunday</option>
              <option value="monday">Monday</option>
            </select>
          </div>

          {/* Number Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number Format
            </label>
            <select
              value={preferences.numberFormat}
              onChange={(e) => handleChange('numberFormat', e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              <option value="1,000.00">1,000.00 (US/UK)</option>
              <option value="1.000,00">1.000,00 (Europe)</option>
              <option value="1 000,00">1 000,00 (France)</option>
            </select>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <DollarSign size={16} className="text-indigo-600" />
              Currency
            </label>
            <select
              value={preferences.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            >
              {currencies.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.symbol} {curr.code} - {curr.name}
                </option>
              ))}
            </select>
          </div>

          {/* Units */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Ruler size={16} className="text-indigo-600" />
                Weight Unit
              </label>
              <select
                value={preferences.weightUnit}
                onChange={(e) => handleChange('weightUnit', e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="lbs">Pounds (lbs)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temperature Unit
              </label>
              <select
                value={preferences.temperatureUnit}
                onChange={(e) => handleChange('temperatureUnit', e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="celsius">Celsius (°C)</option>
                <option value="fahrenheit">Fahrenheit (°F)</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Preview</h4>
            <div className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <p>Date: {preferences.dateFormat === 'DD/MM/YYYY' ? '22/12/2025' : preferences.dateFormat === 'MM/DD/YYYY' ? '12/22/2025' : '2025-12-22'}</p>
              <p>Time: {preferences.timeFormat === '12h' ? '2:30 PM' : '14:30'}</p>
              <p>Number: {preferences.numberFormat === '1,000.00' ? '1,234.56' : preferences.numberFormat === '1.000,00' ? '1.234,56' : '1 234,56'}</p>
              <p>Currency: {currencies.find(c => c.code === preferences.currency)?.symbol}100.00</p>
              <p>Weight: 75 {preferences.weightUnit}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </div>
  );
};
