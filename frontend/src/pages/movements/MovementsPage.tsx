// frontend/src/pages/movements/MovementsPage.tsx

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, RefreshCw, Package, FileText,
  Activity, CheckCircle2, TrendingUp, X, SlidersHorizontal,
  ArrowDownCircle, ChevronDown,
} from 'lucide-react';
import { movementService } from '@/services/movement.service';
import { inventoryService } from '@/services/inventory.service';
import { qualityService } from '@/services/quality.service';
import { alertService } from '@/services/alert.service';
import { Movement, MovementType, MovementStatus } from '@/types';
import { toast } from 'react-hot-toast';
import { confirmDelete } from '@/utils/confirmDialog';
import MovementFormModal from '@/components/movements/MovementFormModal';
import MovementDetailModal from '@/components/movements/MovementDetailModal';
import MovementCard from '@/components/movements/Movementcard';

// ─── Stat card config ───────────────────────────────────────────────
const STAT_CARDS = [
  {
    key: 'total',
    label: 'Total Movements',
    icon: Package,
    gradient: 'from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/20',
    border: 'border-indigo-200/60 dark:border-indigo-700/40',
    iconBg: 'bg-indigo-100 dark:bg-indigo-800/60',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    valueColor: 'text-indigo-700 dark:text-indigo-300',
  },
  {
    key: 'draft',
    label: 'Draft',
    icon: FileText,
    gradient: 'from-slate-50 to-neutral-50 dark:from-slate-800/40 dark:to-neutral-800/20',
    border: 'border-slate-200/60 dark:border-slate-700/40',
    iconBg: 'bg-slate-100 dark:bg-slate-700/60',
    iconColor: 'text-slate-500 dark:text-slate-400',
    valueColor: 'text-slate-700 dark:text-slate-300',
  },
  {
    key: 'inProgress',
    label: 'In Progress',
    icon: Activity,
    gradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20',
    border: 'border-blue-200/60 dark:border-blue-700/40',
    iconBg: 'bg-blue-100 dark:bg-blue-800/60',
    iconColor: 'text-blue-600 dark:text-blue-400',
    valueColor: 'text-blue-700 dark:text-blue-300',
    pulse: true,
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: CheckCircle2,
    gradient: 'from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/20',
    border: 'border-emerald-200/60 dark:border-emerald-700/40',
    iconBg: 'bg-emerald-100 dark:bg-emerald-800/60',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-emerald-700 dark:text-emerald-300',
  },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: MovementType.RECEIPT, label: 'Receipt' },
  { value: MovementType.ISSUE, label: 'Issue' },
  { value: MovementType.TRANSFER, label: 'Transfer' },
  { value: MovementType.PICKING, label: 'Picking' },
  { value: MovementType.PUTAWAY, label: 'Put-Away' },
  { value: MovementType.RETURN, label: 'Return' },
  { value: MovementType.ADJUSTMENT, label: 'Adjustment' },
  { value: MovementType.CYCLE_COUNT, label: 'Cycle Count' },
  { value: MovementType.RELOCATION, label: 'Relocation' },
  { value: MovementType.QUARANTINE, label: 'Quarantine' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: MovementStatus.DRAFT, label: 'Draft' },
  { value: MovementStatus.PENDING, label: 'Pending' },
  { value: MovementStatus.IN_PROGRESS, label: 'In Progress' },
  { value: MovementStatus.COMPLETED, label: 'Completed' },
  { value: MovementStatus.CANCELLED, label: 'Cancelled' },
  { value: MovementStatus.ON_HOLD, label: 'On Hold' },
  { value: MovementStatus.PARTIALLY_COMPLETED, label: 'Partial' },
];

