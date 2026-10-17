'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, Plus, Trash2, ArrowRight, Check, ListTodo, TrainFront, ChevronDown } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

const SHIFT_OPTIONS = [
  { value: 'MORNING', label: 'Morning' },
  { value: 'STAGGERED', label: 'Staggered' },
  { value: 'NIGHT', label: 'Night' },
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
}

interface NewTodoItem {
  id: string;
  task: string;
  shuntingProgramId?: string;
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
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState('');
  const [remark, setRemark] = useState('');
  const [todos, setTodos] = useState<NewTodoItem[]>([]);
  const [currentTaskInput, setCurrentTaskInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick program picker toggle
  const [showProgramPicker, setShowProgramPicker] = useState(false);
  const [pendingPrograms, setPendingPrograms] = useState<PendingProgram[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [assetCategories, setAssetCategories] = useState<any[]>([]);
  const [programSearch, setProgramSearch] = useState('');

  const toast = useToast();

  useEffect(() => {
    if (!isOpen) {
      setCurrentTaskInput('');
      setShowProgramPicker(false);
      setProgramSearch('');
      return;
    }

    fetchPendingPrograms();
    fetchLocationsAndCategories();

    if (recordToEdit) {
      setDate(recordToEdit.date ? recordToEdit.date.split('T')[0] : new Date().toISOString().split('T')[0]);
      setShift(recordToEdit.shift ?? '');
      setRemark(recordToEdit.remark ?? '');
      if (recordToEdit.todos && Array.isArray(recordToEdit.todos)) {
        setTodos(recordToEdit.todos.map((t: any) => ({
          id: t._id || Math.random().toString(),
          task: t.task,
          shuntingProgramId: t.shuntingProgram?._id || t.shuntingProgram,
        })));
      } else {
        setTodos([]);
      }
    } else {
      setDate(new Date().toISOString().split('T')[0]);
      setShift('');
      setRemark('');
      setTodos([]);
    }
  }, [isOpen, recordToEdit]);

  const fetchPendingPrograms = async () => {
    try {
      const res = await api.get('/work-registers/pending-programs');
      setPendingPrograms(res.data || []);
    } catch {
      // Non-critical if fails
    }
  };

  const fetchLocationsAndCategories = async () => {
    try {
      const [locRes, catRes] = await Promise.all([
        api.get('/locations'),
        api.get('/asset-categories'),
      ]);
      setLocations(locRes.data || []);
      setAssetCategories(catRes.data || []);
    } catch {
      // Non-critical
    }
  };

  const formatLoc = (id?: string) => {
    if (!id) return '-';
    const found = locations.find(l => l._id === id);
    return found ? `${found.name}${found.trackNumber ? ` (${found.trackNumber})` : ''}` : id;
  };

  const formatCat = (code?: string) => {
    if (!code) return '-';
    const found = assetCategories.find(c => c.code === code);
    return found ? found.name : code;
  };

  const handleAddTask = () => {
    const trimmed = currentTaskInput.trim();
    if (!trimmed) return;
    setTodos(prev => [...prev, { id: Date.now().toString(), task: trimmed }]);
    setCurrentTaskInput('');
  };

  const handleRemoveTask = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const handleAddProgramAsTask = (prog: PendingProgram) => {
    const route = `${formatLoc(prog.initialPosition)} → ${prog.finalPosition ? formatLoc(prog.finalPosition) : 'SSY'}`;
    const taskDesc = `Shunt ${prog.shop} ${formatCat(prog.rsType)} [${prog.rsNo}] (${route})${prog.remark ? ` - ${prog.remark}` : ''}`;
    setTodos(prev => [...prev, { id: Date.now().toString(), task: taskDesc, shuntingProgramId: prog._id }]);
    setShowProgramPicker(false);
    toast.success('Task added from pending program');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift) {
      toast.error('Please select a shift');
      return;
    }
    if (todos.length === 0) {
      toast.error('Please add at least one To-Do task for this shift');
      return;
    }

    setSubmitting(true);
    try {
      if (recordToEdit) {
        await api.patch(`/work-registers/${recordToEdit._id}`, {
          date,
          shift,
          remark,
        });
        toast.success('Shift register updated successfully');
      } else {
        await api.post('/work-registers', {
          date,
          shift,
          remark,
          todos: todos.map(t => ({
            task: t.task,
            shuntingProgramId: t.shuntingProgramId,
          })),
        });
        toast.success('Shift Work Register created successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save work register');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPrograms = pendingPrograms.filter(p => {
    const q = programSearch.toLowerCase();
    return (
      p.rsNo?.toLowerCase().includes(q) ||
      p.shop?.toLowerCase().includes(q) ||
      p.rsType?.toLowerCase().includes(q) ||
      formatLoc(p.initialPosition).toLowerCase().includes(q) ||
      formatLoc(p.finalPosition).toLowerCase().includes(q)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-xl bg-white shadow-2xl ring-1 ring-gray-900/5">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center">
              <ListTodo className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {recordToEdit ? 'Edit Shift Register' : 'Register Shift Work'}
              </h3>
              <p className="text-xs text-gray-500 leading-none mt-0.5">
                Assign To-Do tasks for a specific date and shift
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          
          {/* Row 1: Date & Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
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
                  required
                  className="block w-full border border-gray-300 rounded-lg py-2 pl-3 pr-9 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 cursor-pointer bg-white [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer font-medium"
                />
                <Calendar className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Shift */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Shift <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {SHIFT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setShift(opt.value)}
                    className={`py-2 px-1 rounded-lg border text-xs font-semibold transition-all text-center ${
                      shift === opt.value
                        ? 'border-gray-900 bg-gray-900 text-white shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: To-Do Tasks Section */}
          <div className="border border-gray-200 rounded-xl p-3.5 bg-gray-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                  Shift To-Do Tasks
                </span>
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {todos.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowProgramPicker(!showProgramPicker)}
                className="text-[11px] font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
              >
                <TrainFront className="w-3.5 h-3.5" />
                {showProgramPicker ? 'Close Programs' : '+ From Pending Program'}
              </button>
            </div>

            {/* Optional Program Quick Selector */}
            {showProgramPicker && (
              <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-900">
                    Select a Pending Program to Auto-Fill as To-Do:
                  </span>
                  <input
                    type="text"
                    value={programSearch}
                    onChange={e => setProgramSearch(e.target.value)}
                    placeholder="Search RS No / Shop..."
                    className="border border-blue-200 rounded px-2 py-1 text-[11px] bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {filteredPrograms.length === 0 ? (
                    <div className="text-[11px] text-gray-500 text-center py-2">
                      No matching pending shunting programs
                    </div>
                  ) : (
                    filteredPrograms.map(p => {
                      const badge = SHOP_BADGES[p.shop] || { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
                      return (
                        <div
                          key={p._id}
                          onClick={() => handleAddProgramAsTask(p)}
                          className="flex items-center justify-between p-2 rounded-md bg-white border border-blue-100 hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${badge.bg} ${badge.text} ${badge.border}`}>
                              {p.shop}
                            </span>
                            <span className="text-xs font-bold text-gray-900">{p.rsNo}</span>
                            <span className="text-[11px] text-gray-500">({formatCat(p.rsType)})</span>
                            <span className="text-[11px] text-gray-400">
                              {formatLoc(p.initialPosition)} → {p.finalPosition ? formatLoc(p.finalPosition) : 'SSY'}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-blue-600 hover:underline">
                            + Add
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Task Input Box */}
            <div className="flex gap-2">
              <input
                type="text"
                value={currentTaskInput}
                onChange={e => setCurrentTaskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTask();
                  }
                }}
                placeholder="Write task (e.g. Move wagon 81048795026 to Track 3)..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-gray-900 placeholder:text-gray-400"
              />
              <button
                type="button"
                onClick={handleAddTask}
                disabled={!currentTaskInput.trim()}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
            </div>

            {/* List of Added Tasks */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {todos.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-gray-300 rounded-lg bg-white/70">
                  <ListTodo className="w-5 h-5 text-gray-400 mx-auto mb-1 opacity-60" />
                  <p className="text-xs font-medium text-gray-500">No tasks added yet</p>
                  <p className="text-[11px] text-gray-400">Type a task above and click &quot;Add Task&quot; or press Enter</p>
                </div>
              ) : (
                todos.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-2 p-2 rounded-lg bg-white border border-gray-200 hover:border-gray-300 transition-all shadow-xs"
                  >
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-gray-500 bg-gray-100 rounded px-1.5 py-0.5 mt-0.5 shrink-0">
                        #{index + 1}
                      </span>
                      <p className="text-xs text-gray-800 font-medium leading-relaxed break-words">
                        {item.task}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                        Not Completed
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(item.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                        title="Remove task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Row 3: Shift Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Shift Notes / Handover Remark <span className="text-gray-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              value={remark}
              onChange={e => setRemark(e.target.value)}
              rows={2}
              placeholder="Any shift handover instructions or operational notes..."
              className="block w-full border border-gray-300 rounded-lg p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none placeholder:text-gray-400"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="text-[11px] text-gray-400">
              Initial shift status: <span className="font-semibold text-gray-600">Not Attended</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || todos.length === 0 || !shift}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-gray-900 hover:bg-black rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-xs flex items-center gap-1.5"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving...
                  </>
                ) : recordToEdit ? 'Save Changes' : 'Create Shift Register'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
