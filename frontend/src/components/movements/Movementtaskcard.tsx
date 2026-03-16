import React, { useState } from 'react';
import { PlayCircle, CheckCircle, XCircle, User, Clock, MapPin, AlertCircle } from 'lucide-react';
import { MovementTask, TaskStatus, TaskType } from '../../types';
import { movementService } from '../../services/movement.service';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { promptInput, confirmAction } from '@/utils/confirmDialog';

interface MovementTaskCardProps {
  task: MovementTask;
  onUpdate: () => void;
}

const MovementTaskCard: React.FC<MovementTaskCardProps> = ({ task, onUpdate }) => {
  const [loading, setLoading] = useState(false);

  const getStatusColor = (status: TaskStatus) => {
    const colors = {
      [TaskStatus.PENDING]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      [TaskStatus.ASSIGNED]: 'bg-blue-100 text-blue-800 border-blue-300',
      [TaskStatus.IN_PROGRESS]: 'bg-purple-100 text-purple-800 border-purple-300',
      [TaskStatus.COMPLETED]: 'bg-green-100 text-green-800 border-green-300',
      [TaskStatus.CANCELLED]: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getTaskTypeIcon = (type: TaskType) => {
    const icons = {
      [TaskType.PICK]: '📦',
      [TaskType.PACK]: '📦',
      [TaskType.PUTAWAY]: '📥',
      [TaskType.COUNT]: '🔢',
      [TaskType.INSPECT]: '🔍',
      [TaskType.LOAD]: '🚛',
      [TaskType.UNLOAD]: '📤',
      [TaskType.SHIP]: '🏭',
      [TaskType.TRANSFER]: '♻️',
      [TaskType.RECEIVE]: '📥'
    };
    return icons[type] || '📋';
  };

  const handleAssign = async () => {
    const userId = await promptInput('Assign Task', 'User ID to assign this task to', 'e.g. usr-abc12345…');
    if (!userId) return;

    try {
      setLoading(true);
      await movementService.assignTask(task.id, userId);
      toast.success('Task assigned successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Error assigning task:', error);
      toast.error(error.message || 'Failed to assign task');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      await movementService.startTask(task.id);
      toast.success('Task started');
      onUpdate();
    } catch (error: any) {
      console.error('Error starting task:', error);
      toast.error(error.message || 'Failed to start task');
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoading(true);
      await movementService.completeTask(task.id);
      toast.success('Task completed successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Error completing task:', error);
      toast.error(error.message || 'Failed to complete task');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    const reason = await promptInput('Cancel Task', 'Reason for cancellation', 'e.g. No longer needed…');
    if (!reason) return;

    try {
      setLoading(true);
      await movementService.cancelTask(task.id, reason);
      toast.success('Task cancelled');
      onUpdate();
    } catch (error: any) {
      console.error('Error cancelling task:', error);
      toast.error(error.message || 'Failed to cancel task');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableActions = () => {
    const actions = [];

    if (task.status === TaskStatus.PENDING) {
      actions.push({ label: 'Assign', action: handleAssign, icon: User, color: 'blue' });
    }

    if (task.status === TaskStatus.ASSIGNED) {
      actions.push({ label: 'Start', action: handleStart, icon: PlayCircle, color: 'green' });
    }

    if (task.status === TaskStatus.IN_PROGRESS) {
      actions.push({ label: 'Complete', action: handleComplete, icon: CheckCircle, color: 'green' });
    }

    if ([TaskStatus.PENDING, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS].includes(task.status)) {
      actions.push({ label: 'Cancel', action: handleCancel, icon: XCircle, color: 'red' });
    }

    return actions;
  };

  const isOverdue = task.expectedCompletionTime &&
    new Date(task.expectedCompletionTime) < new Date() &&
    task.status !== TaskStatus.COMPLETED &&
    task.status !== TaskStatus.CANCELLED;

  return (
    <div className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${
      isOverdue ? 'border-red-300 bg-red-50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-2xl">{getTaskTypeIcon(task.taskType)}</div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">
              {task.taskType}
            </h4>
            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
              {task.status}
            </span>
          </div>
        </div>

        {isOverdue && (
          <div className="flex items-center text-red-600 text-sm font-medium">
            <AlertCircle className="w-4 h-4 mr-1" />
            Overdue
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        {task.assignedUserId && (
          <div className="flex items-center text-gray-600">
            <User className="w-4 h-4 mr-2 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Assigned To</div>
              <div className="font-mono text-gray-900">{task.assignedUserId.slice(0, 8)}...</div>
            </div>
          </div>
        )}

        {task.locationId && (
          <div className="flex items-center text-gray-600">
            <MapPin className="w-4 h-4 mr-2 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Location</div>
              <div className="font-mono text-gray-900">{task.locationId.slice(0, 8)}...</div>
            </div>
          </div>
        )}

        {task.scheduledStartTime && (
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Scheduled Start</div>
              <div className="text-gray-900">{format(new Date(task.scheduledStartTime), 'MMM dd, HH:mm')}</div>
            </div>
          </div>
        )}

        {task.expectedCompletionTime && (
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Expected Completion</div>
              <div className="text-gray-900">{format(new Date(task.expectedCompletionTime), 'MMM dd, HH:mm')}</div>
            </div>
          </div>
        )}

        {task.actualStartTime && (
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Started At</div>
              <div className="text-gray-900">{format(new Date(task.actualStartTime), 'MMM dd, HH:mm')}</div>
            </div>
          </div>
        )}

        {task.actualCompletionTime && (
          <div className="flex items-center text-gray-600">
            <CheckCircle className="w-4 h-4 mr-2 text-green-400" />
            <div>
              <div className="text-xs text-gray-500">Completed At</div>
              <div className="text-gray-900">{format(new Date(task.actualCompletionTime), 'MMM dd, HH:mm')}</div>
            </div>
          </div>
        )}

        {task.durationMinutes && (
          <div className="flex items-center text-gray-600">
            <Clock className="w-4 h-4 mr-2 text-gray-400" />
            <div>
              <div className="text-xs text-gray-500">Duration</div>
              <div className="text-gray-900">{task.durationMinutes} minutes</div>
            </div>
          </div>
        )}
      </div>

      {task.instructions && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md text-sm text-gray-700">
          <div className="font-medium text-gray-900 mb-1">Instructions:</div>
          {task.instructions}
        </div>
      )}

      {task.notes && (
        <div className="mb-4 text-sm text-gray-600 italic">
          {task.notes}
        </div>
      )}

      {getAvailableActions().length > 0 && (
        <div className="flex items-center space-x-2 pt-3 border-t">
          {getAvailableActions().map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              disabled={loading}
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-${action.color}-600 hover:bg-${action.color}-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${action.color}-500 disabled:opacity-50`}
              style={{
                backgroundColor: action.color === 'blue' ? '#2563eb' : 
                               action.color === 'green' ? '#16a34a' : '#dc2626'
              }}
            >
              <action.icon className="w-4 h-4 mr-1" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MovementTaskCard;