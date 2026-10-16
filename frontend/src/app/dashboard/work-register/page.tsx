'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { BookOpen, Plus, CheckCircle2, Clock, AlertCircle, XCircle, Edit2, Trash2, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import WorkRegisterFormModal from '@/components/WorkRegister/WorkRegisterFormModal';
import WorkRegisterStatusModal from '@/components/WorkRegister/WorkRegisterStatusModal';

interface StatusHistoryEntry {
  _id: string;
  status: string;
  remark?: string;
  changedBy: { name: string; email: string } | null;
  changedAt: string;
}

interface ShuntingProgramRef {
  _id: string;
  shop: string;
  rsType: string;
  rsNo: string;
  initialPosition: string;
  finalPosition?: string;
  remark?: string;
}

interface WorkRegister {
  _id: string;
  shuntingProgram: ShuntingProgramRef;
  date: string;
  shift: 'MORNING' | 'STAGGERED' | 'NIGHT';
  status: 'COMPLETED' | 'NOT_ATTENDED' | 'PARTIALLY_COMPLETED' | 'NOT_COMPLETED';
  remark?: string;
  statusHistory: StatusHistoryEntry[];
  createdBy: { name: string; email: string } | null;
  createdAt: string;
}

const SHIFT_LABELS: Record<string, string> = { MORNING: 'Morning', STAGGERED: 'Staggered', NIGHT: 'Night' };
const SHIFT_COLORS: Record<string, string> = {
  MORNING: 'bg-amber-100 text-amber-800',
  STAGGERED: 'bg-blue-100 text-blue-800',
  NIGHT: 'bg-indigo-100 text-indigo-800',
};
const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  NOT_ATTENDED: 'Not Attended',
  PARTIALLY_COMPLETED: 'Partially Completed',
  NOT_COMPLETED: 'Not Completed',
};
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-800',
  NOT_ATTENDED: 'bg-yellow-100 text-yellow-800',
  PARTIALLY_COMPLETED: 'bg-blue-100 text-blue-800',
  NOT_COMPLETED: 'bg-red-100 text-red-800',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="w-3 h-3" />,
  NOT_ATTENDED: <Clock className="w-3 h-3" />,
  PARTIALLY_COMPLETED: <AlertCircle className="w-3 h-3" />,
  NOT_COMPLETED: <XCircle className="w-3 h-3" />,
};

