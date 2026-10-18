'use client';

import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { Plus, ListTodo, CheckCircle2, Clock } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import ShuntingProgramFormModal from '@/components/ShuntingPrograms/ShuntingProgramFormModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { Trash2, Edit2, Calendar } from 'lucide-react';

interface ShuntingProgram {
  _id: string;
  initialPosition: string;
  finalPosition?: string;
  rsType: string;
  rsNo: string;
  remark: string;
  shop: string;
  status: 'PENDING' | 'DONE';
  createdAt: string;
  dateMarkedDone?: string;
}

export default function ShuntingProgramsPage() {
  const [programs, setPrograms] = useState<ShuntingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<ShuntingProgram | null>(null);
  const toast = useToast();
  const { user } = useAuth();
  
  const isViewer = user?.role === 'VIEWER';
  const canManageStatus = user?.role === 'WAGON_ADMIN' || user?.role === 'TPT_RAIL_ADMIN';

  const [confirmStatusConfig, setConfirmStatusConfig] = useState<{ isOpen: boolean; id: string; newStatus: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [expandedRemarks, setExpandedRemarks] = useState<Set<string>>(new Set());

  // Filtering & Pagination State
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shunting-programs');
      setPrograms(response.data);
    } catch (error) {
      toast.error('Failed to load shunting programs');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!confirmStatusConfig) return;
    try {
      await api.patch(`/shunting-programs/${confirmStatusConfig.id}`, { status: confirmStatusConfig.newStatus });
      toast.success(`Marked as ${confirmStatusConfig.newStatus}`);
      fetchPrograms();
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setConfirmStatusConfig(null);
    }
  };

  const toggleStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PENDING' ? 'DONE' : 'PENDING';
    setConfirmStatusConfig({ isOpen: true, id, newStatus });
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/shunting-programs/${confirmDeleteId}`);
      toast.success('Program deleted successfully');
      fetchPrograms();
    } catch (error) {
      toast.error('Failed to delete program');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const toggleRemark = (id: string) => {
    setExpandedRemarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAndSortedPrograms = useMemo(() => {
    let result = [...programs];

    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.status === statusFilter);
    }

    if (dateRange.start) {
      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      result = result.filter(p => new Date(p.createdAt) >= start);
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      result = result.filter(p => new Date(p.createdAt) <= end);
    }

    result.sort((a, b) => {
      if (a.status === 'PENDING' && b.status === 'DONE') return -1;
      if (a.status === 'DONE' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [programs, statusFilter, dateRange]);

  const totalPages = Math.ceil(filteredAndSortedPrograms.length / itemsPerPage);
  const currentPrograms = filteredAndSortedPrograms.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-4 md:p-6 w-full h-[calc(100vh-4rem)] flex flex-col">
      {/* Header section */}
      <div className="flex justify-between items-center mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="h-6 w-6" />
            Requests
          </h1>
          <p className="text-gray-500 mt-1">Manage shop-wise requests and movements</p>
        </div>
        <button
          onClick={() => {
            if (isViewer) {
              toast.error('You do not have permission to perform this action.');
              return;
            }
            setProgramToEdit(null);
            setIsModalOpen(true);
          }}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-black transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="h-4 w-4" />
          Add New Request
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4 flex flex-col md:flex-row gap-4 shrink-0">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select 
            value={statusFilter} 
            onChange={e => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
            className="border border-gray-300 rounded-md text-sm p-2 focus:ring-gray-900 focus:border-gray-900 min-w-[150px]"
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="DONE">Done</option>
          </select>
        </div>
        <div className="flex gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => { setDateRange(prev => ({ ...prev, start: e.target.value })); setCurrentPage(1); }}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch {}
                }}
                onFocus={(e) => {
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
                className="border border-gray-300 rounded-md text-sm pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer bg-white [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
            <div className="relative">
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => { setDateRange(prev => ({ ...prev, end: e.target.value })); setCurrentPage(1); }}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker?.();
                  } catch {}
                }}
                onFocus={(e) => {
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
                className="border border-gray-300 rounded-md text-sm pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer bg-white [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
        {(statusFilter !== 'ALL' || dateRange.start || dateRange.end) && (
          <div className="flex items-end">
            <button 
              onClick={() => { setStatusFilter('ALL'); setDateRange({ start: '', end: '' }); setCurrentPage(1); }}
              className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-2 mb-2"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10 shadow-sm">
              <tr className="border-b border-gray-200">
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                  S.No
                </th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">
                  Creation Time
                </th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  Shop
                </th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-44">
                  Initial Position
                </th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-44">
                  Final Position
                </th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  RS Type
                </th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  RS No.
                </th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-36">
                  Completion Time
                </th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28 text-center">
                  Status
                </th>
                <th className="py-3 px-5 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24 text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full" />
                      Loading programs...
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedPrograms.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <ListTodo className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No requests found</p>
                    <p>Try adjusting your filters or click "Add New Request" to create one.</p>
                  </td>
                </tr>
              ) : (
                currentPrograms.map((program, index) => {
                  const isExpanded = expandedRemarks.has(program._id);
                  const createdDate = new Date(program.createdAt);
                  const doneDate = program.dateMarkedDone ? new Date(program.dateMarkedDone) : null;

                  return (
                    <Fragment key={program._id}>
                      <tr 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onDoubleClick={() => toggleRemark(program._id)}
                      >
                        <td className="py-3 px-5 text-xs text-gray-500">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </td>
                        <td className="py-3 px-5 text-xs">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">
                              {!isNaN(createdDate.getTime()) ? createdDate.toLocaleDateString('en-GB') : '-'}
                            </span>
                            <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-400" />
                              {!isNaN(createdDate.getTime()) ? createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs font-semibold text-gray-900">{program.shop}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs font-medium text-gray-900">{program.initialPosition}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs font-medium text-gray-900">{program.finalPosition || '-'}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs font-medium text-gray-900">{program.rsType}</span>
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs font-bold text-gray-900">{program.rsNo}</span>
                        </td>

                        <td className="py-3 px-5 text-xs">
                          {program.status === 'DONE' && doneDate && !isNaN(doneDate.getTime()) ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-emerald-900">
                                {doneDate.toLocaleDateString('en-GB')}
                              </span>
                              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-emerald-500" />
                                {doneDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-500" />
                              Pending
                            </span>
                          )}
                        </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => {
                            if (!canManageStatus) {
                              toast.error('You do not have permission to perform this action.');
                              return;
                            }
                            toggleStatus(program._id, program.status);
                          }}
                          className="px-4 py-1.5 rounded-md text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 inline-flex items-center gap-2"
                        >
                          {program.status === 'DONE' ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                              Done
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 text-yellow-600" />
                              Pending
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              if (isViewer) {
                                toast.error('You do not have permission to perform this action.');
                                return;
                              }
                              setProgramToEdit(program);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Request"
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          {canManageStatus && (
                            <button
                              onClick={() => setConfirmDeleteId(program._id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete Request"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && program.remark && (
                      <tr className="bg-blue-50/50">
                        <td colSpan={10} className="py-4 px-6 text-sm text-gray-700 border-l-4 border-blue-500">
                          <span className="font-semibold text-gray-900 block mb-1">Remarks:</span>
                          <div className="whitespace-pre-wrap">{program.remark}</div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {filteredAndSortedPrograms.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0 bg-white">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredAndSortedPrograms.length)}</span> of{' '}
              <span className="font-medium">{filteredAndSortedPrograms.length}</span> results
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors focus:outline-none"
              >
                Previous
              </button>
              
              <div className="flex space-x-1">
                {Array.from({ length: totalPages || 1 }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors focus:outline-none ${
                      currentPage === page 
                        ? 'bg-blue-50 text-blue-600 font-medium' 
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors focus:outline-none"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <ShuntingProgramFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPrograms}
        programToEdit={programToEdit}
      />
      
      <ConfirmationModal
        isOpen={!!confirmStatusConfig}
        onClose={() => setConfirmStatusConfig(null)}
        onConfirm={handleStatusChange}
        title="Confirm Status Change"
        message={`Are you sure you want to mark this request as ${confirmStatusConfig?.newStatus.toLowerCase()}?`}
        confirmText={`Mark as ${confirmStatusConfig?.newStatus}`}
      />

      <ConfirmationModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Request"
        message="Are you sure you want to delete this request? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
      />
    </div>
  );
}
