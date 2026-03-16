// frontend/src/components/movements/MovementDetailModal.tsx

import { useState, useEffect } from 'react';
import {
  X, Package, MapPin, Calendar, User, CheckCircle2, XCircle,
  Clock, Play, PauseCircle, RotateCcw, Trash2, Edit3,
  Layers, ClipboardList, ArrowDownCircle, ArrowUpCircle,
  ArrowLeftRight, ScanLine, Warehouse, Undo2, Scale,
  RefreshCcw, ShieldAlert, MoveRight, AlertTriangle,
} from 'lucide-react';
import { movementService } from '@/services/movement.service';
import { inventoryService } from '@/services/inventory.service';
import { locationService } from '@/services/location.service';
import { productService } from '@/services/product.service';
import { Movement, MovementLine, MovementTask, MovementStatus, MovementPriority, LineStatus, TaskStatus, MovementType } from '@/types';
import { toast } from 'react-hot-toast';
import { confirmAction, confirmDelete, confirmWarning, promptInput } from '@/utils/confirmDialog';
import { format } from 'date-fns';

interface MovementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  movement: Movement;
  onUpdate: () => void;
}

// ─── Type icon map ─────────────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ElementType> = {
  [MovementType.RECEIPT]:    ArrowDownCircle,
  [MovementType.ISSUE]:      ArrowUpCircle,
  [MovementType.TRANSFER]:   ArrowLeftRight,
  [MovementType.PICKING]:    ScanLine,
  [MovementType.PUTAWAY]:    Warehouse,
  [MovementType.RETURN]:     Undo2,
  [MovementType.ADJUSTMENT]: Scale,
  [MovementType.CYCLE_COUNT]: RefreshCcw,
  [MovementType.RELOCATION]: MoveRight,
  [MovementType.QUARANTINE]: ShieldAlert,
};

const TYPE_ACCENT: Record<string, string> = {
  [MovementType.RECEIPT]:    'from-emerald-600 to-teal-700',
  [MovementType.ISSUE]:      'from-rose-600 to-pink-700',
  [MovementType.TRANSFER]:   'from-indigo-600 to-violet-700',
  [MovementType.PICKING]:    'from-amber-500 to-orange-600',
  [MovementType.PUTAWAY]:    'from-teal-600 to-cyan-700',
  [MovementType.RETURN]:     'from-orange-500 to-amber-600',
  [MovementType.ADJUSTMENT]: 'from-violet-600 to-purple-700',
  [MovementType.CYCLE_COUNT]:'from-blue-600 to-cyan-700',
  [MovementType.RELOCATION]: 'from-sky-500 to-blue-600',
  [MovementType.QUARANTINE]: 'from-red-600 to-rose-700',
};

const STATUS_BADGE: Record<string, { bg: string; text: string; dot: string; pulse?: boolean }> = {
  DRAFT:               { bg: 'bg-white/20', text: 'text-white',          dot: 'bg-white/70' },
  PENDING:             { bg: 'bg-amber-400/30', text: 'text-amber-100',  dot: 'bg-amber-300' },
  IN_PROGRESS:         { bg: 'bg-blue-400/30',  text: 'text-blue-100',   dot: 'bg-blue-300', pulse: true },
  PARTIALLY_COMPLETED: { bg: 'bg-cyan-400/30',  text: 'text-cyan-100',   dot: 'bg-cyan-300', pulse: true },
  COMPLETED:           { bg: 'bg-emerald-400/30',text: 'text-emerald-100',dot: 'bg-emerald-300' },
  CANCELLED:           { bg: 'bg-red-400/30',   text: 'text-red-100',    dot: 'bg-red-300' },
  ON_HOLD:             { bg: 'bg-orange-400/30',text: 'text-orange-100', dot: 'bg-orange-300' },
};

const PRIORITY_BADGE: Record<string, string> = {
  LOW:      'bg-white/10 text-white/70',
  NORMAL:   'bg-white/10 text-white/70',
  HIGH:     'bg-orange-400/30 text-orange-100',
  URGENT:   'bg-rose-400/30 text-rose-100',
  CRITICAL: 'bg-red-500/40 text-red-100',
};

