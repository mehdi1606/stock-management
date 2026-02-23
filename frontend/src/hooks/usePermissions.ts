import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
  type Permission,
  type RoleName,
} from '@/config/permissions';

export function usePermissions() {
  const { user } = useAppSelector((state) => state.auth);

  const roles: RoleName[] = useMemo(() => {
    if (!user) return [];
    const raw: string[] = user.roles ?? (user.role ? [user.role] : []);
    return raw.map(r => r.toUpperCase().replace(/^ROLE_/, '') as RoleName);
  }, [user]);

  const permissions: Set<Permission> = useMemo(() => {
    const set = new Set<Permission>();
    for (const role of roles) {
      const perms = ROLE_PERMISSIONS[role] ?? [];
      for (const p of perms) set.add(p);
    }
    return set;
  }, [roles]);

  const hasPermission = (permission: Permission): boolean =>
    permissions.has(permission);

  const hasAnyPermission = (...perms: Permission[]): boolean =>
    perms.some(p => permissions.has(p));

  const hasAllPermissions = (...perms: Permission[]): boolean =>
    perms.every(p => permissions.has(p));

  const hasRole = (role: RoleName): boolean => roles.includes(role);

  const isAdmin    = roles.includes(ROLES.ADMIN);
  const isManager  = isAdmin || roles.includes(ROLES.MANAGER);
  const isAuditor  = isAdmin || roles.includes(ROLES.AUDITOR);
  const isWarehouseManager = isAdmin || roles.includes(ROLES.WAREHOUSE_MANAGER);
  const isQualityManager   = isAdmin || roles.includes(ROLES.QUALITY_MANAGER);
  const isSupervisor = isAdmin || isManager || roles.includes(ROLES.SUPERVISOR);

  return {
    roles,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    isAdmin,
    isManager,
    isAuditor,
    isWarehouseManager,
    isQualityManager,
    isSupervisor,
    // shorthand checkers from PERMISSIONS const for external use
    can: hasPermission,
  };
}