export default function WorkRegisterPage() {
  const [records, setRecords] = useState<WorkRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<WorkRegister | null>(null);
  const [statusModalRecord, setStatusModalRecord] = useState<WorkRegister | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const { user } = useAuth();
  const canWrite = user?.role === 'WAGON_ADMIN' || user?.role === 'TPT_RAIL_ADMIN';

  const [locations, setLocations] = useState<any[]>([]);
  const [assetCategories, setAssetCategories] = useState<any[]>([]);

  useEffect(() => {
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [locRes, catRes] = await Promise.all([
        api.get('/locations?isActive=true').catch(() => ({ data: [] })),
        api.get('/asset-categories').catch(() => ({ data: [] })),
      ]);
      setLocations(locRes.data || []);
      setAssetCategories(catRes.data || []);
    } catch (e) {
      console.error('Failed to load metadata', e);
    }
  };

  const locationMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    locations.forEach(l => { if (l.code) map[l.code] = l.name || l.code; });
    return map;
  }, [locations]);

  const categoryMap = React.useMemo(() => {
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

  useEffect(() => {
    fetchRecords();
  }, [startDate, endDate, shiftFilter, statusFilter]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (shiftFilter) params.append('shift', shiftFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '200');

      const res = await api.get(`/work-registers?${params.toString()}`);
      setRecords(res.data?.data ?? res.data);
    } catch {
      toast.error('Failed to load work register records');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/work-registers/${confirmDeleteId}`);
      toast.success('Record deleted successfully');
      fetchRecords();
    } catch {
      toast.error('Failed to delete record');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const SHIFT_FILTERS = ['', 'MORNING', 'STAGGERED', 'NIGHT'];
  const STATUS_FILTERS = ['', 'COMPLETED', 'NOT_ATTENDED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED'];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-gray-700" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Work Register</h1>
            <p className="text-sm text-gray-500">Shift-wise task execution &amp; tracking</p>
          </div>
        </div>
        {canWrite && (
          <button
            onClick={() => { setRecordToEdit(null); setIsFormOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-colors"
          >
            <Plus className="w-4 h-4" />
            Register Work
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 space-y-3">
        {/* Date Range */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</span>
          <div className="relative">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {}
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Tab') {
                  e.preventDefault();
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch {}
                }
              }}
              className="border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer bg-white [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <Calendar className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <span className="text-gray-400 text-sm">to</span>
          <div className="relative">
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker?.();
                } catch {}
              }}
              onKeyDown={(e) => {
                if (e.key !== 'Tab') {
                  e.preventDefault();
                  try {
                    (e.target as HTMLInputElement).showPicker?.();
                  } catch {}
                }
              }}
              className="border border-gray-300 rounded-lg pl-3 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer bg-white [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <Calendar className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          {(startDate || endDate) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
          )}
        </div>

        {/* Shift tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Shift</span>
          {SHIFT_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setShiftFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                shiftFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
              }`}
            >
              {s ? SHIFT_LABELS[s] : 'All Shifts'}
            </button>
          ))}
        </div>

        {/* Status tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Status</span>
          {STATUS_FILTERS.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                statusFilter === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
              }`}
            >
              {s ? STATUS_LABELS[s] : 'All Status'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <BookOpen className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No work register records found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Shift</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Shop</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">RS Type</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">RS No.</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Initial Pos.</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Final Pos.</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((rec, idx) => {
                  const isExpanded = expandedRows.has(rec._id);
                  const sp = rec.shuntingProgram;
                  return (
                    <Fragment key={rec._id}>
                      <tr
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onDoubleClick={() => toggleRow(rec._id)}
                      >
                        <td className="py-3 px-4 text-gray-400">{idx + 1}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">
                          {new Date(rec.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${SHIFT_COLORS[rec.shift]}`}>
                            {SHIFT_LABELS[rec.shift]}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700">{sp?.shop ?? '-'}</td>
                        <td className="py-3 px-4 text-gray-700">{formatCat(sp?.rsType)}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{sp?.rsNo ?? '-'}</td>
                        <td className="py-3 px-4 text-gray-700">{formatLoc(sp?.initialPosition)}</td>
                        <td className="py-3 px-4 text-gray-500">{sp?.finalPosition ? formatLoc(sp.finalPosition) : '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[rec.status]}`}>
                            {STATUS_ICONS[rec.status]}
                            {STATUS_LABELS[rec.status]}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => toggleRow(rec._id)}
                              className="text-gray-400 hover:text-gray-600 transition-colors"
                              title="Toggle history"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            {canWrite && (
                              <>
                                <button
                                  onClick={() => setStatusModalRecord(rec)}
                                  className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors font-medium"
                                  title="Change status"
                                >
                                  Status
                                </button>
                                <button
                                  onClick={() => { setRecordToEdit(rec); setIsFormOpen(true); }}
                                  className="text-blue-500 hover:text-blue-700"
                                  title="Edit"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(rec._id)}
                                  className="text-red-400 hover:text-red-600"
                                  title="Delete"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded: Status History Timeline */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="bg-slate-50 px-6 py-4 border-b border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Status History</p>
                            {rec.statusHistory.length === 0 ? (
                              <p className="text-sm text-gray-400">No history recorded.</p>
                            ) : (
                              <div className="relative pl-4 space-y-3">
                                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-200" />
                                {rec.statusHistory.map((entry, i) => (
                                  <div key={entry._id ?? i} className="relative flex items-start gap-3">
                                    <div className="absolute -left-2.5 top-1 w-2 h-2 rounded-full bg-gray-400 border-2 border-white" />
                                    <div className="flex-1 bg-white rounded-lg border border-gray-100 px-4 py-2 shadow-sm">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[entry.status]}`}>
                                          {STATUS_ICONS[entry.status]}
                                          {STATUS_LABELS[entry.status]}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          {new Date(entry.changedAt).toLocaleString('en-GB')}
                                        </span>
                                        {entry.changedBy && (
                                          <span className="text-xs text-gray-500">by <span className="font-medium">{entry.changedBy.name}</span></span>
                                        )}
                                      </div>
                                      {entry.remark && (
                                        <p className="text-sm text-gray-600 mt-1">{entry.remark}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <WorkRegisterFormModal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setRecordToEdit(null); }}
        onSuccess={fetchRecords}
        recordToEdit={recordToEdit}
      />

      {statusModalRecord && (
        <WorkRegisterStatusModal
          record={statusModalRecord}
          onClose={() => setStatusModalRecord(null)}
          onSuccess={fetchRecords}
        />
      )}

      <ConfirmationModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Work Register"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
}
