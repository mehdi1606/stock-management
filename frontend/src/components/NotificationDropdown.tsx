// frontend/src/components/NotificationDropdown.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  Info,
  AlertOctagon,
  CheckCircle,
  X,
  Eye,
} from 'lucide-react';
import { alertService, Alert } from '@/services/alert.service';
import { productService } from '@/services/product.service';
import { locationService } from '@/services/location.service';
import { toast } from 'react-hot-toast';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [itemNames, setItemNames] = useState<Record<string, string>>({});
  const [locationNames, setLocationNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      fetchUnacknowledgedAlerts();
    }
  }, [isOpen]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchUnacknowledgedAlerts = async () => {
    setLoading(true);
    try {
      const response = await alertService.getUnacknowledgedAlerts({ page: 0, size: 5 });
      setAlerts(response.content);
      setUnreadCount(response.totalElements);
      // Fetch item and location names for all alerts
      await fetchEntityNames(response.content);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await alertService.getUnacknowledgedAlerts({ page: 0, size: 1 });
      setUnreadCount(response.totalElements);
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  };

  const handleAcknowledge = async (alertId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      await alertService.acknowledgeAlert(alertId);
      fetchUnacknowledgedAlerts();
      fetchUnreadCount();
      toast.success('Alert acknowledged');
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  const handleAcknowledgeAll = async () => {
    try {
      // Acknowledge all alerts in the list
      await Promise.all(alerts.map((alert) => alertService.acknowledgeAlert(alert.id)));
      fetchUnacknowledgedAlerts();
      fetchUnreadCount();
      toast.success('All alerts acknowledged');
    } catch (error) {
      console.error('Failed to acknowledge all alerts:', error);
      toast.error('Failed to acknowledge all alerts');
    }
  };

  const handleViewAllAlerts = () => {
    navigate('/alerts');
    onClose();
  };

  const handleAlertClick = (alert: Alert) => {
    navigate('/alerts');
    onClose();
  };

  // Fetch item and location names for alerts
  const fetchEntityNames = async (alertsList: Alert[]) => {
    const itemIds = new Set<string>();
    const locationIds = new Set<string>();

    // Collect all unique item and location IDs
    alertsList.forEach((alert) => {
      if (alert.entityType === 'ITEM' && alert.entityId) {
        itemIds.add(alert.entityId);
      }

      // Also check in parsed data for locationId
      const parsedData = parseAlertData(alert.data);
      if (parsedData?.itemId) {
        itemIds.add(parsedData.itemId);
      }
      if (parsedData?.locationId) {
        locationIds.add(parsedData.locationId);
      }
    });

    // Fetch item names
    const newItemNames: Record<string, string> = { ...itemNames };
    for (const itemId of itemIds) {
      if (!newItemNames[itemId]) {
        try {
          const item = await productService.getItemById(itemId);
          newItemNames[itemId] = item.name || item.code || itemId;
        } catch (error) {
          console.error(`Failed to fetch item ${itemId}:`, error);
          newItemNames[itemId] = itemId.substring(0, 8) + '...';
        }
      }
    }
    setItemNames(newItemNames);

    // Fetch location names
    const newLocationNames: Record<string, string> = { ...locationNames };
    for (const locationId of locationIds) {
      if (!newLocationNames[locationId]) {
        try {
          const location = await locationService.getLocationById(locationId);
          newLocationNames[locationId] = location.name || location.code || locationId;
        } catch (error) {
          console.error(`Failed to fetch location ${locationId}:`, error);
          newLocationNames[locationId] = locationId.substring(0, 8) + '...';
        }
      }
    }
    setLocationNames(newLocationNames);
  };

  // Decode URL-encoded message
  const decodeMessage = (message: string): string => {
    try {
      return decodeURIComponent(message);
    } catch (e) {
      return message; // Return original if decoding fails
    }
  };

  // Parse and decode alert data
  const parseAlertData = (data: any): any => {
    if (!data) return null;

    try {
      // If data has rawData property, try to decode and parse it
      if (data.rawData) {
        const decodedRawData = decodeURIComponent(data.rawData);
        try {
          return JSON.parse(decodedRawData);
        } catch (e) {
          // If parsing fails, return the decoded string
          return { rawData: decodedRawData };
        }
      }
      return data;
    } catch (e) {
      return data; // Return original if decoding fails
    }
  };

  // Get enhanced message with names instead of IDs
  const getEnhancedMessage = (alert: Alert): string => {
    let message = decodeMessage(alert.message);
    const parsedData = parseAlertData(alert.data);

    // Replace item ID with item name if available
    if (parsedData?.itemId && itemNames[parsedData.itemId]) {
      message = message.replace(parsedData.itemId, `"${itemNames[parsedData.itemId]}"`);
    }

    // Replace location ID with location name if available
    if (parsedData?.locationId && locationNames[parsedData.locationId]) {
      message = message.replace(parsedData.locationId, `"${locationNames[parsedData.locationId]}"`);
    }

    return message;
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'EMERGENCY':
        return <AlertOctagon className="w-4 h-4" />;
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4" />;
      case 'INFO':
        return <Info className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'EMERGENCY':
        return 'text-red-500';
      case 'WARNING':
        return 'text-orange-500';
      case 'INFO':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute right-0 mt-2 w-96 bg-white dark:bg-neutral-800 rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden z-50"
        >
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
                Notifications
              </h3>
            </div>
            {unreadCount > 0 && (
              <span className="text-xs px-2.5 py-1 bg-red-500 text-white rounded-full font-bold">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* Alerts List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 mb-1">
                  All caught up!
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  No new alerts at the moment
                </p>
              </div>
            ) : (
              alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-4 border-b border-neutral-100 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 cursor-pointer transition-colors"
                  onClick={() => handleAlertClick(alert)}
                >
                  <div className="flex items-start gap-3">
                    {/* Alert Icon */}
                    <div className={`flex-shrink-0 mt-0.5 ${getLevelColor(alert.level)}`}>
                      {getLevelIcon(alert.level)}
                    </div>

                    {/* Alert Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 line-clamp-2">
                          {getEnhancedMessage(alert)}
                        </p>
                        <button
                          onClick={(e) => handleAcknowledge(alert.id, e)}
                          className="flex-shrink-0 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-600 rounded transition-colors"
                          title="Acknowledge"
                        >
                          <X className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded">
                          {alert.type.replace('_', ' ')}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          alert.level === 'EMERGENCY'
                            ? 'bg-red-600 text-white dark:bg-red-700 dark:text-white'
                            : alert.level === 'WARNING'
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {alert.level}
                        </span>
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {formatTime(alert.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-2">
              {alerts.length > 0 && (
                <button
                  onClick={handleAcknowledgeAll}
                  className="flex-1 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-semibold transition-colors"
                >
                  <CheckCircle className="w-4 h-4 inline mr-1" />
                  Acknowledge All
                </button>
              )}
              <button
                onClick={handleViewAllAlerts}
                className="flex-1 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg font-semibold transition-colors"
              >
                <Eye className="w-4 h-4 inline mr-1" />
                View All
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Export the unread count hook for use in the Header badge
export const useUnreadAlertCount = () => {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await alertService.getUnacknowledgedAlerts({ page: 0, size: 1 });
        setUnreadCount(response.totalElements);
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return unreadCount;
};
