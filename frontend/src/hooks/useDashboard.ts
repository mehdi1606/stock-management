// frontend/src/hooks/useDashboard.ts
// Dynamic dashboard data hook - fetches from all backend services safely

import { useEffect, useState, useCallback } from 'react';
import { productService } from '@/services/product.service';
import { inventoryService } from '@/services/inventory.service';
import { movementService } from '@/services/movement.service';
import { alertService } from '@/services/alert.service';
import { locationService } from '@/services/location.service';
import { qualityService } from '@/services/quality.service';
import { apiClient } from '@/services/api';
import { API_ENDPOINTS } from '@/config/constants';
import type { Movement } from '@/types';
import type { AlertStatistics } from '@/services/alert.service';

// ============================================================
// HELPERS — works with BOTH Spring Page and plain List responses
// ============================================================

/**
 * Spring Page  → { content: [...], totalElements: N, totalPages: N, ... }
 * Plain List   → [item1, item2, ...]
 *
 * countOf() extracts the total count from either format.
 */
function countOf(res: any): number {
  if (res == null) return 0;
  // Spring Page: { content: [...], totalElements: N }
  if (!Array.isArray(res) && typeof res?.totalElements === 'number') {
    return res.totalElements;
  }
  // Wrapped page: { data: { content: [...], totalElements: N } }
  if (!Array.isArray(res) && typeof res?.data?.totalElements === 'number') {
    return res.data.totalElements;
  }
  // Plain array (List<T>)
  if (Array.isArray(res)) {
    return res.length;
  }
  return 0;
}

/**
 * contentOf() extracts the items array from either a Page or a plain List.
 */
function contentOf<T>(res: any): T[] {
  if (res == null) return [];
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res?.content)) return res.content as T[];
  if (Array.isArray(res?.data?.content)) return res.data.content as T[];
  return [];
}

// ============================================================
// TYPES  (must match exactly what DashboardPage.tsx uses)
// ============================================================

