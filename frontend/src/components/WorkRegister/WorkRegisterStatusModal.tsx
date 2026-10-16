'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

const STATUS_OPTIONS = [
  { value: 'COMPLETED', label: 'Completed', icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, cls: 'border-green-300 bg-green-50 text-green-800' },
  { value: 'PARTIALLY_COMPLETED', label: 'Partially Completed', icon: <AlertCircle className="w-4 h-4 text-blue-600" />, cls: 'border-blue-300 bg-blue-50 text-blue-800' },
  { value: 'NOT_COMPLETED', label: 'Not Completed', icon: <XCircle className="w-4 h-4 text-red-600" />, cls: 'border-red-300 bg-red-50 text-red-800' },
  { value: 'NOT_ATTENDED', label: 'Not Attended', icon: <Clock className="w-4 h-4 text-yellow-600" />, cls: 'border-yellow-300 bg-yellow-50 text-yellow-800' },
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
      toast.success('Status updated successfully');
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
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Change Status</h3>
            <p className="text-sm text-gray-500 mt-0.5">Select a new status and optionally add a remark</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">New Status</label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                    selectedStatus === opt.value
                      ? `${opt.cls} border-opacity-100`
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                  {opt.value === record.status && (
                    <span className="ml-auto text-xs text-gray-400 font-normal">(current)</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Remark <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={3}
              placeholder="Reason for status change..."
              className="block w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || selectedStatus === record.status}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : 'Update Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
