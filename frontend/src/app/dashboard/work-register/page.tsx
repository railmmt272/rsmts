'use client';

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Plus, CheckCircle2, Clock, AlertCircle, XCircle, Trash2, 
  ChevronDown, ChevronUp, Calendar, ListTodo, Circle, CheckSquare, MessageSquare, History
} from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import ConfirmationModal from '@/components/ConfirmationModal';
import WorkRegisterFormModal from '@/components/WorkRegister/WorkRegisterFormModal';
import WorkRegisterStatusModal from '@/components/WorkRegister/WorkRegisterStatusModal';
import WorkRegisterTodoModal from '@/components/WorkRegister/WorkRegisterTodoModal';

export interface StatusHistoryEntry {
  _id: string;
  status: string;
  remark?: string;
  changedBy: { name: string; email: string } | null;
  changedAt: string;
}

export interface TodoItem {
  _id: string;
  task: string;
  status: 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'NOT_COMPLETED';
  remark?: string;
  updatedBy?: { name: string; email: string } | null;
  updatedAt: string;
}

export interface WorkRegister {
  _id: string;
  date: string;
  shift: 'MORNING' | 'STAGGERED' | 'NIGHT';
  status: 'COMPLETED' | 'NOT_ATTENDED' | 'PARTIALLY_COMPLETED' | 'NOT_COMPLETED';
  remark?: string;
  todos: TodoItem[];
  statusHistory: StatusHistoryEntry[];
  createdBy: { name: string; email: string } | null;
  createdAt: string;
}

const SHIFT_LABELS: Record<string, string> = { MORNING: 'Morning', STAGGERED: 'Staggered', NIGHT: 'Night' };
const SHIFT_COLORS: Record<string, string> = {
  MORNING: 'bg-amber-50 text-amber-800 border-amber-200',
  STAGGERED: 'bg-blue-50 text-blue-800 border-blue-200',
  NIGHT: 'bg-indigo-50 text-indigo-800 border-indigo-200',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  NOT_ATTENDED: 'Not Attended',
  PARTIALLY_COMPLETED: 'Partially Completed',
  NOT_COMPLETED: 'Not Completed',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  NOT_ATTENDED: 'bg-slate-100 text-slate-700 border-slate-200',
  PARTIALLY_COMPLETED: 'bg-amber-50 text-amber-800 border-amber-200',
  NOT_COMPLETED: 'bg-rose-50 text-rose-800 border-rose-200',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  NOT_ATTENDED: <Clock className="w-3.5 h-3.5 text-slate-500" />,
  PARTIALLY_COMPLETED: <AlertCircle className="w-3.5 h-3.5 text-amber-600" />,
  NOT_COMPLETED: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
};

const TODO_STATUS_PILLS: Record<string, { bg: string; text: string; label: string }> = {
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-800', label: 'Done' },
  PARTIALLY_COMPLETED: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Partial' },
  NOT_COMPLETED: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Pending' },
};

