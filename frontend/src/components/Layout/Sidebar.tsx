import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Boxes, Layers, Tag, Box, Barcode,
  Move, MapPin, Map, Building2, CheckCircle, Menu, X,
  Bell, Settings, Shield, Package, ChevronDown, Users,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { usePermissions } from '@/hooks/usePermissions';
import { PERMISSIONS } from '@/config/permissions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: typeof PERMISSIONS[keyof typeof PERMISSIONS];
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

// ─── Navigation structure ─────────────────────────────────────────────────────

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    icon: LayoutDashboard,
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_VIEW },
    ],
  },
  {
    label: 'Products',
    icon: Boxes,
    items: [
      { name: 'Items',      href: '/products/items',      icon: Boxes,  permission: PERMISSIONS.PRODUCTS_VIEW },
      { name: 'Variants',   href: '/products/variants',   icon: Layers, permission: PERMISSIONS.PRODUCTS_VIEW },
      { name: 'Categories', href: '/products/categories', icon: Tag,    permission: PERMISSIONS.CATEGORIES_VIEW },
    ],
  },
  {
    label: 'Inventory',
    icon: Package,
    items: [
      { name: 'Inventory', href: '/inventory/Inventories', icon: Boxes,   permission: PERMISSIONS.INVENTORY_VIEW },
      { name: 'Lots',      href: '/inventory/lots',        icon: Box,     permission: PERMISSIONS.LOTS_VIEW },
      { name: 'Serials',   href: '/inventory/serials',     icon: Barcode, permission: PERMISSIONS.SERIALS_VIEW },
    ],
  },
  {
    label: 'Locations',
    icon: MapPin,
    items: [
      { name: 'Sites',      href: '/locations/sites',      icon: Map,       permission: PERMISSIONS.LOCATIONS_VIEW },
      { name: 'Warehouses', href: '/locations/warehouses', icon: Building2, permission: PERMISSIONS.LOCATIONS_VIEW },
      { name: 'Locations',  href: '/locations/locations',  icon: MapPin,    permission: PERMISSIONS.LOCATIONS_VIEW },
    ],
  },
  {
    label: 'Movements',
    icon: Move,
    items: [
      { name: 'Movements', href: '/movements', icon: Move, permission: PERMISSIONS.MOVEMENTS_VIEW },
    ],
  },
  {
    label: 'Quality',
    icon: CheckCircle,
    items: [
      { name: 'Controls',    href: '/quality/controls',    icon: CheckCircle, permission: PERMISSIONS.QUALITY_VIEW },
      { name: 'Quarantines', href: '/quality/quarantines', icon: Shield,      permission: PERMISSIONS.QUARANTINE_MANAGE },
      { name: 'Attachments', href: '/quality/attachments', icon: Package,     permission: PERMISSIONS.QUALITY_VIEW },
    ],
  },
  {
    label: 'Alerts',
    icon: Bell,
    items: [
      { name: 'Alerts', href: '/alerts', icon: Bell, permission: PERMISSIONS.ALERTS_VIEW },
    ],
  },
  {
    label: 'Admin',
    icon: Users,
    items: [
      { name: 'Settings', href: '/settings', icon: Settings, permission: PERMISSIONS.SETTINGS_VIEW },
    ],
  },
];

// ─── Single link ──────────────────────────────────────────────────────────────

const NavItemLink = ({ item, onClose }: { item: NavItem; onClose?: () => void }) => {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      onClick={onClose}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-xl transition-all duration-150 relative',
          isActive
            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25'
            : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={cn('w-4 h-4 shrink-0', isActive && 'drop-shadow-sm')} />
          <span className="truncate text-[13px]">{item.name}</span>
          {isActive && (
            <motion.div
              layoutId="sidebar-dot"
              className="absolute right-2.5 w-1.5 h-1.5 rounded-full bg-white/60"
              transition={{ type: 'spring', stiffness: 500, damping: 32 }}
            />
          )}
        </>
      )}
    </NavLink>
  );
};

// ─── Group section ────────────────────────────────────────────────────────────

const NavGroupSection = ({ group, onClose }: { group: NavGroup; onClose?: () => void }) => {
  const { hasAnyPermission } = usePermissions();
  const [collapsed, setCollapsed] = useState(false);
  const GroupIcon = group.icon;

  const visibleItems = group.items.filter(
    item => !item.permission || hasAnyPermission(item.permission),
  );

  if (visibleItems.length === 0) return null;

  // Groups with a single item get no header chrome (Dashboard, Movements, Alerts, Admin)
  const isFlat = group.items.length === 1;

  if (isFlat) {
    return <NavItemLink item={visibleItems[0]} onClose={onClose} />;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-2 py-1 mb-1 group"
      >
        <div className="flex items-center gap-1.5">
          <GroupIcon className="w-3 h-3 text-neutral-400 dark:text-neutral-600" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-600 group-hover:text-neutral-600 dark:group-hover:text-neutral-400 transition-colors">
            {group.label}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-3 h-3 text-neutral-400 dark:text-neutral-600 transition-transform duration-200',
            collapsed && '-rotate-90',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeInOut' }}
            className="overflow-hidden space-y-0.5"
          >
            {visibleItems.map(item => (
              <NavItemLink key={item.href} item={item} onClose={onClose} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Sidebar body ─────────────────────────────────────────────────────────────

const SidebarBody = ({ onClose }: { onClose?: () => void }) => {
  const { roles, isAdmin } = usePermissions();

  const roleLabel = isAdmin
    ? 'Administrator'
    : (roles[0] ?? 'USER').replace(/_/g, ' ');

  const roleGradient = isAdmin
    ? 'from-purple-600 to-indigo-600'
    : 'from-blue-600 to-indigo-600';

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-4 pt-4 pb-3 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-3">
          <div className={cn('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg', roleGradient)}>
            <Package className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-900 dark:text-neutral-50 leading-none">StockMS</p>
            <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 mt-0.5 capitalize">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-700">
        {NAV_GROUPS.map(group => (
          <NavGroupSection key={group.label} group={group} onClose={onClose} />
        ))}
      </nav>

      {/* Role pill */}
      <div className="p-3 border-t border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60">
          <div className={cn('w-2 h-2 rounded-full bg-gradient-to-br shrink-0', roleGradient)} />
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 dark:text-neutral-600">Role</p>
            <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300 truncate capitalize">{roleLabel}</p>
          </div>
          <Shield className="w-3.5 h-3.5 text-neutral-300 dark:text-neutral-600 shrink-0" />
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <motion.button
        whileTap={{ scale: 0.88 }}
        onClick={() => setIsOpen(o => !o)}
        className="lg:hidden fixed top-3.5 left-4 z-50 p-2 bg-white dark:bg-neutral-900 rounded-xl shadow-md border border-neutral-200/60 dark:border-neutral-700/60"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </motion.button>

      {/* Desktop */}
      <aside className="hidden lg:flex flex-col fixed top-16 left-0 h-[calc(100vh-4rem)] w-60 bg-white/98 dark:bg-neutral-900/98 backdrop-blur-xl border-r border-neutral-100 dark:border-neutral-800 z-40">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="lg:hidden fixed top-16 left-0 h-[calc(100vh-4rem)] w-60 bg-white/98 dark:bg-neutral-900/98 backdrop-blur-xl border-r border-neutral-100 dark:border-neutral-800 z-40 shadow-2xl flex flex-col"
            >
              <SidebarBody onClose={() => setIsOpen(false)} />
            </motion.aside>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/25 backdrop-blur-[2px] z-30"
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
};