const LINE_STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING:   { bg: 'bg-amber-100 dark:bg-amber-900/40',   text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500' },
  ALLOCATED: { bg: 'bg-blue-100 dark:bg-blue-900/40',     text: 'text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500' },
  PICKED:    { bg: 'bg-indigo-100 dark:bg-indigo-900/40', text: 'text-indigo-700 dark:text-indigo-300', dot: 'bg-indigo-500' },
  PACKED:    { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', dot: 'bg-violet-500' },
  IN_TRANSIT:{ bg: 'bg-cyan-100 dark:bg-cyan-900/40',     text: 'text-cyan-700 dark:text-cyan-300',     dot: 'bg-cyan-500' },
  COMPLETED: { bg: 'bg-emerald-100 dark:bg-emerald-900/40',text: 'text-emerald-700 dark:text-emerald-300',dot: 'bg-emerald-500' },
  CANCELLED: { bg: 'bg-red-100 dark:bg-red-900/40',       text: 'text-red-700 dark:text-red-300',       dot: 'bg-red-500' },
};

// ─── Info field component ──────────────────────────────────────────
const InfoField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-4">
    <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-1.5">{label}</p>
    <div className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">{value || <span className="text-neutral-400 font-normal">—</span>}</div>
  </div>
);

// ─── Component ─────────────────────────────────────────────────────
const MovementDetailModal = ({ isOpen, onClose, movement: initialMovement, onUpdate }: MovementDetailModalProps) => {
  const [movement, setMovement] = useState<Movement>(initialMovement);
  const [lines, setLines] = useState<MovementLine[]>([]);
  const [tasks, setTasks] = useState<MovementTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'lines' | 'tasks'>('details');

  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [editingActualQty, setEditingActualQty] = useState<number>(0);

  const [enrichedData, setEnrichedData] = useState<{
    items: Map<string, any>;
    locations: Map<string, any>;
  }>({ items: new Map(), locations: new Map() });

  const TypeIcon = TYPE_ICONS[movement.type] ?? Package;
  const headerGradient = TYPE_ACCENT[movement.type] ?? 'from-indigo-600 to-violet-700';
  const statusBadge = STATUS_BADGE[movement.status] ?? STATUS_BADGE.DRAFT;
  const priorityBadge = PRIORITY_BADGE[movement.priority] ?? PRIORITY_BADGE.NORMAL;

  useEffect(() => {
    if (isOpen) {
      fetchMovementDetails();
      fetchLines();
      fetchTasks();
    }
  }, [isOpen, movement.id]);

  const enrichLineData = async (linesToEnrich: MovementLine[]) => {
    const itemsMap = new Map(enrichedData.items);
    const locsMap = new Map(enrichedData.locations);
    for (const line of linesToEnrich) {
      if (line.itemId && !itemsMap.has(line.itemId)) {
        try {
          const item = await productService.getItemById(line.itemId);
          itemsMap.set(line.itemId, { name: item.name, sku: item.sku });
        } catch {
          itemsMap.set(line.itemId, { name: 'Unknown Item', sku: line.itemId.slice(0, 8) });
        }
      }
      for (const locId of [line.fromLocationId, line.toLocationId]) {
        if (locId && !locsMap.has(locId)) {
          try {
            const loc = await locationService.getLocationById(locId);
            locsMap.set(locId, { code: loc.code });
          } catch {
            locsMap.set(locId, { code: locId.slice(0, 8) });
          }
        }
      }
    }
    setEnrichedData({ items: itemsMap, locations: locsMap });
  };

  const fetchMovementDetails = async () => {
    try {
      const data = await movementService.getMovementById(movement.id);
      setMovement(data);
    } catch (err: any) {
      toast.error('Failed to refresh movement');
    }
  };

  const fetchLines = async () => {
    try {
      const data = await movementService.getLinesByMovement(movement.id);
      setLines(data);
      await enrichLineData(data);
    } catch {
      toast.error('Failed to load movement lines');
    }
  };

  const fetchTasks = async () => {
    try {
      const data = await movementService.getTasksByMovement(movement.id);
      setTasks(data);
    } catch {
      toast.error('Failed to load tasks');
    }
  };

  // ── Handlers ────────────────────────────────────────────────────
  const handleStart = async () => {
    const ok = await confirmAction('Start Movement', 'Begin processing this movement?', 'Start');
    if (!ok) return;
    try {
      setLoading(true);
      await movementService.startMovement(movement.id);
      toast.success('Movement started');
      fetchMovementDetails(); onUpdate();
    } catch (err: any) { toast.error(err.message || 'Failed to start'); }
    finally { setLoading(false); }
  };

  const handleComplete = async () => {
    const ok = await confirmAction('Complete Movement', 'Mark this movement as fully completed? Inventory will be updated.', 'Complete');
    if (!ok) return;
    try {
      setLoading(true);
      await movementService.completeMovement(movement.id);
      toast.success('Movement completed!');
      toast.loading('Updating inventory…', { duration: 2000 });
      setTimeout(async () => {
        for (const line of lines) {
          try {
            const locId = line.toLocationId || line.fromLocationId;
            if (!locId) continue;
            const inv = await inventoryService.getInventoryByItemAndLocation(line.itemId, locId);
            const itemData = enrichedData.items.get(line.itemId);
            const name = itemData?.name || itemData?.sku || line.itemId.slice(0, 8);
            toast.success(`${name}: ${inv.quantityOnHand} units on hand`, { duration: 4000 });
          } catch { /* silent */ }
        }
      }, 2500);
      fetchMovementDetails(); onUpdate();
    } catch (err: any) { toast.error(err.message || 'Failed to complete'); }
    finally { setLoading(false); }
  };

  const handleHold = async () => {
    const reason = await promptInput('Put On Hold', 'Reason for holding', 'e.g. Awaiting supplier confirmation…');
    if (!reason) return;
    try {
      setLoading(true);
      await movementService.holdMovement(movement.id, reason);
      toast.success('Movement put on hold');
      fetchMovementDetails(); onUpdate();
    } catch (err: any) { toast.error(err.message || 'Failed to hold'); }
    finally { setLoading(false); }
  };

  const handleRelease = async () => {
    const ok = await confirmAction('Release Hold', 'Resume this movement from hold?', 'Release');
    if (!ok) return;
    try {
      setLoading(true);
      await movementService.releaseMovement(movement.id);
      toast.success('Movement released');
      fetchMovementDetails(); onUpdate();
    } catch (err: any) { toast.error(err.message || 'Failed to release'); }
    finally { setLoading(false); }
  };

  const handleCancel = async () => {
    const reason = await promptInput('Cancel Movement', 'Reason for cancellation', 'e.g. Supplier issue, duplicate entry…');
    if (!reason) return;
    const ok = await confirmDelete('Confirm Cancellation', `Cancel this movement? Reason: "${reason}"`, 'Cancel Movement');
    if (!ok) return;
    try {
      setLoading(true);
      await movementService.cancelMovement(movement.id, reason);
      toast.success('Movement cancelled');
      fetchMovementDetails(); onUpdate();
    } catch (err: any) { toast.error(err.message || 'Failed to cancel'); }
    finally { setLoading(false); }
  };

  const handleUpdateActualQuantity = async (lineId: string, qty: number) => {
    try {
      setLoading(true);
      await movementService.updateLineActualQuantity(lineId, qty);
      const line = lines.find((l) => l.id === lineId);
      const name = line ? (enrichedData.items.get(line.itemId)?.name ?? 'Item') : 'Item';
      toast.success(`${name}: quantity updated to ${qty}`);
      setEditingLineId(null);
      fetchLines();
    } catch (err: any) { toast.error(err.message || 'Failed to update quantity'); }
    finally { setLoading(false); }
  };

  const handleCompleteMovementLine = async (lineId: string) => {
    const ok = await confirmAction('Complete Line', 'Mark this movement line as completed?', 'Complete');
    if (!ok) return;
    try {
      setLoading(true);
      await movementService.completeMovementLine(lineId);
      const line = lines.find((l) => l.id === lineId);
      const name = line ? (enrichedData.items.get(line.itemId)?.name ?? 'Item') : 'Item';
      toast.success(`${name}: line completed`);
      fetchLines(); fetchMovementDetails();
    } catch (err: any) { toast.error(err.message || 'Failed to complete line'); }
    finally { setLoading(false); }
  };

  const handleDeleteLine = async (lineId: string) => {
    const ok = await confirmDelete('Delete Line', 'This movement line will be permanently removed.');
    if (!ok) return;
    try {
      setLoading(true);
      await movementService.deleteMovementLine(lineId);
      toast.success('Line deleted');
      fetchLines();
    } catch (err: any) { toast.error(err.message || 'Failed to delete line'); }
    finally { setLoading(false); }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      setLoading(true);
      await movementService.startTask(taskId);
      toast.success('Task started');
      fetchTasks();
    } catch (err: any) { toast.error(err.message || 'Failed to start task'); }
    finally { setLoading(false); }
  };

  const handleCompleteTask = async (taskId: string) => {
    const ok = await confirmAction('Complete Task', 'Mark this task as completed?', 'Complete');
    if (!ok) return;
    try {
      setLoading(true);
      await movementService.completeTask(taskId);
      toast.success('Task completed');
      fetchTasks(); fetchMovementDetails();
    } catch (err: any) { toast.error(err.message || 'Failed to complete task'); }
    finally { setLoading(false); }
  };

  const handleCancelTask = async (taskId: string) => {
    const reason = await promptInput('Cancel Task', 'Reason for cancellation', 'e.g. No longer needed…');
    if (!reason) return;
    try {
      setLoading(true);
      await movementService.cancelTask(taskId, reason);
      toast.success('Task cancelled');
      fetchTasks();
    } catch (err: any) { toast.error(err.message || 'Failed to cancel task'); }
    finally { setLoading(false); }
  };

  const getActions = () => {
    const s = movement.status;
    return [
      (s === 'DRAFT' || s === 'PENDING') && {
        label: 'Start', action: handleStart, icon: Play,
        cls: 'bg-white/20 hover:bg-white/30 text-white border border-white/30',
      },
      (s === 'IN_PROGRESS' || s === 'PARTIALLY_COMPLETED') && {
        label: 'Complete', action: handleComplete, icon: CheckCircle2,
        cls: 'bg-emerald-500/90 hover:bg-emerald-400 text-white',
      },
      (s === 'IN_PROGRESS' || s === 'PARTIALLY_COMPLETED') && {
        label: 'Hold', action: handleHold, icon: PauseCircle,
        cls: 'bg-white/20 hover:bg-white/30 text-white border border-white/30',
      },
      s === 'ON_HOLD' && {
        label: 'Release', action: handleRelease, icon: RotateCcw,
        cls: 'bg-white/20 hover:bg-white/30 text-white border border-white/30',
      },
      s !== 'COMPLETED' && s !== 'CANCELLED' && {
        label: 'Cancel', action: handleCancel, icon: XCircle,
        cls: 'bg-rose-500/80 hover:bg-rose-500 text-white',
      },
    ].filter(Boolean) as { label: string; action: () => void; icon: React.ElementType; cls: string }[];
  };

  if (!isOpen) return null;

  const TABS = [
    { id: 'details', label: 'Details' },
    { id: 'lines',   label: `Lines (${lines.length})` },
    { id: 'tasks',   label: `Tasks (${tasks.length})` },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">

        {/* ── HEADER ───────────────────────────────────────── */}
        <div className={`relative px-6 py-5 bg-gradient-to-r ${headerGradient}`}>
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title row */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <TypeIcon className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-white tracking-tight truncate">
                {movement.referenceNumber || `MVT-${movement.id.slice(0, 8).toUpperCase()}`}
              </h2>
              <div className="flex items-center flex-wrap gap-2 mt-1.5">
                {/* Status */}
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot} ${statusBadge.pulse ? 'animate-pulse' : ''}`} />
                  {movement.status.replace(/_/g, ' ')}
                </span>
                {/* Type */}
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white/90">
                  {movement.type.replace(/_/g, ' ')}
                </span>
                {/* Priority */}
                {movement.priority && movement.priority !== MovementPriority.NORMAL && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityBadge}`}>
                    {movement.priority}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {getActions().length > 0 && (
            <div className="flex flex-wrap gap-2">
              {getActions().map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={action.action}
                    disabled={loading}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150 disabled:opacity-50 ${action.cls}`}
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── TABS ────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-0 bg-white dark:bg-neutral-900 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-neutral-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-50/50 dark:bg-neutral-900/50">

          {/* ── DETAILS TAB ───────────────────────────────── */}
          {activeTab === 'details' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <InfoField label="Type" value={movement.type.replace(/_/g, ' ')} />
                <InfoField label="Status" value={
                  <span className="capitalize">{movement.status.replace(/_/g, ' ').toLowerCase()}</span>
                } />
                <InfoField label="Priority" value={movement.priority} />
                <InfoField label="Reference" value={movement.referenceNumber} />
                <InfoField label="Created" value={
                  movement.createdAt ? format(new Date(movement.createdAt), 'dd MMM yyyy, HH:mm') : null
                } />
                <InfoField label="Expected" value={
                  movement.expectedDate ? format(new Date(movement.expectedDate), 'dd MMM yyyy') : null
                } />
                {movement.sourceLocationId && (
                  <InfoField label="Source Location" value={movement.sourceLocationName || movement.sourceLocationId.slice(0, 12)} />
                )}
                {movement.destinationLocationId && (
                  <InfoField label="Destination" value={movement.destinationLocationName || movement.destinationLocationId.slice(0, 12)} />
                )}
                {movement.warehouseName && (
                  <InfoField label="Warehouse" value={movement.warehouseName} />
                )}
              </div>

              {movement.notes && (
                <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{movement.notes}</p>
                </div>
              )}

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200/60 dark:border-indigo-700/40 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-800/60 flex items-center justify-center">
                    <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                      {movement.totalLines ?? lines.length}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Lines</p>
                  </div>
                </div>
                <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200/60 dark:border-violet-700/40 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-800/60 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{tasks.length}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Total Tasks</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LINES TAB ─────────────────────────────────── */}
          {activeTab === 'lines' && (
            <div className="space-y-4">
              {lines.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                    <Package className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="font-semibold text-neutral-700 dark:text-neutral-300">No movement lines</h3>
                  <p className="text-sm text-neutral-500 mt-1">This movement has no lines yet.</p>
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden border border-neutral-200/80 dark:border-neutral-700/60 bg-white dark:bg-neutral-800/90">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-700/60">
                        {['Item', 'From', 'To', 'Requested', 'Actual', 'Variance', 'Status', 'Actions'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-700/50">
                      {lines.map((line) => {
                        const itemData = enrichedData.items.get(line.itemId);
                        const fromLoc = line.fromLocationId ? enrichedData.locations.get(line.fromLocationId) : null;
                        const toLoc = line.toLocationId ? enrichedData.locations.get(line.toLocationId) : null;
                        const variance = line.actualQuantity != null ? line.actualQuantity - line.requestedQuantity : null;
                        const lineSt = LINE_STATUS_STYLE[line.status] ?? LINE_STATUS_STYLE.PENDING;
                        const canComplete = line.status !== LineStatus.COMPLETED &&
                          (movement.status === 'IN_PROGRESS' || movement.status === 'COMPLETED' || movement.status === 'PARTIALLY_COMPLETED');
                        const canDelete = movement.status !== 'COMPLETED' && movement.status !== 'CANCELLED';

                        return (
                          <tr key={line.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-900/10 transition-colors duration-100">
                            {/* Item */}
                            <td className="px-4 py-3">
                              <p className="font-semibold text-neutral-800 dark:text-neutral-100 whitespace-nowrap">
                                {itemData?.name ?? 'Loading…'}
                              </p>
                              <p className="text-xs text-neutral-400 dark:text-neutral-500">
                                {itemData?.sku ?? line.itemId.slice(0, 10)}
                              </p>
                            </td>

                            {/* From */}
                            <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                              {fromLoc?.code ?? line.fromLocationId?.slice(0, 8) ?? <span className="text-neutral-300">N/A</span>}
                            </td>

                            {/* To */}
                            <td className="px-4 py-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                              {toLoc?.code ?? line.toLocationId?.slice(0, 8) ?? <span className="text-neutral-300">N/A</span>}
                            </td>

                            {/* Requested */}
                            <td className="px-4 py-3 font-semibold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">
                              {line.requestedQuantity} <span className="font-normal text-neutral-400 text-xs">{line.uom}</span>
                            </td>

                            {/* Actual */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {editingLineId === line.id ? (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    value={editingActualQty}
                                    onChange={(e) => setEditingActualQty(Number(e.target.value))}
                                    className="w-20 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    min="0"
                                    autoFocus
                                  />
                                  <button onClick={() => handleUpdateActualQuantity(line.id, editingActualQty)} className="p-1 text-emerald-600 hover:text-emerald-700">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingLineId(null)} className="p-1 text-neutral-400 hover:text-neutral-600">
                                    <XCircle className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                                    {line.actualQuantity != null ? `${line.actualQuantity} ` : <span className="font-normal text-neutral-400">—</span>}
                                    {line.actualQuantity != null && <span className="font-normal text-neutral-400 text-xs">{line.uom}</span>}
                                  </span>
                                  {canDelete && (
                                    <button
                                      onClick={() => { setEditingLineId(line.id); setEditingActualQty(line.actualQuantity ?? line.requestedQuantity); }}
                                      className="p-0.5 text-neutral-300 hover:text-indigo-500 transition-colors"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Variance */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {variance != null ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  variance === 0
                                    ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500'
                                    : variance > 0
                                    ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                                }`}>
                                  {variance > 0 ? '+' : ''}{variance}
                                </span>
                              ) : <span className="text-neutral-300">—</span>}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${lineSt.bg} ${lineSt.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${lineSt.dot}`} />
                                {line.status.replace(/_/g, ' ')}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {canComplete && (
                                  <button
                                    onClick={() => handleCompleteMovementLine(line.id)}
                                    disabled={loading}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold
                                      bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Complete
                                  </button>
                                )}
                                {canDelete && (
                                  <button
                                    onClick={() => handleDeleteLine(line.id)}
                                    disabled={loading}
                                    className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400
                                      hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-50"
                                    title="Delete line"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── TASKS TAB ─────────────────────────────────── */}
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              {tasks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-8 h-8 text-neutral-400" />
                  </div>
                  <h3 className="font-semibold text-neutral-700 dark:text-neutral-300">No tasks assigned</h3>
                  <p className="text-sm text-neutral-500 mt-1">Tasks can be added when creating a movement.</p>
                </div>
              ) : (
                tasks.map((task) => {
                  const isOverdue = task.expectedCompletionTime &&
                    new Date(task.expectedCompletionTime) < new Date() &&
                    task.status !== TaskStatus.COMPLETED &&
                    task.status !== TaskStatus.CANCELLED;

                  const taskStatusStyle = LINE_STATUS_STYLE[task.status] ?? LINE_STATUS_STYLE.PENDING;

                  return (
                    <div
                      key={task.id}
                      className={`rounded-xl border p-4 bg-white dark:bg-neutral-800/80 transition-all duration-200 hover:shadow-md ${
                        isOverdue
                          ? 'border-rose-300 dark:border-rose-700/60 ring-1 ring-rose-200 dark:ring-rose-800/40'
                          : 'border-neutral-200/80 dark:border-neutral-700/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left content */}
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <ClipboardList className="w-4 h-4 text-indigo-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <h4 className="font-semibold text-neutral-800 dark:text-neutral-100 text-sm">
                                {task.taskType.replace(/_/g, ' ')}
                              </h4>
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${taskStatusStyle.bg} ${taskStatusStyle.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${taskStatusStyle.dot}`} />
                                {task.status.replace(/_/g, ' ')}
                              </span>
                              {isOverdue && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                                  <AlertTriangle className="w-3 h-3" />
                                  Overdue
                                </span>
                              )}
                            </div>

                            {task.instructions && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 leading-relaxed">{task.instructions}</p>
                            )}

                            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                              {task.locationId && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3.5 h-3.5" />
                                  {task.locationId.slice(0, 12)}
                                </span>
                              )}
                              {task.assignedUserId && (
                                <span className="flex items-center gap-1">
                                  <User className="w-3.5 h-3.5" />
                                  {task.assignedUserId.slice(0, 12)}
                                </span>
                              )}
                              {task.expectedCompletionTime && (
                                <span className={`flex items-center gap-1 ${isOverdue ? 'text-rose-500 font-medium' : ''}`}>
                                  <Calendar className="w-3.5 h-3.5" />
                                  {format(new Date(task.expectedCompletionTime), 'dd MMM yyyy, HH:mm')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {(task.status === TaskStatus.PENDING || task.status === TaskStatus.ASSIGNED) && (
                            <button
                              onClick={() => handleStartTask(task.id)}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                                bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Start
                            </button>
                          )}
                          {task.status === TaskStatus.IN_PROGRESS && (
                            <button
                              onClick={() => handleCompleteTask(task.id)}
                              disabled={loading}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                                bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Complete
                            </button>
                          )}
                          {task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.CANCELLED && (
                            <button
                              onClick={() => handleCancelTask(task.id)}
                              disabled={loading}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all disabled:opacity-50"
                              title="Cancel task"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovementDetailModal;
