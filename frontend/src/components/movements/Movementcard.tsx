// frontend/src/components/movements/Movementcard.tsx

import {
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, ScanLine,
  Warehouse, Undo2, Scale, RefreshCcw, ShieldAlert, MoveRight,
  MapPin, Calendar, Layers, ClipboardList,
  Play, CheckCircle2, PauseCircle, RotateCcw, Trash2,
} from 'lucide-react';
import { Movement, MovementStatus, MovementPriority, MovementType } from '@/types';
import { format } from 'date-fns';
import { confirmAction, confirmDelete, confirmWarning } from '@/utils/confirmDialog';

interface MovementCardProps {
  movement: Movement;
  onClick: () => void;
  onStatusChange: (id: string, status: MovementStatus) => void;
  onDelete: (id: string) => void;
}

// ─── Type config ───────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  accent: string;
  label: string;
}> = {
  [MovementType.RECEIPT]:    { icon: ArrowDownCircle, iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconColor: 'text-emerald-600 dark:text-emerald-400', accent: 'bg-emerald-500', label: 'Receipt' },
  [MovementType.ISSUE]:      { icon: ArrowUpCircle,   iconBg: 'bg-rose-100 dark:bg-rose-900/50',       iconColor: 'text-rose-600 dark:text-rose-400',       accent: 'bg-rose-500',    label: 'Issue' },
  [MovementType.TRANSFER]:   { icon: ArrowLeftRight,  iconBg: 'bg-indigo-100 dark:bg-indigo-900/50',   iconColor: 'text-indigo-600 dark:text-indigo-400',   accent: 'bg-indigo-500',  label: 'Transfer' },
  [MovementType.PICKING]:    { icon: ScanLine,        iconBg: 'bg-amber-100 dark:bg-amber-900/50',     iconColor: 'text-amber-600 dark:text-amber-400',     accent: 'bg-amber-500',   label: 'Picking' },
  [MovementType.PUTAWAY]:    { icon: Warehouse,       iconBg: 'bg-teal-100 dark:bg-teal-900/50',       iconColor: 'text-teal-600 dark:text-teal-400',       accent: 'bg-teal-500',    label: 'Put-Away' },
  [MovementType.RETURN]:     { icon: Undo2,           iconBg: 'bg-orange-100 dark:bg-orange-900/50',   iconColor: 'text-orange-600 dark:text-orange-400',   accent: 'bg-orange-500',  label: 'Return' },
  [MovementType.ADJUSTMENT]: { icon: Scale,           iconBg: 'bg-violet-100 dark:bg-violet-900/50',   iconColor: 'text-violet-600 dark:text-violet-400',   accent: 'bg-violet-500',  label: 'Adjustment' },
  [MovementType.CYCLE_COUNT]:{ icon: RefreshCcw,      iconBg: 'bg-blue-100 dark:bg-blue-900/50',       iconColor: 'text-blue-600 dark:text-blue-400',       accent: 'bg-blue-500',    label: 'Cycle Count' },
  [MovementType.RELOCATION]: { icon: MoveRight,       iconBg: 'bg-sky-100 dark:bg-sky-900/50',         iconColor: 'text-sky-600 dark:text-sky-400',         accent: 'bg-sky-500',     label: 'Relocation' },
  [MovementType.QUARANTINE]: { icon: ShieldAlert,     iconBg: 'bg-red-100 dark:bg-red-900/50',         iconColor: 'text-red-600 dark:text-red-400',         accent: 'bg-red-500',     label: 'Quarantine' },
};