export default function WorkRegisterPage() {
  const [records, setRecords] = useState<WorkRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  // Inline quick task inputs per card: { [registerId]: string }
  const [inlineTaskInputs, setInlineTaskInputs] = useState<Record<string, string>>({});
  const [addingTaskForId, setAddingTaskForId] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<WorkRegister | null>(null);
  const [statusModalRecord, setStatusModalRecord] = useState<WorkRegister | null>(null);
  const [todoModalData, setTodoModalData] = useState<{ workRegisterId: string; todo: TodoItem } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const toast = useToast();
  const { user } = useAuth();
  const canWrite = user?.role === 'WAGON_ADMIN' || user?.role === 'TPT_RAIL_ADMIN';

  useEffect(() => {
    fetchRecords();
  }, [startDate, endDate, shiftFilter, statusFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (shiftFilter) params.append('shift', shiftFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '50');

      const res = await api.get(`/work-registers?${params.toString()}`);
      setRecords(res.data.data || []);
    } catch {
      toast.error('Failed to load work registers');
    } finally {
      setLoading(false);
    }
  };

  const toggleHistory = (id: string) => {
    setExpandedHistory(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleInlineAddTask = async (registerId: string) => {
    const text = (inlineTaskInputs[registerId] || '').trim();
    if (!text) return;
    setAddingTaskForId(registerId);
    try {
      await api.post(`/work-registers/${registerId}/todos`, { task: text });
      setInlineTaskInputs(prev => ({ ...prev, [registerId]: '' }));
      toast.success('Task added to shift');
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add task');
    } finally {
      setAddingTaskForId(null);
    }
  };

  const handleDeleteTodo = async (registerId: string, todoId: string) => {
    try {
      await api.delete(`/work-registers/${registerId}/todos/${todoId}`);
      toast.success('Task removed');
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to remove task');
    }
  };

  const handleDeleteRegister = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/work-registers/${confirmDeleteId}`);
      toast.success('Shift register deleted');
      setConfirmDeleteId(null);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete shift register');
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gray-900 rounded-lg text-white shadow-xs">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Work Register</h1>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">
              Shift-based To-Do checklist and operational task tracking
            </p>
          </div>
        </div>

        {canWrite && (
          <button
            onClick={() => {
              setRecordToEdit(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            Register Shift Work
          </button>
        )}
      </div>

      {/* Ordered Filter Bar: Date -> Shift -> Status */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-xs space-y-2.5">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* 1. Date Range Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Date</span>
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
                className="border border-gray-300 rounded-lg pl-2.5 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 cursor-pointer bg-white [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer font-medium"
              />
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <span className="text-gray-400 text-xs">to</span>
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
                className="border border-gray-300 rounded-lg pl-2.5 pr-8 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-gray-900 cursor-pointer bg-white [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer font-medium"
              />
              <Calendar className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          {/* 2. Shift Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Shift</span>
            {['', 'MORNING', 'STAGGERED', 'NIGHT'].map(s => (
              <button
                key={s}
                onClick={() => setShiftFilter(s)}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                  shiftFilter === s
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s ? SHIFT_LABELS[s] : 'All'}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-gray-200 hidden sm:block" />

          {/* 3. Status Filter */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Status</span>
            {['', 'NOT_ATTENDED', 'PARTIALLY_COMPLETED', 'COMPLETED', 'NOT_COMPLETED'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition-all ${
                  statusFilter === st
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st ? STATUS_LABELS[st] : 'All'}
              </button>
            ))}
          </div>

          {(startDate || endDate || shiftFilter || statusFilter) && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setShiftFilter('');
                setStatusFilter('');
              }}
              className="text-xs text-rose-600 hover:text-rose-800 underline font-medium ml-auto"
            >
              Clear Filters
            </button>
          )}

        </div>
      </div>

      {/* Main Shift Registers List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <ListTodo className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
          <h3 className="text-sm font-semibold text-gray-900">No work registers found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            {canWrite
              ? 'Click "Register Shift Work" above to create tasks for a shift.'
              : 'No shift registers match the current filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(record => {
            const totalTodos = record.todos?.length || 0;
            const completedTodos = record.todos?.filter(t => t.status === 'COMPLETED').length || 0;
            const progressPercent = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;
            const isHistoryOpen = expandedHistory.has(record._id);

            return (
              <div
                key={record._id}
                className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden hover:border-gray-300 transition-all"
              >
                {/* Shift Card Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 px-4 py-2.5 bg-gray-50/70 border-b border-gray-100">
                  
                  {/* Left: Date, Shift, Overall Status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                      <Calendar className="w-3.5 h-3.5 text-gray-500" />
                      {formatDate(record.date)}
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${SHIFT_COLORS[record.shift]}`}>
                      {SHIFT_LABELS[record.shift]} Shift
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${STATUS_COLORS[record.status]}`}>
                      {STATUS_ICONS[record.status]}
                      {STATUS_LABELS[record.status]}
                    </span>

                    {/* Progress Badge */}
                    <div className="flex items-center gap-1.5 ml-1">
                      <span className="text-[11px] font-semibold text-gray-600">
                        {completedTodos}/{totalTodos} Done
                      </span>
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    {canWrite && (
                      <>
                        <button
                          onClick={() => setStatusModalRecord(record)}
                          className="px-2.5 py-1 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-xs"
                        >
                          Change Status
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(record._id)}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                          title="Delete shift register"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Optional General Shift Note */}
                {record.remark && (
                  <div className="px-4 py-1.5 bg-amber-50/40 border-b border-amber-100/60 text-xs text-amber-900 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-semibold text-[11px] uppercase text-amber-700">Shift Note:</span>
                    <span className="italic">{record.remark}</span>
                  </div>
                )}

                {/* Checklist of To-Dos */}
                <div className="p-3 space-y-1.5">
                  {totalTodos === 0 ? (
                    <div className="text-center py-3 text-xs text-gray-400">
                      No tasks assigned to this shift yet.
                    </div>
                  ) : (
                    record.todos.map((todo, idx) => {
                      const pill = TODO_STATUS_PILLS[todo.status] || TODO_STATUS_PILLS.NOT_COMPLETED;
                      const isDone = todo.status === 'COMPLETED';

                      return (
                        <div
                          key={todo._id}
                          className={`flex items-start justify-between gap-2.5 p-2 rounded-lg border transition-all ${
                            isDone
                              ? 'bg-emerald-50/20 border-emerald-100 hover:border-emerald-200'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {/* Left: Task Number, Status Icon, Task Text, Remark */}
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 rounded px-1 py-0.5 mt-0.5 shrink-0">
                              #{idx + 1}
                            </span>
                            
                            <div className="mt-0.5 shrink-0">
                              {todo.status === 'COMPLETED' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : todo.status === 'PARTIALLY_COMPLETED' ? (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              ) : (
                                <Circle className="w-3.5 h-3.5 text-slate-300" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium leading-relaxed break-words ${
                                isDone ? 'text-gray-500 line-through' : 'text-gray-900'
                              }`}>
                                {todo.task}
                              </p>
                              {todo.remark && (
                                <p className="text-[11px] text-gray-500 italic mt-0.5">
                                  Note: {todo.remark}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Status Pill & Delete button */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {canWrite ? (
                              <button
                                onClick={() => setTodoModalData({ workRegisterId: record._id, todo })}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider cursor-pointer hover:ring-1 hover:ring-gray-400 transition-all ${pill.bg} ${pill.text}`}
                                title="Click to update task status"
                              >
                                {pill.label}
                              </button>
                            ) : (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${pill.bg} ${pill.text}`}>
                                {pill.label}
                              </span>
                            )}

                            {canWrite && (
                              <button
                                onClick={() => handleDeleteTodo(record._id, todo._id)}
                                className="text-gray-300 hover:text-rose-600 p-0.5 rounded transition-colors"
                                title="Delete task"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {/* Inline Quick Add Task for this shift */}
                  {canWrite && (
                    <div className="flex items-center gap-2 pt-1.5">
                      <input
                        type="text"
                        value={inlineTaskInputs[record._id] || ''}
                        onChange={e => setInlineTaskInputs(prev => ({ ...prev, [record._id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleInlineAddTask(record._id);
                          }
                        }}
                        placeholder="+ Write new task description for this shift..."
                        className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1 text-xs bg-gray-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 placeholder:text-gray-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleInlineAddTask(record._id)}
                        disabled={addingTaskForId === record._id || !(inlineTaskInputs[record._id] || '').trim()}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        {addingTaskForId === record._id ? 'Adding...' : 'Add Task'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Audit History Accordion Footer */}
                {record.statusHistory && record.statusHistory.length > 0 && (
                  <div className="border-t border-gray-100 bg-gray-50/40">
                    <button
                      onClick={() => toggleHistory(record._id)}
                      className="w-full flex items-center justify-between px-4 py-1.5 text-[11px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <History className="w-3 h-3" />
                        Status Audit Trail ({record.statusHistory.length})
                      </span>
                      {isHistoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    {isHistoryOpen && (
                      <div className="px-4 pb-2.5 space-y-1 text-[11px] border-t border-gray-100 pt-1.5">
                        {record.statusHistory.map((h, i) => (
                          <div key={h._id || i} className="flex items-center justify-between text-gray-600">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-800">{STATUS_LABELS[h.status] || h.status}</span>
                              {h.remark && <span className="text-gray-500 italic">- &quot;{h.remark}&quot;</span>}
                            </div>
                            <div className="text-gray-400 text-[10px]">
                              {h.changedBy?.name || 'User'} &bull; {new Date(h.changedAt).toLocaleString('en-GB')}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <WorkRegisterFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
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

      {todoModalData && (
        <WorkRegisterTodoModal
          workRegisterId={todoModalData.workRegisterId}
          todo={todoModalData.todo}
          onClose={() => setTodoModalData(null)}
          onSuccess={fetchRecords}
        />
      )}

      <ConfirmationModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeleteRegister}
        title="Delete Shift Register"
        message="Are you sure you want to delete this shift register and all its To-Do tasks? This action cannot be undone."
      />
    </div>
  );
}
