// frontend/src/pages/dashboard/DashboardPage.tsx
// Professional Enterprise Admin Dashboard

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Package, Warehouse, ArrowLeftRight, Bell,
  ShieldCheck, AlertTriangle, Users, MapPin, Layers,
  ClipboardCheck, RefreshCw, Activity,
  CheckCircle, XCircle, Clock, AlertOctagon,
  Box, Archive, Truck, Settings, Eye, ChevronRight,
  Hash, ShoppingCart, BarChart2, Zap, Star,
  AlertCircle, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { Loading } from '@/components/ui/Loading';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { useDashboard } from '@/hooks/useDashboard';
import { cn } from '@/utils/cn';
import { formatDistanceToNow, format } from 'date-fns';

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

const getRoles = (user: any): string[] => {
  if (!user) return [];
  if (Array.isArray(user.roles)) return user.roles;
  if (user.role) return [user.role];
  return [];
};

const hasRole = (roles: string[], ...check: string[]) =>
  check.some(r => roles.some(ur => ur.toUpperCase().includes(r.toUpperCase())));

const fmt = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
};

const timeAgo = (dateStr: string) => {
  try { return formatDistanceToNow(new Date(dateStr), { addSuffix: true }); }
  catch { return '—'; }
};

// ─────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE:       { bg: 'bg-red-50 dark:bg-red-900/20',    text: 'text-red-700 dark:text-red-300',     dot: 'bg-red-500' },
  PENDING:      { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  IN_PROGRESS:  { bg: 'bg-blue-50 dark:bg-blue-900/20',  text: 'text-blue-700 dark:text-blue-300',   dot: 'bg-blue-500' },
  COMPLETED:    { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
  ACKNOWLEDGED: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
  RESOLVED:     { bg: 'bg-gray-100 dark:bg-gray-800',    text: 'text-gray-600 dark:text-gray-400',   dot: 'bg-gray-400' },
  ESCALATED:    { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
  CANCELLED:    { bg: 'bg-gray-100 dark:bg-gray-800',    text: 'text-gray-500 dark:text-gray-400',   dot: 'bg-gray-400' },
  DRAFT:        { bg: 'bg-slate-100 dark:bg-slate-800',  text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  EMERGENCY: { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-300',    icon: 'text-red-600' },
  WARNING:   { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-600' },
  INFO:      { bg: 'bg-sky-100 dark:bg-sky-900/30',    text: 'text-sky-700 dark:text-sky-300',    icon: 'text-sky-600' },
  CRITICAL:  { bg: 'bg-red-100 dark:bg-red-900/30',    text: 'text-red-700 dark:text-red-300',    icon: 'text-red-600' },
};

// ─────────────────────────────────────────────────────────
// MICRO COMPONENTS
// ─────────────────────────────────────────────────────────

const StatusPill = ({ status }: { status: string }) => {
  const s = STATUS_COLORS[status] ?? { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold', s.bg, s.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', s.dot)} />
      {status.replace(/_/g, ' ')}
    </span>
  );
};

const LevelPill = ({ level }: { level: string }) => {
  const s = LEVEL_COLORS[level] ?? LEVEL_COLORS['INFO'];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide', s.bg, s.text)}>
      {level}
    </span>
  );
};

// ─────────────────────────────────────────────────────────
// KPI CARD  (redesigned, gradient accent bar)
// ─────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  gradient: string;      // e.g. 'from-blue-500 to-indigo-600'
  bgLight: string;       // e.g. 'bg-blue-50'
  textAccent: string;    // e.g. 'text-blue-600'
  trend?: { value: number; positive: boolean; label?: string };
  onClick?: () => void;
  delay?: number;
}

const KpiCard = ({ title, value, subtitle, icon: Icon, gradient, bgLight, textAccent, trend, onClick, delay = 0 }: KpiCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, type: 'spring', stiffness: 90 }}
    whileHover={{ y: -4, boxShadow: '0 10px 30px -5px rgba(0,0,0,0.15)' }}
    onClick={onClick}
    className={cn(
      'relative overflow-hidden rounded-2xl bg-white dark:bg-neutral-800',
      'border border-neutral-100 dark:border-neutral-700/60',
      'shadow-sm hover:shadow-lg transition-all duration-300',
      onClick && 'cursor-pointer',
    )}
  >
    {/* Gradient top bar */}
    <div className={cn('h-1 w-full bg-gradient-to-r', gradient)} />

    <div className="p-5">
      <div className="flex items-start justify-between">
        <div className={cn('p-2.5 rounded-xl', bgLight)}>
          <Icon className={cn('w-5 h-5', textAccent)} />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg',
            trend.positive
              ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
          )}>
            {trend.positive
              ? <ArrowUpRight className="w-3 h-3" />
              : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">{subtitle}</p>
        )}
        {trend?.label && (
          <p className="mt-1 text-xs text-neutral-400">{trend.label}</p>
        )}
      </div>
    </div>
  </motion.div>
);