// ─── Status config ─────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; pulse?: boolean }> = {
  DRAFT:               { bg: 'bg-slate-100 dark:bg-slate-700/60',    text: 'text-slate-600 dark:text-slate-300',   dot: 'bg-slate-400' },
  PENDING:             { bg: 'bg-amber-100 dark:bg-amber-900/40',    text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500' },
  IN_PROGRESS:         { bg: 'bg-blue-100 dark:bg-blue-900/40',      text: 'text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500', pulse: true },
  PARTIALLY_COMPLETED: { bg: 'bg-cyan-100 dark:bg-cyan-900/40',      text: 'text-cyan-700 dark:text-cyan-300',     dot: 'bg-cyan-500', pulse: true },
  COMPLETED:           { bg: 'bg-emerald-100 dark:bg-emerald-900/40',text: 'text-emerald-700 dark:text-emerald-300',dot: 'bg-emerald-500' },
  CANCELLED:           { bg: 'bg-red-100 dark:bg-red-900/40',        text: 'text-red-700 dark:text-red-300',       dot: 'bg-red-500' },
  ON_HOLD:             { bg: 'bg-orange-100 dark:bg-orange-900/40',  text: 'text-orange-700 dark:text-orange-300', dot: 'bg-orange-500' },
};

// ─── Priority config ───────────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { bg: string; text: string }> = {
  LOW:      { bg: 'bg-slate-100 dark:bg-slate-700/60',  text: 'text-slate-500 dark:text-slate-400' },
  NORMAL:   { bg: 'bg-blue-100 dark:bg-blue-900/40',    text: 'text-blue-600 dark:text-blue-400' },
  HIGH:     { bg: 'bg-orange-100 dark:bg-orange-900/40',text: 'text-orange-600 dark:text-orange-400' },
  URGENT:   { bg: 'bg-rose-100 dark:bg-rose-900/40',    text: 'text-rose-600 dark:text-rose-400' },
  CRITICAL: { bg: 'bg-red-100 dark:bg-red-900/40',      text: 'text-red-700 dark:text-red-400' },
};