export interface DashboardStats {
  totalItems: number;
  totalCategories: number;
  totalVariants: number;
  totalInventory: number;
  lowStockItems: number;
  totalLots: number;
  totalSerials: number;
  totalMovements: number;
  pendingMovements: number;
  inProgressMovements: number;
  completedMovements: number;
  overdueMovements: number;
  totalSites: number;
  totalWarehouses: number;
  totalLocations: number;
  totalQualityControls: number;
  pendingQualityControls: number;
  passedQualityControls: number;
  failedQualityControls: number;
  totalQuarantines: number;
  activeQuarantines: number;
  totalAlerts: number;
  activeAlerts: number;
  criticalAlerts: number;
  unacknowledgedAlerts: number;
  alertsByType: Record<string, number>;
  alertsByLevel: Record<string, number>;
  totalUsers: number;
  activeUsers: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface RecentMovement {
  id: string;
  referenceNumber?: string;
  type: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface RecentAlert {
  id: string;
  type: string;
  level: string;
  status: string;
  message: string;
  createdAt: string;
}

export interface LowStockItem {
  id: string;
  itemId: string;
  itemName?: string;
  quantityOnHand: number;
  quantityAvailable: number;
  locationId: string;
}

export interface MovementByType {
  name: string;
  count: number;
  color: string;
}

export interface StockDistribution {
  name: string;
  value: number;
  color: string;
}

export interface AlertDistribution {
  name: string;
  value: number;
  color: string;
}

export interface DashboardData {
  stats: DashboardStats;
  recentMovements: RecentMovement[];
  recentAlerts: RecentAlert[];
  lowStockItems: LowStockItem[];
  movementsByType: MovementByType[];
  stockDistribution: StockDistribution[];
  alertDistribution: AlertDistribution[];
  alertStats: AlertStatistics | null;
}

// ============================================================
// EMPTY DEFAULTS
// ============================================================

const EMPTY_STATS: DashboardStats = {
  totalItems: 0, totalCategories: 0, totalVariants: 0,
  totalInventory: 0, lowStockItems: 0, totalLots: 0, totalSerials: 0,
  totalMovements: 0, pendingMovements: 0, inProgressMovements: 0,
  completedMovements: 0, overdueMovements: 0,
  totalSites: 0, totalWarehouses: 0, totalLocations: 0,
  totalQualityControls: 0, pendingQualityControls: 0, passedQualityControls: 0,
  failedQualityControls: 0, totalQuarantines: 0, activeQuarantines: 0,
  totalAlerts: 0, activeAlerts: 0, criticalAlerts: 0, unacknowledgedAlerts: 0,
  alertsByType: {}, alertsByLevel: {},
  totalUsers: 0, activeUsers: 0,
  pendingTasks: 0, overdueTasks: 0,
};

export const EMPTY_DASHBOARD: DashboardData = {
  stats: EMPTY_STATS,
  recentMovements: [],
  recentAlerts: [],
  lowStockItems: [],
  movementsByType: [],
  stockDistribution: [],
  alertDistribution: [],
  alertStats: null,
};

// ============================================================
// SAFE FETCH - never throws, returns null on any error
// ============================================================

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch {
    return null;
  }
}

// ============================================================
// HOOK
// ============================================================

export const useDashboard = (userRoles: string[] = []) => {
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const isManager = userRoles.some(r =>
    r.toUpperCase().includes('ADMIN') || r.toUpperCase().includes('MANAGER')
  );

  const fetchDashboardData = useCallback(async () => {
    // ── Guard: never fetch without a valid token ──────────────────────
    const token = localStorage.getItem('access_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // ── Batch 1: core counts ─────────────────────────────────────────
    //
    //  IMPORTANT — backend response types:
    //  • product-service:   GET /api/items|categories|item-variants  → List<T>  (plain array)
    //  • inventory-service: GET /api/inventory|lots|serials           → List<T>  (plain array)
    //  • location-service:  GET /api/locations|sites|warehouses       → List<T>  (plain array)
    //  • movement-service:  GET /api/movements/**                     → Page<T>  (has totalElements)
    //  • quality-service:   GET /api/quality/**                       → Page<T>  (has totalElements)
    //  • alert-service:     GET /api/alerts/**                        → PageResponse<T> (has totalElements)
    //
    //  countOf() handles all three cases transparently.
    //
    const [
      itemsRes,
      categoriesRes,
      variantsRes,
      inventoryRes,
      lotsRes,
      serialsRes,
      movementsRes,
      pendingMovRes,
      inProgressMovRes,
      completedMovRes,
      sitesRes,
      warehousesRes,
      locationsRes,
      alertsRes,
      activeAlertsRes,
      unacknowledgedAlertsRes,
      alertStatsRes,
      qcRes,
      quarantineRes,
    ] = await Promise.all([
      // product-service returns plain List — no pagination params needed
      safe(() => productService.getItems()),
      safe(() => productService.getCategories()),
      safe(() => productService.getItemVariants()),
      // inventory-service returns plain List
      safe(() => inventoryService.getAllInventories()),
      safe(() => inventoryService.getAllLots()),
      safe(() => inventoryService.getAllSerials()),
      // movement-service returns Page — size:1 gives totalElements cheaply
      safe(() => movementService.getMovements({ size: 1 })),
      safe(() => movementService.getMovementsByStatus('PENDING' as any,      { size: 1 })),
      safe(() => movementService.getMovementsByStatus('IN_PROGRESS' as any,  { size: 1 })),
      safe(() => movementService.getMovementsByStatus('COMPLETED' as any,    { size: 1 })),
      // location-service returns plain List
      safe(() => locationService.getSites()),
      safe(() => locationService.getWarehouses()),
      safe(() => locationService.getLocations()),
      // alert-service returns PageResponse
      safe(() => alertService.getAlerts({ size: 1 })),
      safe(() => alertService.getActiveAlerts({ size: 1 })),
      safe(() => alertService.getUnacknowledgedAlerts({ size: 1 })),
      safe(() => alertService.getAlertStatistics()),
      // quality-service returns Page
      safe(() => qualityService.getQualityControls({ size: 1 })),
      safe(() => qualityService.getQuarantines({ size: 1 })),
    ]);

    // ── Batch 2: low stock + recent data ─────────────────────────────
    const [lowStockRes, recentMovementsRes, recentAlertsRes] = await Promise.all([
      safe(() => inventoryService.getLowStockItems(10)),   // plain array
      safe(() => movementService.getMovements({ size: 8 })), // Page
      safe(() => alertService.getAlerts({ size: 8 })),       // PageResponse
    ]);

    // ── Batch 3: movement breakdown by type ──────────────────────────
    const movTypes = [
      { key: 'RECEIPT',    color: '#4CAF50' },
      { key: 'ISSUE',      color: '#EF5350' },
      { key: 'TRANSFER',   color: '#2196F3' },
      { key: 'ADJUSTMENT', color: '#FF9800' },
      { key: 'RETURN',     color: '#9C27B0' },
      { key: 'PICKING',    color: '#00BCD4' },
    ] as const;

    const movTypeResults = await Promise.all(
      movTypes.map(t =>
        safe(() => movementService.getMovementsByType(t.key as any, { size: 1 } as any))
      )
    );

    // ── Batch 4: admin/manager — user counts ─────────────────────────
    let usersRes = null;
    let activeUsersRes = null;
    if (isManager) {
      [usersRes, activeUsersRes] = await Promise.all([
        safe(() => apiClient.get(`${API_ENDPOINTS.USERS.USERS}?size=1`)),
        safe(() => apiClient.get(`${API_ENDPOINTS.USERS.USERS}/active?size=1`)),
      ]);
    }

    // ── Low-stock array (plain array from inventory-service) ─────────
    const lowStockArray: any[] = Array.isArray(lowStockRes) ? lowStockRes : [];
    const lowStockCount = lowStockArray.length;

    // ── Build stats ───────────────────────────────────────────────────
    const stats: DashboardStats = {
      // countOf() works whether the response is a plain array OR a Page
      totalItems:        countOf(itemsRes),
      totalCategories:   countOf(categoriesRes),
      totalVariants:     countOf(variantsRes),
      totalInventory:    countOf(inventoryRes),
      lowStockItems:     lowStockCount,
      totalLots:         countOf(lotsRes),
      totalSerials:      countOf(serialsRes),
      totalMovements:    countOf(movementsRes),
      pendingMovements:  countOf(pendingMovRes),
      inProgressMovements: countOf(inProgressMovRes),
      completedMovements:  countOf(completedMovRes),
      overdueMovements:  0,
      totalSites:        countOf(sitesRes),
      totalWarehouses:   countOf(warehousesRes),
      totalLocations:    countOf(locationsRes),
      totalQualityControls:   countOf(qcRes),
      pendingQualityControls: 0,
      passedQualityControls:  0,
      failedQualityControls:  0,
      totalQuarantines:  countOf(quarantineRes),
      activeQuarantines: 0,
      totalAlerts:          countOf(alertsRes),
      activeAlerts:         countOf(activeAlertsRes),
      criticalAlerts:       alertStatsRes?.byLevel?.['EMERGENCY'] ?? 0,
      unacknowledgedAlerts: countOf(unacknowledgedAlertsRes),
      alertsByType:  alertStatsRes?.byType  ?? {},
      alertsByLevel: alertStatsRes?.byLevel ?? {},
      totalUsers:  countOf((usersRes as any)?.data),
      activeUsers: countOf((activeUsersRes as any)?.data),
      pendingTasks: 0,
      overdueTasks: 0,
    };

    // ── Movement breakdown by type ────────────────────────────────────
    const movementsByType: MovementByType[] = movTypes.map((t, i) => ({
      name:  t.key.charAt(0) + t.key.slice(1).toLowerCase(),
      count: countOf(movTypeResults[i]),
      color: t.color,
    }));

    // ── Stock distribution ────────────────────────────────────────────
    const inStock = Math.max(0, stats.totalInventory - lowStockCount);
    const stockDistribution: StockDistribution[] = [
      { name: 'In Stock',    value: inStock,                color: '#4CAF50' },
      { name: 'Low Stock',   value: lowStockCount,          color: '#FFA726' },
      { name: 'Quarantined', value: stats.totalQuarantines, color: '#EF5350' },
    ].filter(d => d.value > 0);

    // ── Alert distribution ────────────────────────────────────────────
    const byStatus = alertStatsRes?.byStatus ?? {};
    const alertDistribution: AlertDistribution[] = [
      { name: 'Active',       value: byStatus['ACTIVE']       ?? stats.activeAlerts, color: '#EF5350' },
      { name: 'Acknowledged', value: byStatus['ACKNOWLEDGED'] ?? 0,                  color: '#2196F3' },
      { name: 'Resolved',     value: byStatus['RESOLVED']     ?? 0,                  color: '#4CAF50' },
      { name: 'Escalated',    value: byStatus['ESCALATED']    ?? 0,                  color: '#FF9800' },
    ].filter(d => d.value > 0);

    // ── Recent movements ──────────────────────────────────────────────
    const recentMovements: RecentMovement[] = contentOf<Movement>(recentMovementsRes)
      .slice(0, 8)
      .map((m: Movement) => ({
        id: m.id,
        referenceNumber: m.referenceNumber,
        type: m.type,
        status: m.status,
        priority: m.priority,
        createdAt: m.createdAt,
      }));

    // ── Recent alerts ─────────────────────────────────────────────────
    const recentAlerts: RecentAlert[] = contentOf<any>(recentAlertsRes)
      .slice(0, 8)
      .map((a: any) => ({
        id: a.id,
        type: a.type,
        level: a.level ?? a.severity,
        status: a.status,
        message: a.message,
        createdAt: a.createdAt ?? a.triggeredAt,
      }));

    // ── Low stock items ───────────────────────────────────────────────
    const lowStockItems: LowStockItem[] = lowStockArray.slice(0, 10).map((inv: any) => ({
      id: inv.id,
      itemId: inv.itemId,
      itemName: inv.item?.name ?? inv.itemName,
      quantityOnHand: inv.quantityOnHand,
      quantityAvailable: inv.quantityAvailable,
      locationId: inv.locationId,
    }));

    setData({
      stats,
      recentMovements,
      recentAlerts,
      lowStockItems,
      movementsByType,
      stockDistribution,
      alertDistribution,
      alertStats: alertStatsRes,
    });

    setLastUpdated(new Date());
    setIsLoading(false);
  }, [isManager]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Listen for auto-refresh events dispatched by SettingsContext
  useEffect(() => {
    const handler = () => fetchDashboardData();
    window.addEventListener('dashboard:refresh', handler);
    return () => window.removeEventListener('dashboard:refresh', handler);
  }, [fetchDashboardData]);

  return { data, isLoading, lastUpdated, refresh: fetchDashboardData };
};
