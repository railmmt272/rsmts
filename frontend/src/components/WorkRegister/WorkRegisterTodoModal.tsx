'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

const TODO_STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed', icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />, cls: 'border-green-300 bg-green-50/70 text-green-800' },
  { value: 'PARTIALLY_COMPLETED', label: 'Partially Completed', icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />, cls: 'border-amber-300 bg-amber-50/70 text-amber-800' },
  { value: 'NOT_COMPLETED', label: 'Not Completed', icon: <XCircle className="w-3.5 h-3.5 text-slate-500" />, cls: 'border-slate-300 bg-slate-50 text-slate-700' },
];

interface WorkRegisterTodoModalProps {
  workRegisterId: string;
  todo: {
    _id: string;
    task: string;
    status: string;
    remark?: string;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function WorkRegisterTodoModal({
  workRegisterId,
  todo,
  onClose,
  onSuccess,
}: WorkRegisterTodoModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(todo.status);
  const [remark, setRemark] = useState(todo.remark || '');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/work-registers/${workRegisterId}/todos/${todo._id}`, {
        status: selectedStatus,
        remark,
      });
      toast.success('Task status updated');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update task status');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-sm rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Update Task Status</h3>
            <p className="text-[11px] text-gray-500 truncate max-w-[240px]">{todo.task}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Task Status
            </label>
            <div className="space-y-1.5">
              {TODO_STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                    selectedStatus === opt.value
                      ? `${opt.cls} border-opacity-100 font-semibold ring-1 ring-gray-900/10`
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                  {opt.value === todo.status && (
                    <span className="ml-auto text-[10px] text-gray-400 font-normal">(current)</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Remark / Note <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={2}
              placeholder="e.g. Completed with 2 shunters, delayed by 15 mins..."
              className="block w-full border border-gray-300 rounded-lg p-2 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none placeholder:text-gray-400"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gray-900 border border-transparent rounded-lg hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? 'Saving...' : 'Update Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