// ─── Styled select ───────────────────────────────────────────────────
const StyledSelect = ({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full appearance-none pl-4 pr-10 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600/60
        bg-white dark:bg-neutral-800/80 text-neutral-800 dark:text-neutral-200 text-sm
        focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400
        transition-all duration-200 cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
  </div>
);

// ─── Component ───────────────────────────────────────────────────────
const MovementsPage = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ type: '', status: '' });
  const [showFilters, setShowFilters] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);

  const fetchMovements = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await movementService.getMovements({ size: 100 });
      setMovements(response.content || []);
    } catch (error) {
      console.error('Failed to fetch movements:', error);
      toast.error('Failed to load movements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchMovements(); }, []);

  const filteredMovements = movements.filter((m) => {
    const matchesSearch =
      !searchTerm ||
      m.referenceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.type?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filters.type || m.type === filters.type;
    const matchesStatus = !filters.status || m.status === filters.status;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Stat values
  const stats = {
    total: movements.length,
    draft: movements.filter((m) => m.status === MovementStatus.DRAFT || m.status === MovementStatus.PENDING).length,
    inProgress: movements.filter((m) => m.status === MovementStatus.IN_PROGRESS || m.status === MovementStatus.PARTIALLY_COMPLETED).length,
    completed: movements.filter((m) => m.status === MovementStatus.COMPLETED).length,
  };

  const handleStatusChange = async (movementId: string, newStatus: MovementStatus) => {
    try {
      setLoading(true);
      await movementService.updateMovementStatus(movementId, newStatus);

      if (newStatus === MovementStatus.COMPLETED) {
        const movement = movements.find((m) => m.id === movementId);
        if (movement) {
          const lines = await movementService.getLinesByMovement(movementId);
          for (const line of lines) {
            try {
              if (line.fromLocationId) {
                await inventoryService.adjustInventory({
                  itemId: line.itemId,
                  locationId: line.fromLocationId,
                  quantityChange: -(line.actualQuantity || line.requestedQuantity),
                  reason: `Movement ${movement.referenceNumber} completed`,
                });
              }
              if (line.toLocationId) {
                await inventoryService.adjustInventory({
                  itemId: line.itemId,
                  locationId: line.toLocationId,
                  quantityChange: line.actualQuantity || line.requestedQuantity,
                  reason: `Movement ${movement.referenceNumber} completed`,
                });
              }
              if (line.fromLocationId) {
                const remaining = await inventoryService.getAvailableQuantity(line.itemId, line.fromLocationId);
                if (remaining < 10) {
                  await alertService.createAlert({
                    type: 'LOW_STOCK',
                    severity: remaining < 5 ? 'CRITICAL' : 'HIGH',
                    title: 'Low Stock Alert',
                    message: `Item ${line.itemId} is low (${remaining} remaining)`,
                    itemId: line.itemId,
                    locationId: line.fromLocationId,
                  });
                }
              }
            } catch (err) {
              console.error('Inventory update error:', err);
            }
          }
          if (movement.type === MovementType.RECEIPT) {
            try {
              const firstLine = lines[0];
              if (firstLine) {
                await qualityService.createQualityControl({
                  itemId: firstLine.itemId,
                  locationId: firstLine.toLocationId,
                  quantity: firstLine.actualQuantity,
                  status: 'PENDING',
                  priority: 'MEDIUM',
                  inspectionType: 'RECEIVING',
                  scheduledDate: new Date().toISOString(),
                  notes: `Auto-created from movement ${movement.referenceNumber}`,
                });
              }
            } catch (err) {
              console.error('QC creation error:', err);
            }
          }
          toast.success('Movement completed — inventory updated!');
        }
      } else {
        toast.success(`Status updated to ${newStatus}`);
      }
      await fetchMovements(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (movementId: string) => {
    const ok = await confirmDelete('Delete Movement', 'This movement and all its lines will be permanently removed.');
    if (!ok) return;
    try {
      await movementService.deleteMovement(movementId);
      toast.success('Movement deleted');
      fetchMovements(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const hasActiveFilters = filters.type || filters.status || searchTerm;

  return (
    <div className="min-h-screen">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              Stock Movements
            </h1>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              Track and manage all inbound, outbound, and transfer operations
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchMovements(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800
                text-neutral-500 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-indigo-400
                hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-200"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white
                bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                shadow-lg shadow-indigo-500/25 transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              New Movement
            </motion.button>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STAT_CARDS.map((card, i) => {
            const Icon = card.icon;
            const value = stats[card.key as keyof typeof stats];
            return (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className={`rounded-2xl p-5 bg-gradient-to-br ${card.gradient} border ${card.border} shadow-sm`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.iconBg}`}>
                    <Icon className={`w-5 h-5 ${card.iconColor}`} />
                  </div>
                  {card.pulse && value > 0 && (
                    <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <p className={`text-3xl font-bold ${card.valueColor}`}>{value}</p>
                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-1">{card.label}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Search & Filters ───────────────────────────────── */}
        <div className="rounded-2xl bg-white dark:bg-neutral-800/90 shadow-sm border border-neutral-200/80 dark:border-neutral-700/60 p-5">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder="Search by reference, notes, or type…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-600/60
                  bg-neutral-50 dark:bg-neutral-900/50 text-neutral-800 dark:text-neutral-200 text-sm
                  placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40
                  focus:border-indigo-400 transition-all duration-200"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
                hasActiveFilters
                  ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'border-neutral-200 dark:border-neutral-600/60 bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-indigo-300'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                  {(filters.type ? 1 : 0) + (filters.status ? 1 : 0)}
                </span>
              )}
            </button>
          </div>

          {/* Expanded filters */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-neutral-100 dark:border-neutral-700/50">
                  <StyledSelect
                    value={filters.type}
                    onChange={(v) => setFilters({ ...filters, type: v })}
                    options={TYPE_OPTIONS}
                  />
                  <StyledSelect
                    value={filters.status}
                    onChange={(v) => setFilters({ ...filters, status: v })}
                    options={STATUS_OPTIONS}
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setFilters({ type: '', status: '' }); setSearchTerm(''); }}
                    className="mt-3 text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Results count ─────────────────────────────────── */}
        {!loading && movements.length > 0 && (
          <div className="flex items-center justify-between px-1">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Showing <span className="font-semibold text-neutral-700 dark:text-neutral-300">{filteredMovements.length}</span> of{' '}
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">{movements.length}</span> movements
            </p>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                <TrendingUp className="w-3 h-3" /> Filtered
              </span>
            )}
          </div>
        )}

        {/* ── Movements Grid ─────────────────────────────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
              <RefreshCw className="w-7 h-7 text-indigo-500 animate-spin" />
            </div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading movements…</p>
          </div>
        ) : filteredMovements.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700/60 shadow-sm p-16 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mx-auto mb-5">
              <ArrowDownCircle className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              {hasActiveFilters ? 'No movements match your filters' : 'No movements yet'}
            </h3>
            <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
              {hasActiveFilters
                ? 'Try adjusting or clearing your search filters.'
                : 'Create your first stock movement to start tracking inventory operations.'}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              {hasActiveFilters ? (
                <button
                  onClick={() => { setFilters({ type: '', status: '' }); setSearchTerm(''); }}
                  className="px-5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                >
                  Clear Filters
                </button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white
                    bg-gradient-to-r from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/25"
                >
                  <Plus className="w-4 h-4" />
                  Create Movement
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence>
              {filteredMovements.map((movement, i) => (
                <motion.div
                  key={movement.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                >
                  <MovementCard
                    movement={movement}
                    onClick={() => { setSelectedMovement(movement); setIsDetailModalOpen(true); }}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {isDetailModalOpen && selectedMovement && (
        <MovementDetailModal
          movement={selectedMovement}
          isOpen={isDetailModalOpen}
          onClose={() => { setIsDetailModalOpen(false); setSelectedMovement(null); }}
          onUpdate={() => fetchMovements(true)}
        />
      )}

      {isCreateModalOpen && (
        <MovementFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => fetchMovements(true)}
        />
      )}
    </div>
  );
};

export default MovementsPage;
