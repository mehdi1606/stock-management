  // frontend/src/config/constants.ts
  
  export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  
  export const API_ENDPOINTS = {
    // Auth
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      REFRESH: '/api/auth/refresh',
      LOGOUT: '/api/auth/logout',
      ME: '/api/auth/me',
      VERIFY_EMAIL: '/api/auth/verify-email',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      RESET_PASSWORD: '/api/auth/reset-password',
      CHANGE_PASSWORD: '/api/auth/change-password',
    },

    // Users
    USERS: {
      USERS: '/api/users',
      USER_BY_ID: (id: string) => `/api/users/${id}`,
      CURRENT_USER: '/api/users/me',
      PREFERENCES: '/api/users/preferences',
    },
  
    // Products
    PRODUCTS: {
      ITEMS: '/api/items',
      ITEM_BY_ID: (id: string) => `/api/items/${id}`,
      CATEGORIES: '/api/categories',
      CATEGORY_BY_ID: (id: string) => `/api/categories/${id}`,
      ITEM_VARIANTS: '/api/item-variants',
      ITEM_VARIANT_BY_ID: (id: string) => `/api/item-variants/${id}`,
    },
  
    // Inventory
    INVENTORY: {
      INVENTORY: '/api/inventory',
      INVENTORY_BY_ID: (id: string) => `/api/inventory/${id}`,
      LOTS: '/api/lots',
      LOT_BY_ID: (id: string) => `/api/lots/${id}`,
      SERIALS: '/api/serials',
      SERIAL_BY_ID: (id: string) => `/api/serials/${id}`,
    },
  
    // Movements
    MOVEMENTS: {
      MOVEMENTS: '/api/movements',
      MOVEMENT_BY_ID: (id: string) => `/api/movements/${id}`,
      MOVEMENT_LINES: '/api/movement-lines',
      MOVEMENT_LINE_BY_ID: (id: string) => `/api/movement-lines/${id}`,
      MOVEMENT_TASKS: '/api/movement-tasks',
      MOVEMENT_TASK_BY_ID: (id: string) => `/api/movement-tasks/${id}`,
    },
  
    // Locations
    LOCATIONS: {
      SITES: '/api/sites',
      SITE_BY_ID: (id: string) => `/api/sites/${id}`,
      WAREHOUSES: '/api/warehouses',
      WAREHOUSE_BY_ID: (id: string) => `/api/warehouses/${id}`,
      LOCATIONS: '/api/locations',
      LOCATION_BY_ID: (id: string) => `/api/locations/${id}`,
    },
  
    // Quality
    QUALITY: {
      QUALITY_CONTROLS: '/api/quality/controls', // ✅ NOT /api/quality-controls
      QUALITY_CONTROL_BY_ID: (id: string) => `/api/quality/controls/${id}`,
      QUARANTINE: '/api/quality/quarantine',
      QUARANTINE_BY_ID: (id: string) => `/api/quality/quarantine/${id}`,
      ATTACHMENTS: '/api/quality/attachments',
      ATTACHMENT_BY_ID: (id: string) => `/api/quality/attachments/${id}`,
    },
  
    // Alerts
    ALERTS: {
      ALERTS: '/api/alerts',
      ALERT_BY_ID: (id: string) => `/api/alerts/${id}`,
      NOTIFICATIONS: '/api/notifications',
      NOTIFICATION_BY_ID: (id: string) => `/api/notifications/${id}`,
      RULES: '/api/alert-rules',
      RULE_BY_ID: (id: string) => `/api/alert-rules/${id}`,
      CHANNELS: '/api/notification-channels',
      CHANNEL_BY_ID: (id: string) => `/api/notification-channels/${id}`,
      TEMPLATES: '/api/notification-templates',
      TEMPLATE_BY_ID: (id: string) => `/api/notification-templates/${id}`,
    },
  };
  
  export const STORAGE_KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER: 'user',
    THEME: 'theme',
    LANGUAGE: 'language',
  } as const;
  
  export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    VERIFY_EMAIL: '/verify-email',
    FORGOT_PASSWORD: '/forgot-password',
    RESET_PASSWORD: '/reset-password',
    DASHBOARD: '/dashboard',
    
    // Products
    PRODUCTS: '/products',
    PRODUCTS_ITEMS: '/products/items',
    PRODUCTS_ITEM_VARIANTS: '/products/item-variants',
    CATEGORIES: '/categories',
    PRODUCT_DETAIL: (id: string) => `/products/${id}`,
    
    // Inventory
    INVENTORY: '/inventory',
    INVENTORY_LOTS: '/inventory/lots',
    INVENTORY_SERIALS: '/inventory/serials',
    
    // Movements
    MOVEMENTS: '/movements',
    MOVEMENT_DETAIL: (id: string) => `/movements/${id}`,
    
    // Locations
    LOCATIONS: '/locations',
    LOCATIONS_SITES: '/locations/sites',
    LOCATIONS_WAREHOUSES: '/locations/warehouses',
    
    // Quality
    QUALITY: '/quality',
    QUALITY_CONTROLS: '/quality/controls',
    QUARANTINE: '/quality/quarantine',
    
    // Alerts
    ALERTS: '/alerts',
    NOTIFICATIONS: '/alerts/notifications',
    
    // Settings
    PROFILE: '/profile',
    SETTINGS: '/settings',
  } as const;
  
  export const APP_CONFIG = {
    APP_NAME: import.meta.env.VITE_APP_NAME || 'Stock Management System',
    APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100,
    DEBOUNCE_DELAY: 500,
    REQUEST_TIMEOUT: 30000,
  } as const;
  
  export const DATE_FORMATS = {
    DISPLAY: 'PPp',
    DATE_ONLY: 'PP',
    TIME_ONLY: 'p',
    ISO: "yyyy-MM-dd'T'HH:mm:ss",
    DATE_INPUT: 'yyyy-MM-dd',
    DATETIME_INPUT: "yyyy-MM-dd'T'HH:mm",
  } as const;
  
  export default {
    API_BASE_URL,
    API_ENDPOINTS,
    STORAGE_KEYS,
    ROUTES,
    APP_CONFIG,
    DATE_FORMATS,
  };