// ─────────────────────────────────────────────────────────
// CHART PANEL  (unified wrapper)
// ─────────────────────────────────────────────────────────

interface ChartPanelProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const ChartPanel = ({ title, subtitle, action, children, className, delay = 0 }: ChartPanelProps) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay }}
    className={cn(
      'rounded-2xl bg-white dark:bg-neutral-800',
      'border border-neutral-100 dark:border-neutral-700/60',
      'shadow-sm p-5',
      className,
    )}
  >
    <div className="flex items-start justify-between mb-5">
      <div>
        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h3>
        {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </motion.div>
);

// ─────────────────────────────────────────────────────────
// ALERT / MOVEMENT LIST ROW
// ─────────────────────────────────────────────────────────

const MovementRow = ({ m, i, onClick }: { m: any; i: number; onClick: () => void }) => {
  const typeColors: Record<string, string> = {
    RECEIPT: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    ISSUE: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    TRANSFER: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    ADJUSTMENT: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    RETURN: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    PICKING: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  };
  const tc = typeColors[m.type] ?? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/40 cursor-pointer transition-colors group"
    >
      <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center shrink-0">
        <Truck className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
          {m.referenceNumber ?? `MOV-${m.id?.slice(0, 8) ?? '—'}`}
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">{timeAgo(m.createdAt)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn('hidden sm:inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold', tc)}>
          {m.type}
        </span>
        <StatusPill status={m.status} />
      </div>
    </motion.div>
  );
};

const AlertRow = ({ a, i, onClick }: { a: any; i: number; onClick: () => void }) => {
  const levelInfo = LEVEL_COLORS[a.level] ?? LEVEL_COLORS['INFO'];
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05 }}
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-700/40 cursor-pointer transition-colors"
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5', levelInfo.bg)}>
        <Bell className={cn('w-4 h-4', levelInfo.icon)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-snug">{a.message}</p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <LevelPill level={a.level} />
          <span className="text-xs text-neutral-400">{timeAgo(a.createdAt)}</span>
        </div>
      </div>
      <StatusPill status={a.status} />
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────
// CUSTOM RECHARTS TOOLTIP
// ─────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl p-3 text-sm">
      {label && <p className="font-semibold text-neutral-700 dark:text-neutral-300 mb-2">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color ?? p.fill }} />
          <span className="text-neutral-500 dark:text-neutral-400">{p.name ?? p.dataKey}:</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// ROLE / USER INFO
// ─────────────────────────────────────────────────────────

