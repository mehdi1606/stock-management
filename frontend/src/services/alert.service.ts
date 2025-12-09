// frontend/src/services/alert.service.ts
// 🔔 COMPLETE ALERT SERVICE - 100% DYNAMIC WITH ALL BACKEND ENDPOINTS

import { apiClient } from './api';
import { API_ENDPOINTS } from '@/config/constants';
import type { PaginatedResponse, PaginationParams, ApiResponse } from '@/types';

// ==================== TYPES ====================

export interface Alert {
  id: string;
  type: 'LOW_STOCK' | 'OVERSTOCK' | 'EXPIRY' | 'QUALITY' | 'LOCATION' | 'MOVEMENT' | 'SYSTEM';
  level: 'INFO' | 'WARNING' | 'EMERGENCY';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'ESCALATED';
  message: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, any>;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Notification {
  id: string;
  channelType: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'PUSH' | 'BLACK';
  recipient: string;
  subject?: string;
  body: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';
  sentAt?: string;
  deliveredAt?: string;
  retryCount: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
  alertId?: string;
  templateId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  event: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
  frequency: 'REALTIME' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  configuration?: Record<string, any>;
  actions?: string[];
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  channelType: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'PUSH' | 'BLACK';
  settings?: Record<string, any>;
  rateLimitPerHour?: number;
  priority: number;
  isActive: boolean;
  totalNotificationsSent: number;
  successfulNotifications: number;
  failedNotifications: number;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  templateType: 'LOW_STOCK' | 'OVERSTOCK' | 'EXPIRY' | 'QUALITY' | 'LOCATION' | 'MOVEMENT' | 'SYSTEM';
  channel: 'EMAIL' | 'SMS' | 'WEBHOOK' | 'PUSH';
  subject?: string;
  body: string;
  htmlBody?: string;
  requiredVariables?: string[];
  language: string;
  isActive: boolean;
  totalNotificationsSent: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateAlertRequest {
  type: Alert['type'];
  level: Alert['level'];
  message: string;
  entityType?: string;
  entityId?: string;
  data?: Record<string, any>;
}

export interface CreateNotificationRequest {
  channelType: Notification['channelType'];
  recipient: string;
  subject?: string;
  body: string;
  alertId?: string;
  templateId?: string;
}

export interface AlertStatistics {
  totalAlerts: number;
  activeAlerts: number;
  acknowledgedAlerts: number;
  resolvedAlerts: number;
  escalatedAlerts: number;
  byType: Record<string, number>;
  byLevel: Record<string, number>;
  byStatus: Record<string, number>;
  topAlerts: Alert[];
}

export interface NotificationStatistics {
  totalNotifications: number;
  pendingNotifications: number;
  sentNotifications: number;
  deliveredNotifications: number;
  failedNotifications: number;
  byStatus: Record<string, number>;
  byChannel: Record<string, number>;
  successRateByChannel: Record<string, {
    success: number;
    total: number;
    successRate: string;
  }>;
}

// ==================== ALERT SERVICE ====================

export const alertService = {
  // ========== ALERTS ==========

  /**
   * Get paginated list of alerts with optional filters
   */
  getAlerts: async (params?: PaginationParams & {
    type?: string;
    level?: string;
    status?: string;
    entityType?: string;
    acknowledged?: boolean;
  }): Promise<PaginatedResponse<Alert>> => {
    const response = await apiClient.get<PaginatedResponse<Alert>>(
      API_ENDPOINTS.ALERTS.ALERTS,
      { params }
    );
    return response.data;
  },

  /**
   * Get alert by ID
   */
  getAlertById: async (id: string): Promise<Alert> => {
    const response = await apiClient.get<Alert>(API_ENDPOINTS.ALERTS.ALERT_BY_ID(id));
    return response.data;
  },

  /**
   * Create new alert
   */
  createAlert: async (data: CreateAlertRequest): Promise<Alert> => {
    const response = await apiClient.post<Alert>(API_ENDPOINTS.ALERTS.ALERTS, data);
    return response.data;
  },

  /**
   * Update alert
   */
  updateAlert: async (id: string, data: Partial<Alert>): Promise<Alert> => {
    const response = await apiClient.put<Alert>(API_ENDPOINTS.ALERTS.ALERT_BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete alert
   */
  deleteAlert: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.ALERTS.ALERT_BY_ID(id));
  },

  /**
   * Acknowledge alert
   */
  acknowledgeAlert: async (id: string, comment?: string): Promise<Alert> => {
    const response = await apiClient.patch<Alert>(`${API_ENDPOINTS.ALERTS.ALERT_BY_ID(id)}/acknowledge`, {
      comment: comment || 'Acknowledged by user'
    });
    return response.data;
  },

  /**
   * Resolve alert
   */
  resolveAlert: async (id: string, resolutionComment?: string): Promise<Alert> => {
    const response = await apiClient.patch<Alert>(`${API_ENDPOINTS.ALERTS.ALERT_BY_ID(id)}/resolve`, {
      resolutionComment: resolutionComment || 'Resolved by user'
    });
    return response.data;
  },

  /**
   * Escalate alert
   */
  escalateAlert: async (id: string): Promise<Alert> => {
    const response = await apiClient.patch<Alert>(`${API_ENDPOINTS.ALERTS.ALERT_BY_ID(id)}/escalate`);
    return response.data;
  },

  /**
   * Get alerts by type
   */
  getAlertsByType: async (type: Alert['type'], params?: PaginationParams): Promise<PaginatedResponse<Alert>> => {
    const response = await apiClient.get<PaginatedResponse<Alert>>(
      `${API_ENDPOINTS.ALERTS.ALERTS}/by-type/${type}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get alerts by level
   */
  getAlertsByLevel: async (level: Alert['level'], params?: PaginationParams): Promise<PaginatedResponse<Alert>> => {
    const response = await apiClient.get<PaginatedResponse<Alert>>(
      `${API_ENDPOINTS.ALERTS.ALERTS}/by-level/${level}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get alerts by status
   */
  getAlertsByStatus: async (status: Alert['status'], params?: PaginationParams): Promise<PaginatedResponse<Alert>> => {
    const response = await apiClient.get<PaginatedResponse<Alert>>(
      `${API_ENDPOINTS.ALERTS.ALERTS}/by-status/${status}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get active alerts
   */
  getActiveAlerts: async (params?: PaginationParams): Promise<PaginatedResponse<Alert>> => {
    const response = await apiClient.get<PaginatedResponse<Alert>>(
      `${API_ENDPOINTS.ALERTS.ALERTS}/active`,
      { params }
    );
    return response.data;
  },

  /**
   * Get unacknowledged alerts
   */
  getUnacknowledgedAlerts: async (params?: PaginationParams): Promise<PaginatedResponse<Alert>> => {
    const response = await apiClient.get<PaginatedResponse<Alert>>(
      `${API_ENDPOINTS.ALERTS.ALERTS}/unacknowledged`,
      { params }
    );
    return response.data;
  },

  /**
   * Search alerts
   */
  searchAlerts: async (searchParams: {
    type?: string;
    level?: string;
    status?: string;
    entityType?: string;
    entityId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Alert>> => {
    const response = await apiClient.get<PaginatedResponse<Alert>>(
      `${API_ENDPOINTS.ALERTS.ALERTS}/search`,
      { params: searchParams }
    );
    return response.data;
  },

  /**
   * Get alert statistics
   */
  getAlertStatistics: async (): Promise<AlertStatistics> => {
    const response = await apiClient.get<AlertStatistics>(`${API_ENDPOINTS.ALERTS.ALERTS}/statistics`);
    return response.data;
  },

  /**
   * Get alert count
   */
  getAlertCount: async (filters?: {
    type?: string;
    level?: string;
    status?: string;
  }): Promise<number> => {
    const response = await apiClient.get<{ count: number }>(
      `${API_ENDPOINTS.ALERTS.ALERTS}/count`,
      { params: filters }
    );
    return response.data.count;
  },

  // ========== NOTIFICATIONS ==========

  /**
   * Get paginated list of notifications
   */
  getNotifications: async (params?: PaginationParams & {
    status?: string;
    channelType?: string;
    recipient?: string;
    alertId?: string;
  }): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>(
      API_ENDPOINTS.ALERTS.NOTIFICATIONS,
      { params }
    );
    return response.data;
  },

  /**
   * Get notification by ID
   */
  getNotificationById: async (id: string): Promise<Notification> => {
    const response = await apiClient.get<Notification>(API_ENDPOINTS.ALERTS.NOTIFICATION_BY_ID(id));
    return response.data;
  },

  /**
   * Send notification
   */
  sendNotification: async (data: CreateNotificationRequest): Promise<Notification> => {
    const response = await apiClient.post<Notification>(API_ENDPOINTS.ALERTS.NOTIFICATIONS, data);
    return response.data;
  },

  /**
   * Get notifications by status
   */
  getNotificationsByStatus: async (
    status: Notification['status'],
    params?: PaginationParams
  ): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/by-status/${status}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get notifications by channel
   */
  getNotificationsByChannel: async (
    channelType: Notification['channelType'],
    params?: PaginationParams
  ): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/by-channel/${channelType}`,
      { params }
    );
    return response.data;
  },

  /**
   * Get notifications by recipient
   */
  getNotificationsByRecipient: async (recipient: string): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/by-recipient/${recipient}`
    );
    return response.data;
  },

  /**
   * Get notifications by alert
   */
  getNotificationsByAlert: async (alertId: string): Promise<Notification[]> => {
    const response = await apiClient.get<Notification[]>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/by-alert/${alertId}`
    );
    return response.data;
  },

  /**
   * Mark notification as delivered
   */
  markAsDelivered: async (id: string): Promise<Notification> => {
    const response = await apiClient.put<Notification>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATION_BY_ID(id)}/delivered`
    );
    return response.data;
  },

  /**
   * Mark notification as failed
   */
  markAsFailed: async (id: string, errorMessage: string): Promise<Notification> => {
    const response = await apiClient.put<Notification>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATION_BY_ID(id)}/failed`,
      { errorMessage }
    );
    return response.data;
  },

