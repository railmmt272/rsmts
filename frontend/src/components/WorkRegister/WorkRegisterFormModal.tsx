'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ChevronDown, Search, ArrowRight, Check, AlertCircle, TrainFront } from 'lucide-react';
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

const SHOP_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  WAGON: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  LOCO: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  CRANE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MANUFACTURING: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

interface PendingProgram {
  _id: string;
  shop: string;
  rsType: string;
  rsNo: string;
  initialPosition: string;
  finalPosition?: string;
  remark?: string;
  createdAt?: string;
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
  const [locations, setLocations] = useState<any[]>([]);
  const [assetCategories, setAssetCategories] = useState<any[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('');
  const [status, setStatus] = useState('NOT_ATTENDED');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Custom Dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toast = useToast();

  useEffect(() => {
    if (!isOpen) {
      setIsDropdownOpen(false);
      setSearchTerm('');
      return;
    }

    fetchPendingPrograms();
    fetchLocationsAndCategories();

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

  // Click outside listener for custom dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPendingPrograms = async () => {
    try {
      setLoadingPrograms(true);
      const res = await api.get('/work-registers/pending-programs');
      setPendingPrograms(res.data);
    } catch {
      console.error('Failed to fetch pending programs');
    } finally {
      setLoadingPrograms(false);
    }
  };

  const fetchLocationsAndCategories = async () => {
    try {
      const [locRes, catRes] = await Promise.all([
        api.get('/locations?isActive=true').catch(() => ({ data: [] })),
        api.get('/asset-categories').catch(() => ({ data: [] })),
      ]);
      setLocations(locRes.data || []);
      setAssetCategories(catRes.data || []);
    } catch (e) {
      console.error('Failed to fetch metadata', e);
    }
  };

  const locationMap = useMemo(() => {
    const map: Record<string, string> = {};
    locations.forEach(l => { if (l.code) map[l.code] = l.name || l.code; });
    return map;
  }, [locations]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    assetCategories.forEach(c => { if (c.code) map[c.code] = c.name || c.code; });
    return map;
  }, [assetCategories]);

  const formatLoc = (code?: string) => {
    if (!code) return '-';
    return locationMap[code] || code.replace(/_/g, ' ');
  };

  const formatCat = (code?: string) => {
    if (!code) return '-';
    return categoryMap[code] || code.replace(/_/g, ' ');
  };

  const filteredPrograms = useMemo(() => {
    if (!searchTerm.trim()) return pendingPrograms;
    const lower = searchTerm.toLowerCase();
    return pendingPrograms.filter(p => {
      const rsNoMatch = p.rsNo?.toLowerCase().includes(lower);
      const shopMatch = p.shop?.toLowerCase().includes(lower);
      const typeMatch = p.rsType?.toLowerCase().includes(lower) || formatCat(p.rsType).toLowerCase().includes(lower);
      const initMatch = p.initialPosition?.toLowerCase().includes(lower) || formatLoc(p.initialPosition).toLowerCase().includes(lower);
      const finalMatch = p.finalPosition?.toLowerCase().includes(lower) || formatLoc(p.finalPosition).toLowerCase().includes(lower);
      return rsNoMatch || shopMatch || typeMatch || initMatch || finalMatch;
    });
  }, [pendingPrograms, searchTerm, locationMap, categoryMap]);

  const selectedProgram = useMemo(() => {
    return pendingPrograms.find(p => p._id === selectedProgramId) ||
      (recordToEdit?.shuntingProgram?._id === selectedProgramId ? recordToEdit.shuntingProgram : null);
  }, [pendingPrograms, selectedProgramId, recordToEdit]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-xl rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/5">
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
        <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
          <form id="wr-form" onSubmit={handleSubmit} className="space-y-5">

            {/* Program selector — only for create */}
            {!recordToEdit && (
              <div ref={dropdownRef} className="relative">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Pending Shunting Program <span className="text-red-500">*</span>
                </label>

                {/* Dropdown Trigger Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(prev => !prev)}
                  className={`w-full flex items-center justify-between border rounded-lg p-3 text-left transition-all ${
                    isDropdownOpen
                      ? 'border-gray-900 ring-2 ring-gray-900/10'
                      : 'border-gray-300 hover:border-gray-400'
                  } bg-white`}
                >
                  {selectedProgram ? (
                    <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase shrink-0 ${SHOP_BADGES[selectedProgram.shop]?.bg || 'bg-gray-100'} ${SHOP_BADGES[selectedProgram.shop]?.text || 'text-gray-800'} ${SHOP_BADGES[selectedProgram.shop]?.border || 'border-gray-200'}`}>
                        {selectedProgram.shop}
                      </span>
                      <span className="font-semibold text-gray-900 text-sm shrink-0">
                        {selectedProgram.rsNo}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        ({formatCat(selectedProgram.rsType)})
                      </span>
                      <span className="text-xs text-gray-400 ml-auto hidden sm:inline-flex items-center gap-1 shrink-0">
                        {formatLoc(selectedProgram.initialPosition)}
                        {selectedProgram.finalPosition && ` → ${formatLoc(selectedProgram.finalPosition)}`}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-400">
                      {loadingPrograms ? 'Loading pending programs...' : 'Select a pending program...'}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Custom Popover Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden flex flex-col max-h-72">
                    {/* Search Bar inside Dropdown */}
                    <div className="p-2.5 border-b border-gray-100 bg-gray-50/70">
                      <div className="relative">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                          placeholder="Search RS No, type, shop, or location..."
                          className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto divide-y divide-gray-100 p-1 flex-1">
                      {filteredPrograms.length === 0 ? (
                        <div className="py-6 text-center text-xs text-gray-400">
                          {pendingPrograms.length === 0 ? 'No pending programs found.' : 'No matching programs found.'}
                        </div>
                      ) : (
                        filteredPrograms.map(p => {
                          const badge = SHOP_BADGES[p.shop] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' };
                          const isSelected = selectedProgramId === p._id;
                          return (
                            <div
                              key={p._id}
                              onClick={() => {
                                setSelectedProgramId(p._id);
                                setIsDropdownOpen(false);
                                setSearchTerm('');
                              }}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? 'bg-gray-100/80 font-medium' : 'hover:bg-gray-50'
                              }`}
                            >
                              {/* Top row: Shop + RS No + Type */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${badge.bg} ${badge.text} ${badge.border}`}>
                                    {p.shop}
                                  </span>
                                  <span className="font-semibold text-gray-900 text-sm">
                                    {p.rsNo}
                                  </span>
                                  <span className="text-xs text-gray-600">
                                    · {formatCat(p.rsType)}
                                  </span>
                                </div>
                                {isSelected && <Check className="w-4 h-4 text-gray-900 shrink-0" />}
                              </div>

                              {/* Route row */}
                              <div className="flex items-center gap-1.5 text-xs text-gray-600 mt-1.5">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="font-medium text-gray-800">{formatLoc(p.initialPosition)}</span>
                                {p.finalPosition && (
                                  <>
                                    <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                                    <span className="font-medium text-gray-800">{formatLoc(p.finalPosition)}</span>
                                  </>
                                )}
                              </div>

                              {/* Program Remark */}
                              {p.remark && (
                                <p className="text-[11px] text-gray-500 mt-1.5 italic bg-white px-2 py-0.5 rounded border border-gray-100 line-clamp-1">
                                  {p.remark}
                                </p>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Selected Program Detailed Info Card */}
                {selectedProgram && (
                  <div className="mt-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                        Program Details
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${SHOP_BADGES[selectedProgram.shop]?.bg || 'bg-gray-100'} ${SHOP_BADGES[selectedProgram.shop]?.text || 'text-gray-800'} ${SHOP_BADGES[selectedProgram.shop]?.border || 'border-gray-200'}`}>
                        {selectedProgram.shop}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">RS Number</span>
                        <span className="font-bold text-gray-900">{selectedProgram.rsNo}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">RS Type</span>
                        <span className="font-medium text-gray-800">{formatCat(selectedProgram.rsType)}</span>
                      </div>
                      <div className="col-span-2 pt-1">
                        <span className="text-gray-400 block text-[10px] uppercase font-semibold">Route</span>
                        <div className="flex items-center gap-1.5 font-medium text-gray-800 mt-0.5">
                          <span className="text-emerald-700">{formatLoc(selectedProgram.initialPosition)}</span>
                          {selectedProgram.finalPosition && (
                            <>
                              <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span className="text-blue-700">{formatLoc(selectedProgram.finalPosition)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {selectedProgram.remark && (
                        <div className="col-span-2 mt-1 bg-white p-2 rounded border border-gray-200">
                          <span className="text-gray-400 block text-[10px] uppercase font-semibold mb-0.5">Remarks</span>
                          <span className="text-gray-700 italic">{selectedProgram.remark}</span>
                        </div>
                      )}
                    </div>
                  </div>
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
