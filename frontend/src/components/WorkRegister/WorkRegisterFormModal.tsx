'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

const SHIFT_OPTIONS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'STAGGERED', label: 'Staggered' },
  { value: 'NIGHT', label: 'Night' },
];
const STATUS_OPTIONS = [
  { value: 'NOT_ATTENDED', label: 'Not Attended' },
  { value: 'PARTIALLY_COMPLETED', label: 'Partially Completed' },
  { value: 'NOT_COMPLETED', label: 'Not Completed' },
  { value: 'COMPLETED', label: 'Completed' },
];

interface PendingProgram {
  _id: string;
  shop: string;
  rsType: string;
  rsNo: string;
  initialPosition: string;
  finalPosition?: string;
}

interface WorkRegisterFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recordToEdit?: any;
}

export default function WorkRegisterFormModal({
  isOpen,
  onClose,
  onSuccess,
  recordToEdit,
}: WorkRegisterFormModalProps) {
  const [pendingPrograms, setPendingPrograms] = useState<PendingProgram[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('');
  const [status, setStatus] = useState('NOT_ATTENDED');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;

    fetchPendingPrograms();

    if (recordToEdit) {
      setSelectedProgramId(recordToEdit.shuntingProgram?._id ?? '');
      setDate(recordToEdit.date ? recordToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setShift(recordToEdit.shift ?? '');
      setStatus(recordToEdit.status ?? 'NOT_ATTENDED');
      setRemark(recordToEdit.remark ?? '');
    } else {
      setSelectedProgramId('');
      setDate(new Date().toISOString().split('T')[0]);
      setShift('');
      setStatus('NOT_ATTENDED');
      setRemark('');
    }
  }, [isOpen, recordToEdit]);

  const fetchPendingPrograms = async () => {
    try {
      const res = await api.get('/work-registers/pending-programs');
      setPendingPrograms(res.data);
    } catch {
      console.error('Failed to fetch pending programs');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) {
      toast.error('Please select a shift');
      return;
    }
    if (!recordToEdit && !selectedProgramId) {
      toast.error('Please select a shunting program');
      return;
    }

    setSubmitting(true);
    try {
      if (recordToEdit) {
        await api.patch(`/work-registers/${recordToEdit._id}`, { shift, date, remark });
        toast.success('Work register updated successfully');
      } else {
        await api.post('/work-registers', {
          shuntingProgramId: selectedProgramId,
          date,
          shift,
          status,
          remark,
        });
        toast.success('Work register created successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save record');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedProgram = pendingPrograms.find(p => p._id === selectedProgramId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {recordToEdit ? 'Edit Work Register' : 'Register Work'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {recordToEdit ? 'Update shift or date details' : 'Link a pending shunting program to a shift'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          <form id="wr-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Program selector — only for create */}
            {!recordToEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Pending Shunting Program <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedProgramId}
                  onChange={e => setSelectedProgramId(e.target.value)}
                  required
                  className="block w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white text-sm"
                >
                  <option value="" disabled>Select a pending program...</option>
                  {pendingPrograms.length === 0 && (
                    <option disabled>No pending programs available</option>
                  )}
                  {pendingPrograms.map(p => (
                    <option key={p._id} value={p._id}>
                      [{p.shop}] {p.rsType} — {p.rsNo} ({p.initialPosition}{p.finalPosition ? ` → ${p.finalPosition}` : ''})
                    </option>
                  ))}
                </select>
                {selectedProgram && (
                  <p className="text-xs text-gray-500 mt-1">
                    Shop: <strong>{selectedProgram.shop}</strong> · RS Type: <strong>{selectedProgram.rsType}</strong> · RS No: <strong>{selectedProgram.rsNo}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
                className="block w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
              />
            </div>

            {/* Shift */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Shift <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-3 gap-2">
                {SHIFT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setShift(opt.value)}
                    className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                      shift === opt.value
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status — only on create */}
            {!recordToEdit && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Initial Status</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="block w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white text-sm"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Remark */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Remarks <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={remark}
                onChange={e => setRemark(e.target.value)}
                rows={3}
                placeholder="Add any relevant notes..."
                className="block w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm resize-none"
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="wr-form"
            disabled={submitting}
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
            ) : recordToEdit ? 'Save Changes' : 'Register Work'}
          </button>
        </div>
      </div>
    </div>
  );
}
