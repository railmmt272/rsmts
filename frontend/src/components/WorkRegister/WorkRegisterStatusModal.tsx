'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed', icon: <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />, cls: 'border-green-300 bg-green-50/70 text-green-800' },
  { value: 'PARTIALLY_COMPLETED', label: 'Partially Completed', icon: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />, cls: 'border-amber-300 bg-amber-50/70 text-amber-800' },
  { value: 'NOT_COMPLETED', label: 'Not Completed', icon: <XCircle className="w-3.5 h-3.5 text-red-600" />, cls: 'border-red-300 bg-red-50/70 text-red-800' },
  { value: 'NOT_ATTENDED', label: 'Not Attended', icon: <Clock className="w-3.5 h-3.5 text-slate-500" />, cls: 'border-slate-300 bg-slate-50 text-slate-700' },
];

interface WorkRegisterStatusModalProps {
  record: { _id: string; status: string };
  onClose: () => void;
  onSuccess: () => void;
}

export default function WorkRegisterStatusModal({ record, onClose, onSuccess }: WorkRegisterStatusModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(record.status);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStatus === record.status) {
      toast.error('Please select a different status to update');
      return;
    }
    setSubmitting(true);
    try {
      await api.patch(`/work-registers/${record._id}`, { status: selectedStatus, remark });
      toast.success('Shift overall status updated');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update status');
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
            <h3 className="text-sm font-semibold text-gray-900">Update Shift Status</h3>
            <p className="text-xs text-gray-500">Change overall status for this shift register</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Select New Status
            </label>
            <div className="space-y-1.5">
              {STATUS_OPTIONS.map(opt => (
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
                  {opt.value === record.status && (
                    <span className="ml-auto text-[10px] text-gray-400 font-normal">(current)</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Status Change Remark <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={2}
              placeholder="e.g. Completed during shift, handed over..."
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
              disabled={submitting || selectedStatus === record.status}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-gray-900 border border-transparent rounded-lg hover:bg-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-xs"
            >
              {submitting ? 'Updating...' : 'Save Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