// ─── Component ─────────────────────────────────────────────────────
const MovementCard = ({ movement, onClick, onStatusChange, onDelete }: MovementCardProps) => {
  const typeConfig = TYPE_CONFIG[movement.type] ?? TYPE_CONFIG[MovementType.TRANSFER];
  const statusConfig = STATUS_CONFIG[movement.status] ?? STATUS_CONFIG.DRAFT;
  const priorityConfig = PRIORITY_CONFIG[movement.priority] ?? PRIORITY_CONFIG.NORMAL;
  const Icon = typeConfig.icon;

  const isFinal = movement.status === MovementStatus.COMPLETED || movement.status === MovementStatus.CANCELLED;

  const handleStart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmAction('Start Movement', 'Begin processing this movement?', 'Start');
    if (!ok) return;
    onStatusChange(movement.id, MovementStatus.IN_PROGRESS);
  };

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmAction('Complete Movement', 'Mark this movement as fully completed? Inventory will be updated.', 'Complete');
    if (!ok) return;
    onStatusChange(movement.id, MovementStatus.COMPLETED);
  };

  const handleHold = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmWarning('Put On Hold', 'Pause this movement and put it on hold?', 'Hold');
    if (!ok) return;
    onStatusChange(movement.id, MovementStatus.ON_HOLD);
  };

  const handleRelease = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirmAction('Release Hold', 'Resume this movement from hold?', 'Release');
    if (!ok) return;
    onStatusChange(movement.id, MovementStatus.IN_PROGRESS);
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onDelete(movement.id);
  };

  const formattedDate = movement.movementDate
    ? format(new Date(movement.movementDate), 'dd MMM yyyy')
    : null;

  const lineCount = movement.totalLines ?? movement.lines?.length ?? 0;
  const taskCount = movement.pendingTasks ?? movement.tasks?.length ?? 0;

  return (
    <div
      onClick={onClick}
      className="group flex overflow-hidden rounded-2xl bg-white dark:bg-neutral-800/90
        border border-neutral-200/80 dark:border-neutral-700/60
        shadow-sm hover:shadow-lg hover:-translate-y-0.5
        transition-all duration-300 cursor-pointer"
    >
      {/* Left accent bar */}
      <div className={`w-1 flex-shrink-0 ${typeConfig.accent}`} />

      {/* Card body */}
      <div className="flex-1 p-5 min-w-0">

        {/* ── Top row ──────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Type icon */}
            <div className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${typeConfig.iconBg}`}>
              <Icon className={`w-5 h-5 ${typeConfig.iconColor}`} />
            </div>

            {/* Title + type label */}
            <div className="min-w-0">
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 truncate leading-tight">
                {movement.referenceNumber || `MVT-${movement.id.slice(0, 8).toUpperCase()}`}
              </h3>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                {typeConfig.label}
              </span>
            </div>
          </div>

          {/* Right badges */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {/* Status badge */}
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.bg} ${statusConfig.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
              {movement.status.replace('_', ' ')}
            </span>
            {/* Priority badge */}
            {movement.priority && movement.priority !== MovementPriority.NORMAL && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.bg} ${priorityConfig.text}`}>
                {movement.priority}
              </span>
            )}
          </div>
        </div>

        {/* ── Info grid ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
          {(movement.sourceLocationName || movement.sourceLocationId) && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 truncate">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
              <span className="truncate">
                <span className="text-neutral-400">From</span>{' '}
                <span className="font-medium text-neutral-600 dark:text-neutral-300">
                  {movement.sourceLocationName || movement.sourceLocationId?.slice(0, 8)}
                </span>
              </span>
            </div>
          )}

          {(movement.destinationLocationName || movement.destinationLocationId) && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 truncate">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
              <span className="truncate">
                <span className="text-neutral-400">To</span>{' '}
                <span className="font-medium text-neutral-600 dark:text-neutral-300">
                  {movement.destinationLocationName || movement.destinationLocationId?.slice(0, 8)}
                </span>
              </span>
            </div>
          )}

          {movement.warehouseName && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 truncate">
              <Warehouse className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
              <span className="font-medium text-neutral-600 dark:text-neutral-300 truncate">
                {movement.warehouseName}
              </span>
            </div>
          )}

          {formattedDate && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-neutral-400" />
              <span className="font-medium text-neutral-600 dark:text-neutral-300">{formattedDate}</span>
            </div>
          )}
        </div>

        {/* ── Footer ───────────────────────────────────────── */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-between pt-4 border-t border-neutral-100 dark:border-neutral-700/60"
        >
          {/* Line + task counts */}
          <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span className="font-medium">{lineCount}</span> line{lineCount !== 1 ? 's' : ''}
            </span>
            <span className="text-neutral-300 dark:text-neutral-600">•</span>
            <span className="flex items-center gap-1">
              <ClipboardList className="w-3.5 h-3.5" />
              <span className="font-medium">{taskCount}</span> task{taskCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1.5">
            {/* DRAFT or PENDING → Start */}
            {(movement.status === MovementStatus.DRAFT || movement.status === MovementStatus.PENDING) && (
              <button
                onClick={handleStart}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-indigo-600 hover:bg-indigo-700 text-white transition-colors duration-150 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                Start
              </button>
            )}

            {/* IN_PROGRESS → Complete + Hold */}
            {(movement.status === MovementStatus.IN_PROGRESS || movement.status === MovementStatus.PARTIALLY_COMPLETED) && (
              <>
                <button
                  onClick={handleComplete}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    bg-emerald-600 hover:bg-emerald-700 text-white transition-colors duration-150 shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Complete
                </button>
                <button
                  onClick={handleHold}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                    bg-amber-500 hover:bg-amber-600 text-white transition-colors duration-150 shadow-sm"
                >
                  <PauseCircle className="w-3.5 h-3.5" />
                  Hold
                </button>
              </>
            )}

            {/* ON_HOLD → Release */}
            {movement.status === MovementStatus.ON_HOLD && (
              <button
                onClick={handleRelease}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                  bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-150 shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Release
              </button>
            )}

            {/* Delete — always visible on non-final */}
            {!isFinal && (
              <button
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 dark:hover:text-rose-400
                  hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-150"
                title="Delete movement"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovementCard;