  /**
   * Retry failed notifications
   */
  retryFailedNotifications: async (): Promise<void> => {
    await apiClient.post(`${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/retry-failed`);
  },

  /**
   * Search notifications
   */
  searchNotifications: async (searchParams: {
    status?: string;
    channelType?: string;
    recipient?: string;
    alertId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    size?: number;
  }): Promise<PaginatedResponse<Notification>> => {
    const response = await apiClient.get<PaginatedResponse<Notification>>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/search`,
      { params: searchParams }
    );
    return response.data;
  },

  /**
   * Get notification statistics
   */
  getNotificationStatistics: async (): Promise<NotificationStatistics> => {
    const response = await apiClient.get<NotificationStatistics>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/statistics`
    );
    return response.data;
  },

  // ========== ALERT RULES ==========

  /**
   * Get paginated list of alert rules
   */
  getAlertRules: async (params?: PaginationParams): Promise<PaginatedResponse<AlertRule>> => {
    const response = await apiClient.get<PaginatedResponse<AlertRule>>(
      API_ENDPOINTS.ALERTS.RULES,
      { params }
    );
    return response.data;
  },

  /**
   * Get alert rule by ID
   */
  getAlertRuleById: async (id: string): Promise<AlertRule> => {
    const response = await apiClient.get<AlertRule>(API_ENDPOINTS.ALERTS.RULE_BY_ID(id));
    return response.data;
  },

  /**
   * Create alert rule
   */
  createAlertRule: async (data: Partial<AlertRule>): Promise<AlertRule> => {
    const response = await apiClient.post<AlertRule>(API_ENDPOINTS.ALERTS.RULES, data);
    return response.data;
  },

  /**
   * Update alert rule
   */
  updateAlertRule: async (id: string, data: Partial<AlertRule>): Promise<AlertRule> => {
    const response = await apiClient.put<AlertRule>(API_ENDPOINTS.ALERTS.RULE_BY_ID(id), data);
    return response.data;
  },

  /**
   * Delete alert rule
   */
  deleteAlertRule: async (id: string): Promise<void> => {
    await apiClient.delete(API_ENDPOINTS.ALERTS.RULE_BY_ID(id));
  },

  /**
   * Activate alert rule
   */
  activateAlertRule: async (id: string): Promise<AlertRule> => {
    const response = await apiClient.put<AlertRule>(`${API_ENDPOINTS.ALERTS.RULE_BY_ID(id)}/activate`);
    return response.data;
  },

  /**
   * Deactivate alert rule
   */
  deactivateAlertRule: async (id: string): Promise<AlertRule> => {
    const response = await apiClient.put<AlertRule>(`${API_ENDPOINTS.ALERTS.RULE_BY_ID(id)}/deactivate`);
    return response.data;
  },

  /**
   * Get active alert rules
   */
  getActiveAlertRules: async (): Promise<AlertRule[]> => {
    const response = await apiClient.get<AlertRule[]>(`${API_ENDPOINTS.ALERTS.RULES}/active`);
    return response.data;
  },

  /**
   * Evaluate rule
   */
  evaluateRule: async (id: string, data: Record<string, any>): Promise<{ shouldTrigger: boolean; message?: string }> => {
    const response = await apiClient.post<{ shouldTrigger: boolean; message?: string }>(
      `${API_ENDPOINTS.ALERTS.RULE_BY_ID(id)}/evaluate`,
      data
    );
    return response.data;
  },

  // ========== NOTIFICATION CHANNELS ==========

  /**
   * Get all notification channels
   */
  getNotificationChannels: async (params?: PaginationParams): Promise<PaginatedResponse<NotificationChannel>> => {
    const response = await apiClient.get<PaginatedResponse<NotificationChannel>>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/channels`,
      { params }
    );
    return response.data;
  },

  /**
   * Get notification channel by ID
   */
  getNotificationChannelById: async (id: string): Promise<NotificationChannel> => {
    const response = await apiClient.get<NotificationChannel>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/channels/${id}`
    );
    return response.data;
  },

  /**
   * Create notification channel
   */
  createNotificationChannel: async (data: Partial<NotificationChannel>): Promise<NotificationChannel> => {
    const response = await apiClient.post<NotificationChannel>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/channels`,
      data
    );
    return response.data;
  },

  /**
   * Update notification channel
   */
  updateNotificationChannel: async (id: string, data: Partial<NotificationChannel>): Promise<NotificationChannel> => {
    const response = await apiClient.put<NotificationChannel>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/channels/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete notification channel
   */
  deleteNotificationChannel: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/channels/${id}`);
  },

  /**
   * Get active channels
   */
  getActiveChannels: async (): Promise<NotificationChannel[]> => {
    const response = await apiClient.get<NotificationChannel[]>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/channels/active`
    );
    return response.data;
  },

  // ========== NOTIFICATION TEMPLATES ==========

  /**
   * Get all notification templates
   */
  getNotificationTemplates: async (params?: PaginationParams): Promise<PaginatedResponse<NotificationTemplate>> => {
    const response = await apiClient.get<PaginatedResponse<NotificationTemplate>>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/templates`,
      { params }
    );
    return response.data;
  },

  /**
   * Get notification template by ID
   */
  getNotificationTemplateById: async (id: string): Promise<NotificationTemplate> => {
    const response = await apiClient.get<NotificationTemplate>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/templates/${id}`
    );
    return response.data;
  },

  /**
   * Create notification template
   */
  createNotificationTemplate: async (data: Partial<NotificationTemplate>): Promise<NotificationTemplate> => {
    const response = await apiClient.post<NotificationTemplate>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/templates`,
      data
    );
    return response.data;
  },

  /**
   * Update notification template
   */
  updateNotificationTemplate: async (
    id: string,
    data: Partial<NotificationTemplate>
  ): Promise<NotificationTemplate> => {
    const response = await apiClient.put<NotificationTemplate>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/templates/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete notification template
   */
  deleteNotificationTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/templates/${id}`);
  },

  /**
   * Get active templates
   */
  getActiveTemplates: async (): Promise<NotificationTemplate[]> => {
    const response = await apiClient.get<NotificationTemplate[]>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/templates/active`
    );
    return response.data;
  },

  /**
   * Preview template
   */
  previewTemplate: async (
    id: string,
    variables: Record<string, any>
  ): Promise<{ subject?: string; body: string; htmlBody?: string }> => {
    const response = await apiClient.post<{ subject?: string; body: string; htmlBody?: string }>(
      `${API_ENDPOINTS.ALERTS.NOTIFICATIONS}/templates/${id}/preview`,
      { variables }
    );
    return response.data;
  },
};

export default alertService;