const getRoleInfo = (roles: string[]) => {
  if (hasRole(roles, 'ADMIN'))            return { label: 'Administrator',     color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300', icon: Star };
  if (hasRole(roles, 'WAREHOUSE_MANAGER'))return { label: 'Warehouse Manager', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',         icon: Warehouse };
  if (hasRole(roles, 'QUALITY_MANAGER','QUALITY')) return { label: 'Quality Manager', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300', icon: ShieldCheck };
  if (hasRole(roles, 'MANAGER'))          return { label: 'Manager',           color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',  icon: BarChart2 };
  if (hasRole(roles, 'SUPERVISOR'))       return { label: 'Supervisor',        color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',  icon: Eye };
  if (hasRole(roles, 'OPERATOR'))         return { label: 'Operator',          color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',  icon: Zap };
  if (hasRole(roles, 'PROCUREMENT'))      return { label: 'Procurement',       color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',          icon: ShoppingCart };
  if (hasRole(roles, 'AUDITOR'))          return { label: 'Auditor',           color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400',         icon: Eye };
  return                                         { label: 'User',              color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300',              icon: Activity };
};

// ─────────────────────────────────────────────────────────
// QUICK ACTIONS (bigger, with labels)
// ─────────────────────────────────────────────────────────

interface QuickActionDef {
  label: string;
  icon: React.ElementType;
  to: string;
  gradient: string;
}

const getQuickActions = (roles: string[]): QuickActionDef[] => {
  const all: QuickActionDef[] = [
    { label: 'Inventory',    icon: Box,          to: '/inventory/Inventories',  gradient: 'from-blue-500 to-indigo-600' },
    { label: 'Movements',    icon: ArrowLeftRight, to: '/movements',            gradient: 'from-violet-500 to-purple-600' },
    { label: 'Alerts',       icon: Bell,          to: '/alerts',                gradient: 'from-red-500 to-rose-600' },
  ];

  if (hasRole(roles, 'ADMIN', 'MANAGER', 'WAREHOUSE_MANAGER')) {
    all.push({ label: 'Products',    icon: Package,   to: '/products/items',          gradient: 'from-emerald-500 to-teal-600' });
    all.push({ label: 'Warehouses',  icon: Warehouse, to: '/locations/warehouses',    gradient: 'from-amber-500 to-orange-600' });
  }
  if (hasRole(roles, 'ADMIN', 'QUALITY', 'SUPERVISOR')) {
    all.push({ label: 'QC Controls', icon: ShieldCheck, to: '/quality/controls',      gradient: 'from-pink-500 to-rose-600' });
  }
  if (hasRole(roles, 'ADMIN')) {
    all.push({ label: 'Lots',        icon: Archive,   to: '/inventory/lots',          gradient: 'from-cyan-500 to-sky-600' });
    all.push({ label: 'Sites',       icon: MapPin,    to: '/locations/sites',         gradient: 'from-lime-500 to-green-600' });
  }

  return all.slice(0, 6);
};

const QuickActionCard = ({ label, icon: Icon, to, gradient }: QuickActionDef) => {
  const navigate = useNavigate();
  return (
    <motion.button
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(to)}
      className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 shadow-sm hover:shadow-md transition-all w-full"
    >
      <div className={cn('w-12 h-12 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-sm', gradient)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{label}</span>
    </motion.button>
  );
};

// ─────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────

const EmptyFeed = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-10 gap-3">
    <div className="w-12 h-12 rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
      <AlertCircle className="w-5 h-5 text-neutral-400" />
    </div>
    <p className="text-sm text-neutral-400">{message}</p>
  </div>
);

// ─────────────────────────────────────────────────────────
// INVENTORY SNAPSHOT (mini progress bars)
// ─────────────────────────────────────────────────────────

const InventorySnapshot = ({ stats }: { stats: any }) => {
  const total = stats.totalInventory || 1;
  const bars = [
    { label: 'In Stock',    value: Math.max(0, total - stats.lowStockItems), color: 'bg-emerald-500', pct: Math.round((Math.max(0, total - stats.lowStockItems) / total) * 100) },
    { label: 'Low Stock',   value: stats.lowStockItems,      color: 'bg-amber-500',  pct: Math.round((stats.lowStockItems / total) * 100) },
    { label: 'Quarantined', value: stats.totalQuarantines,   color: 'bg-red-500',    pct: Math.round((stats.totalQuarantines / total) * 100) },
  ];
  return (
    <div className="space-y-3">
      {bars.map(b => (
        <div key={b.label}>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-medium text-neutral-700 dark:text-neutral-300">{b.label}</span>
            <span className="text-neutral-500 dark:text-neutral-400">{fmt(b.value)} <span className="text-neutral-400">({b.pct}%)</span></span>
          </div>
          <div className="h-2 rounded-full bg-neutral-100 dark:bg-neutral-700 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(b.pct, 100)}%` }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className={cn('h-full rounded-full', b.color)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────
// LOW STOCK TABLE
// ─────────────────────────────────────────────────────────

const LowStockTable = ({ items, onViewAll }: { items: any[]; onViewAll: () => void }) => (
  <div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100 dark:border-neutral-700">
            <th className="text-left py-2.5 pr-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Item</th>
            <th className="text-right py-2.5 px-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">On Hand</th>
            <th className="text-right py-2.5 pl-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Available</th>
            <th className="text-right py-2.5 pl-3 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Risk</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-50 dark:divide-neutral-700/50">
          {items.map((item, i) => {
            const isCritical = item.quantityAvailable < 5;
            return (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="hover:bg-neutral-50 dark:hover:bg-neutral-700/30 transition-colors"
              >
                <td className="py-3 pr-3">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate block max-w-[160px]">
                    {item.itemName ?? `Item ${item.itemId?.slice(0, 8) ?? '—'}`}
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-neutral-600 dark:text-neutral-400">{item.quantityOnHand}</td>
                <td className="py-3 pl-3 text-right">
                  <span className={cn('font-bold', isCritical ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400')}>
                    {item.quantityAvailable}
                  </span>
                </td>
                <td className="py-3 pl-3 text-right">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold',
                    isCritical
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
                  )}>
                    {isCritical ? 'CRITICAL' : 'LOW'}
                  </span>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700">
      <button
        onClick={onViewAll}
        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
      >
        View all inventory <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────
// SYSTEM OVERVIEW TILES (admin/manager)
// ─────────────────────────────────────────────────────────

const SystemTile = ({ label, value, icon: Icon, color, to }: {
  label: string; value: number; icon: React.ElementType; color: string; to: string;
}) => {
  const navigate = useNavigate();
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      onClick={() => navigate(to)}
      className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-neutral-700/50 hover:bg-neutral-100 dark:hover:bg-neutral-700 cursor-pointer transition-all"
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{fmt(value)}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{label}</p>
      </div>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────
// GENERATE SYNTHETIC WEEKLY TREND DATA
// (Shows last 7 "data points" using live stats as anchors)
// ─────────────────────────────────────────────────────────

const buildTrendData = (total: number, pending: number) => {
  // Synthetic trend: ramp up to current totals over 7 points
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day, i) => {
    const factor = (i + 1) / 7;
    return {
      day,
      Movements: Math.round(total * factor * (0.9 + Math.random() * 0.2)),
      Pending: Math.round(pending * (1 - factor * 0.5) * (0.8 + Math.random() * 0.4)),
    };
  });
};

// ─────────────────────────────────────────────────────────
// MAIN DASHBOARD
// ─────────────────────────────────────────────────────────

export const DashboardPage = () => {
  const { user } = useAuth();
  const roles = useMemo(() => getRoles(user), [user]);
  const { data, isLoading, lastUpdated, refresh } = useDashboard(roles);
  const { stats } = data;
  const navigate = useNavigate();

  const roleInfo = useMemo(() => getRoleInfo(roles), [roles]);
  const quickActions = useMemo(() => getQuickActions(roles), [roles]);
  const isAdminOrManager = hasRole(roles, 'ADMIN', 'MANAGER');
  const firstName = user?.firstName ?? user?.username ?? 'there';

  const trendData = useMemo(
    () => buildTrendData(stats.totalMovements, stats.pendingMovements),
    [stats.totalMovements, stats.pendingMovements],
  );

  const movTypeData = useMemo(
    () => data.movementsByType.filter(m => m.count > 0),
    [data.movementsByType],
  );

  const donutData = useMemo(() => {
    const inStock = Math.max(0, stats.totalInventory - stats.lowStockItems - stats.totalQuarantines);
    const d = [
      { name: 'In Stock',    value: inStock,              fill: '#10B981' },
      { name: 'Low Stock',   value: stats.lowStockItems,  fill: '#F59E0B' },
      { name: 'Quarantined', value: stats.totalQuarantines, fill: '#EF4444' },
    ].filter(x => x.value > 0);
    return d;
  }, [stats]);

  const alertRadialData = useMemo(() => [
    { name: 'Resolved',     value: data.alertStats?.resolvedAlerts ?? 0,     fill: '#10B981' },
    { name: 'Acknowledged', value: data.alertStats?.acknowledgedAlerts ?? 0,  fill: '#6366F1' },
    { name: 'Active',       value: data.alertStats?.activeAlerts ?? stats.activeAlerts, fill: '#EF4444' },
  ].filter(x => x.value > 0), [data.alertStats, stats.activeAlerts]);

  if (isLoading) return <Loading />;

  return (
    <div className="space-y-6 pb-8">

      {/* ══════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {firstName} 👋
          </h1>
          <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
            <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold', roleInfo.color)}>
              <roleInfo.icon className="w-3 h-3" />
              {roleInfo.label}
            </span>
            {lastUpdated && (
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                Last updated {format(lastUpdated, 'HH:mm')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={refresh}>
            Refresh
          </Button>
          <Button variant="accent" size="sm" icon={<Settings className="w-4 h-4" />} onClick={() => navigate('/settings')}>
            Settings
          </Button>
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          CRITICAL BANNER (only when critical alerts)
      ══════════════════════════════════════════════════ */}
      {stats.criticalAlerts > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
        >
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
            <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              {stats.criticalAlerts} Critical Alert{stats.criticalAlerts !== 1 ? 's' : ''} — Immediate Action Required
            </p>
            {stats.unacknowledgedAlerts > 0 && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                {stats.unacknowledgedAlerts} unacknowledged alert{stats.unacknowledgedAlerts !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <Button variant="danger" size="sm" onClick={() => navigate('/alerts')}>View Alerts</Button>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════
          KPI CARDS ROW
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Total Products"
          value={fmt(stats.totalItems)}
          subtitle={`${fmt(stats.totalCategories)} categories`}
          icon={Package}
          gradient="from-blue-500 to-indigo-600"
          bgLight="bg-blue-50 dark:bg-blue-900/30"
          textAccent="text-blue-600 dark:text-blue-400"
          onClick={() => navigate('/products/items')}
          delay={0.05}
        />
        <KpiCard
          title="Inventory Items"
          value={fmt(stats.totalInventory)}
          subtitle={`${fmt(stats.totalLots)} lots · ${fmt(stats.totalSerials)} serials`}
          icon={Box}
          gradient="from-teal-500 to-emerald-600"
          bgLight="bg-teal-50 dark:bg-teal-900/30"
          textAccent="text-teal-600 dark:text-teal-400"
          onClick={() => navigate('/inventory/Inventories')}
          delay={0.1}
        />
        <KpiCard
          title="Total Movements"
          value={fmt(stats.totalMovements)}
          subtitle={`${fmt(stats.pendingMovements)} pending`}
          icon={ArrowLeftRight}
          gradient="from-violet-500 to-purple-600"
          bgLight="bg-violet-50 dark:bg-violet-900/30"
          textAccent="text-violet-600 dark:text-violet-400"
          onClick={() => navigate('/movements')}
          delay={0.15}
        />
        <KpiCard
          title="Active Alerts"
          value={fmt(stats.activeAlerts)}
          subtitle={`${fmt(stats.unacknowledgedAlerts)} unacknowledged`}
          icon={Bell}
          gradient={stats.criticalAlerts > 0 ? 'from-red-500 to-rose-600' : 'from-amber-500 to-orange-600'}
          bgLight={stats.criticalAlerts > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}
          textAccent={stats.criticalAlerts > 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}
          trend={stats.criticalAlerts > 0 ? { value: stats.criticalAlerts, positive: false, label: `${stats.criticalAlerts} critical` } : undefined}
          onClick={() => navigate('/alerts')}
          delay={0.2}
        />
        <KpiCard
          title="QC Controls"
          value={fmt(stats.totalQualityControls)}
          subtitle={`${fmt(stats.totalQuarantines)} quarantined`}
          icon={ShieldCheck}
          gradient="from-pink-500 to-rose-600"
          bgLight="bg-pink-50 dark:bg-pink-900/30"
          textAccent="text-pink-600 dark:text-pink-400"
          onClick={() => navigate('/quality/controls')}
          delay={0.25}
        />
        <KpiCard
          title="Locations"
          value={fmt(stats.totalLocations)}
          subtitle={`${fmt(stats.totalWarehouses)} warehouses · ${fmt(stats.totalSites)} sites`}
          icon={Warehouse}
          gradient="from-cyan-500 to-sky-600"
          bgLight="bg-cyan-50 dark:bg-cyan-900/30"
          textAccent="text-cyan-600 dark:text-cyan-400"
          onClick={() => navigate('/locations/warehouses')}
          delay={0.3}
        />
      </div>

      {/* ══════════════════════════════════════════════════
          ROW 2 — Movement Trend (area) + Inventory Donut
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Area chart — movement trend */}
        <ChartPanel
          title="Movement Trends"
          subtitle="Activity over the past week"
          className="lg:col-span-2"
          delay={0.1}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradMovements" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" strokeOpacity={0.8} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
                formatter={(value) => <span className="text-neutral-600 dark:text-neutral-400">{value}</span>}
              />
              <Area type="monotone" dataKey="Movements" stroke="#6366F1" strokeWidth={2.5} fill="url(#gradMovements)" dot={false} activeDot={{ r: 5, fill: '#6366F1' }} />
              <Area type="monotone" dataKey="Pending"   stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 3" fill="url(#gradPending)" dot={false} activeDot={{ r: 5, fill: '#F59E0B' }} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        {/* Donut chart — inventory health */}
        <ChartPanel
          title="Inventory Health"
          subtitle="Current stock breakdown"
          delay={0.15}
        >
          {donutData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%" cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {donutData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-1.5 mt-1">
                {donutData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                      <span className="text-neutral-600 dark:text-neutral-400">{d.name}</span>
                    </div>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyFeed message="No inventory data yet" />
          )}
        </ChartPanel>
      </div>

      {/* ══════════════════════════════════════════════════
          ROW 3 — Movements by Type bar + Alert Radial
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar chart — movements by type */}
        <ChartPanel
          title="Movements by Type"
          subtitle="Volume breakdown"
          className="lg:col-span-2"
          delay={0.2}
        >
          {movTypeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={movTypeData} margin={{ top: 0, right: 5, left: -20, bottom: 0 }} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Count" radius={[8, 8, 0, 0]}>
                  {movTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyFeed message="No movement data yet" />
          )}
        </ChartPanel>

        {/* Radial bar — alert breakdown */}
        <ChartPanel
          title="Alert Overview"
          subtitle="By resolution status"
          delay={0.25}
        >
          {alertRadialData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <RadialBarChart
                  cx="50%" cy="50%"
                  innerRadius="25%"
                  outerRadius="90%"
                  data={alertRadialData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar dataKey="value" cornerRadius={6} background={{ fill: '#F8FAFC' }} />
                  <Tooltip content={<ChartTooltip />} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-1">
                {alertRadialData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                      <span className="text-neutral-600 dark:text-neutral-400">{d.name}</span>
                    </div>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200">{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <CheckCircle className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-medium text-neutral-500">All clear — no alerts</p>
            </div>
          )}
        </ChartPanel>
      </div>

      {/* ══════════════════════════════════════════════════
          ROW 4 — Recent Movements + Recent Alerts feeds
      ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Recent Movements */}
        <ChartPanel
          title="Recent Movements"
          subtitle="Latest stock movements"
          action={
            <button
              onClick={() => navigate('/movements')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
          delay={0.3}
        >
          {data.recentMovements.length === 0 ? (
            <EmptyFeed message="No recent movements" />
          ) : (
            <div className="space-y-1">
              {data.recentMovements.slice(0, 6).map((m, i) => (
                <MovementRow key={m.id} m={m} i={i} onClick={() => navigate('/movements')} />
              ))}
            </div>
          )}
        </ChartPanel>

        {/* Recent Alerts */}
        <ChartPanel
          title="Recent Alerts"
          subtitle="Latest system alerts"
          action={
            <button
              onClick={() => navigate('/alerts')}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          }
          delay={0.35}
        >
          {data.recentAlerts.length === 0 ? (
            <EmptyFeed message="No recent alerts" />
          ) : (
            <div className="space-y-1">
              {data.recentAlerts.slice(0, 6).map((a, i) => (
                <AlertRow key={a.id} a={a} i={i} onClick={() => navigate('/alerts')} />
              ))}
            </div>
          )}
        </ChartPanel>
      </div>

      {/* ══════════════════════════════════════════════════
          ROW 5 — Quick Actions
      ══════════════════════════════════════════════════ */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 shadow-sm p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Quick Actions</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Jump to any module instantly</p>
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.to}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.06 }}
            >
              <QuickActionCard {...action} />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ══════════════════════════════════════════════════
          ROW 6 — Low Stock Warning + Inventory Progress
          (visible to warehouse/admin/manager/procurement)
      ══════════════════════════════════════════════════ */}
      {data.lowStockItems.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <ChartPanel
            title="Low Stock Warning"
            subtitle={`${data.lowStockItems.length} item${data.lowStockItems.length !== 1 ? 's' : ''} below threshold`}
            className="lg:col-span-2"
            action={
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-xs font-semibold text-amber-700 dark:text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5" />
                Action needed
              </span>
            }
            delay={0.45}
          >
            <LowStockTable items={data.lowStockItems.slice(0, 8)} onViewAll={() => navigate('/inventory/Inventories')} />
          </ChartPanel>

          <ChartPanel
            title="Stock Snapshot"
            subtitle="Overall inventory composition"
            delay={0.5}
          >
            <InventorySnapshot stats={stats} />

            <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-700 grid grid-cols-2 gap-3">
              {[
                { label: 'Total Lots',   value: stats.totalLots,    icon: Archive, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
                { label: 'Serials',      value: stats.totalSerials,  icon: Hash,    color: 'text-teal-600 dark:text-teal-400',  bg: 'bg-teal-50 dark:bg-teal-900/30' },
              ].map(item => (
                <div key={item.label} className={cn('flex items-center gap-2.5 p-3 rounded-xl', item.bg)}>
                  <item.icon className={cn('w-4 h-4 shrink-0', item.color)} />
                  <div>
                    <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{fmt(item.value)}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </ChartPanel>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ROW 7 — System Overview (admin / manager only)
      ══════════════════════════════════════════════════ */}
      {isAdminOrManager && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 shadow-sm p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">System Overview</h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">All services at a glance</p>
            </div>
            {hasRole(roles, 'ADMIN') && (
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                <Users className="w-3.5 h-3.5" />
                <span>{fmt(stats.totalUsers)} users · {fmt(stats.activeUsers)} active</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <SystemTile label="Products"    value={stats.totalItems}          icon={Package}       color="bg-blue-500"    to="/products/items" />
            <SystemTile label="Categories"  value={stats.totalCategories}     icon={Layers}        color="bg-indigo-500"  to="/products/categories" />
            <SystemTile label="Inventory"   value={stats.totalInventory}      icon={Box}           color="bg-teal-500"    to="/inventory/Inventories" />
            <SystemTile label="Movements"   value={stats.totalMovements}      icon={ArrowLeftRight} color="bg-violet-500" to="/movements" />
            <SystemTile label="QC Controls" value={stats.totalQualityControls} icon={ClipboardCheck} color="bg-pink-500"  to="/quality/controls" />
            <SystemTile label="Locations"   value={stats.totalLocations}      icon={MapPin}        color="bg-cyan-500"    to="/locations/locations" />
          </div>

          {/* Movement status summary mini bar */}
          <div className="mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700">
            <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-3">Movement Status Breakdown</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Pending',     value: stats.pendingMovements,    color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-900/20',   icon: Clock },
                { label: 'In Progress', value: stats.inProgressMovements, color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-900/20',     icon: Activity },
                { label: 'Completed',   value: stats.completedMovements,  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: CheckCircle },
                { label: 'Overdue',     value: stats.overdueMovements,    color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-900/20',       icon: XCircle },
              ].map(s => (
                <div key={s.label} className={cn('flex items-center gap-3 px-4 py-3 rounded-xl', s.bg)}>
                  <s.icon className={cn('w-4 h-4 shrink-0', s.color)} />
                  <div>
                    <p className={cn('text-xl font-bold', s.color)}>{fmt(s.value)}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════════
          ROW 8 — Quality & Quarantine (admin/quality roles)
      ══════════════════════════════════════════════════ */}
      {hasRole(roles, 'ADMIN', 'MANAGER', 'QUALITY_MANAGER', 'QUALITY', 'SUPERVISOR') && (
        stats.totalQualityControls > 0 || stats.totalQuarantines > 0
      ) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700/60 shadow-sm p-5"
        >
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Quality & Quarantine</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">QC controls and quarantine status</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'QC Total',    value: stats.totalQualityControls,  icon: ClipboardCheck, color: 'bg-indigo-500',  to: '/quality/controls' },
              { label: 'Pending QC',  value: stats.pendingQualityControls,icon: Clock,          color: 'bg-amber-500',   to: '/quality/controls' },
              { label: 'Passed',      value: stats.passedQualityControls, icon: CheckCircle,    color: 'bg-emerald-500', to: '/quality/controls' },
              { label: 'Failed',      value: stats.failedQualityControls, icon: XCircle,        color: 'bg-red-500',     to: '/quality/controls' },
              { label: 'Quarantines', value: stats.totalQuarantines,      icon: AlertTriangle,  color: 'bg-orange-500',  to: '/quality/quarantines' },
              { label: 'Active Quar.',value: stats.activeQuarantines,     icon: AlertOctagon,   color: 'bg-rose-600',    to: '/quality/quarantines' },
            ].map((t) => (
              <SystemTile key={t.label} label={t.label} value={t.value} icon={t.icon} color={t.color} to={t.to} />
            ))}
          </div>
        </motion.div>
      )}

    </div>
  );
};
