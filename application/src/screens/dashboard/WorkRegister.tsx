import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList, Platform, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen, Plus, CheckCircle2, Clock, AlertCircle, XCircle, Trash2, X,
  ChevronDown, ChevronUp, Calendar, Circle, MessageSquare, History
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkStatus = 'COMPLETED' | 'NOT_ATTENDED' | 'PARTIALLY_COMPLETED' | 'NOT_COMPLETED';
type TodoStatus = 'COMPLETED' | 'PARTIALLY_COMPLETED' | 'NOT_COMPLETED';
type ShiftType = 'MORNING' | 'STAGGERED' | 'NIGHT';

interface StatusHistoryEntry {
  _id?: string;
  status: WorkStatus;
  remark?: string;
  changedBy: { name: string } | null;
  changedAt: string;
}

interface TodoItem {
  _id: string;
  task: string;
  status: TodoStatus;
  remark?: string;
  updatedBy?: { name: string } | null;
  updatedAt: string;
}

const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface WorkRegister {
  _id: string;
  date: string;
  shift: ShiftType;
  status: WorkStatus;
  remark?: string;
  todos: TodoItem[];
  statusHistory: StatusHistoryEntry[];
  createdBy: { name: string } | null;
  createdAt: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SHIFT_OPTIONS: ShiftType[] = ['MORNING', 'STAGGERED', 'NIGHT'];
const SHIFT_LABELS: Record<ShiftType, string> = { MORNING: 'Morning', STAGGERED: 'Staggered', NIGHT: 'Night' };

const STATUS_OPTIONS: WorkStatus[] = ['COMPLETED', 'NOT_ATTENDED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED'];
const STATUS_LABELS: Record<WorkStatus, string> = {
  COMPLETED: 'Completed',
  NOT_ATTENDED: 'Not Attended',
  PARTIALLY_COMPLETED: 'Partially Completed',
  NOT_COMPLETED: 'Not Completed',
};

const STATUS_COLORS: Record<WorkStatus, { bg: string; text: string; border: string }> = {
  COMPLETED: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  NOT_ATTENDED: { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' },
  PARTIALLY_COMPLETED: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  NOT_COMPLETED: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

const SHIFT_COLORS: Record<ShiftType, { bg: string; text: string; border: string }> = {
  MORNING: { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  STAGGERED: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  NIGHT: { bg: '#eef2ff', text: '#3730a3', border: '#c7d2fe' },
};

const TODO_PILLS: Record<TodoStatus, { bg: string; text: string; label: string }> = {
  COMPLETED: { bg: '#d1fae5', text: '#065f46', label: 'Done' },
  PARTIALLY_COMPLETED: { bg: '#fef3c7', text: '#92400e', label: 'Partial' },
  NOT_COMPLETED: { bg: '#f1f5f9', text: '#475569', label: 'Pending' },
};

// ─── Component ────────────────────────────────────────────────────────────────

const WorkRegister = () => {
  const { user } = useAuth();
  const canWrite = user?.role === 'WAGON_ADMIN' || user?.role === 'TPT_RAIL_ADMIN';

  const [records, setRecords] = useState<WorkRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set());

  // Inline quick task inputs per card
  const [inlineTaskInputs, setInlineTaskInputs] = useState<Record<string, string>>({});
  const [addingTaskForId, setAddingTaskForId] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState<ShiftType | ''>('');
  const [statusFilter, setStatusFilter] = useState<WorkStatus | ''>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form modal state (Register Shift Work)
  const [formVisible, setFormVisible] = useState(false);
  const [formDate, setFormDate] = useState(formatLocalDate(new Date()));
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftType | ''>('');
  const [formRemark, setFormRemark] = useState('');
  const [newTodos, setNewTodos] = useState<{ id: string; task: string }[]>([]);
  const [currentTaskInput, setCurrentTaskInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Overall Status change modal
  const [statusModalRecord, setStatusModalRecord] = useState<WorkRegister | null>(null);
  const [newStatus, setNewStatus] = useState<WorkStatus>('NOT_ATTENDED');
  const [statusRemark, setStatusRemark] = useState('');

  // Todo status change modal
  const [todoModalData, setTodoModalData] = useState<{ workRegisterId: string; todo: TodoItem } | null>(null);
  const [newTodoStatus, setNewTodoStatus] = useState<TodoStatus>('NOT_COMPLETED');
  const [todoRemark, setTodoRemark] = useState('');

  // Delete modal
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchRecords();
  }, [dateFilter, shiftFilter, statusFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateFilter) {
        params.append('startDate', dateFilter);
        params.append('endDate', dateFilter);
      }
      if (shiftFilter) params.append('shift', shiftFilter);
      if (statusFilter) params.append('status', statusFilter);
      params.append('limit', '50');

      const res = await api.get(`/work-registers?${params.toString()}`);
      setRecords(res.data.data || []);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load work registers' });
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

  const openAddModal = () => {
    setFormDate(formatLocalDate(new Date()));
    setSelectedShift('');
    setFormRemark('');
    setNewTodos([]);
    setCurrentTaskInput('');
    setFormVisible(true);
  };

  const handleAddTaskToForm = () => {
    const trimmed = currentTaskInput.trim();
    if (!trimmed) return;
    setNewTodos(prev => [...prev, { id: Date.now().toString(), task: trimmed }]);
    setCurrentTaskInput('');
  };

  const handleRemoveTaskFromForm = (id: string) => {
    setNewTodos(prev => prev.filter(t => t.id !== id));
  };

  const handleCreateRegister = async () => {
    if (!selectedShift) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please select a shift' });
      return;
    }
    if (newTodos.length === 0) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Please add at least one To-Do task' });
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/work-registers', {
        date: formDate,
        shift: selectedShift,
        remark: formRemark,
        todos: newTodos.map(t => ({ task: t.task })),
      });
      Toast.show({ type: 'success', text1: 'Created', text2: 'Shift Work Register created' });
      setFormVisible(false);
      fetchRecords();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Could not create register' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineAddTask = async (registerId: string) => {
    const text = (inlineTaskInputs[registerId] || '').trim();
    if (!text) return;
    setAddingTaskForId(registerId);
    try {
      await api.post(`/work-registers/${registerId}/todos`, { task: text });
      setInlineTaskInputs(prev => ({ ...prev, [registerId]: '' }));
      Toast.show({ type: 'success', text1: 'Task Added' });
      fetchRecords();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to add task' });
    } finally {
      setAddingTaskForId(null);
    }
  };

  const handleUpdateOverallStatus = async () => {
    if (!statusModalRecord) return;
    try {
      await api.patch(`/work-registers/${statusModalRecord._id}`, {
        status: newStatus,
        remark: statusRemark,
      });
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Shift status updated' });
      setStatusModalRecord(null);
      fetchRecords();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Could not update status' });
    }
  };

  const handleUpdateTodoStatus = async () => {
    if (!todoModalData) return;
    try {
      await api.patch(`/work-registers/${todoModalData.workRegisterId}/todos/${todoModalData.todo._id}`, {
        status: newTodoStatus,
        remark: todoRemark,
      });
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Task status updated' });
      setTodoModalData(null);
      fetchRecords();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: err.response?.data?.message || 'Failed to update task' });
    }
  };

  const handleDeleteTodo = async (registerId: string, todoId: string) => {
    try {
      await api.delete(`/work-registers/${registerId}/todos/${todoId}`);
      Toast.show({ type: 'success', text1: 'Removed', text2: 'Task removed' });
      fetchRecords();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not delete task' });
    }
  };

  const handleDeleteRegister = async () => {
    if (!deleteConfirmId) return;
    try {
      await api.delete(`/work-registers/${deleteConfirmId}`);
      Toast.show({ type: 'success', text1: 'Deleted', text2: 'Shift register deleted' });
      setDeleteConfirmId(null);
      fetchRecords();
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not delete shift register' });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={styles.headerIconContainer}>
            <BookOpen size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>Work Register</Text>
            <Text style={styles.headerSubtitle}>Shift To-Do & Task Register</Text>
          </View>
        </View>

        {canWrite && (
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Plus size={14} color="#ffffff" />
            <Text style={styles.addBtnText}>Register Work</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Section (Date -> Shift -> Status) */}
      <View style={styles.filterSection}>
        {/* Date filter */}
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={dateFilter ? styles.dateBtnTextActive : styles.dateBtnText}>
                {dateFilter ? new Date(dateFilter + 'T00:00:00').toLocaleDateString('en-GB') : 'Filter by Date'}
              </Text>
              <Calendar size={14} color={dateFilter ? '#0f172a' : '#9ca3af'} />
            </View>
          </TouchableOpacity>
          {dateFilter && (
            <TouchableOpacity onPress={() => setDateFilter('')} style={styles.clearDateBtn}>
              <Text style={styles.clearDateText}>Clear Date</Text>
            </TouchableOpacity>
          )}
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={dateFilter ? new Date(dateFilter + 'T00:00:00') : new Date()}
            mode="date"
            display="default"
            onChange={(event, selected) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (event.type === 'set' && selected) {
                setDateFilter(formatLocalDate(selected));
              } else if (event.type === 'dismissed') {
                setShowDatePicker(false);
              }
            }}
          />
        )}

        {/* Shift Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, !shiftFilter && styles.filterTabActive]}
            onPress={() => setShiftFilter('')}
          >
            <Text style={[styles.filterTabText, !shiftFilter && styles.filterTabTextActive]}>All Shifts</Text>
          </TouchableOpacity>
          {SHIFT_OPTIONS.map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, shiftFilter === s && styles.filterTabActive]}
              onPress={() => setShiftFilter(s)}
            >
              <Text style={[styles.filterTabText, shiftFilter === s && styles.filterTabTextActive]}>
                {SHIFT_LABELS[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterTab, !statusFilter && styles.filterTabActive]}
            onPress={() => setStatusFilter('')}
          >
            <Text style={[styles.filterTabText, !statusFilter && styles.filterTabTextActive]}>All Statuses</Text>
          </TouchableOpacity>
          {STATUS_OPTIONS.map(st => (
            <TouchableOpacity
              key={st}
              style={[styles.filterTab, statusFilter === st && styles.filterTabActive]}
              onPress={() => setStatusFilter(st)}
            >
              <Text style={[styles.filterTabText, statusFilter === st && styles.filterTabTextActive]}>
                {STATUS_LABELS[st]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="small" color="#0f172a" />
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyContainer}>
          <BookOpen size={36} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Work Registers Found</Text>
          <Text style={styles.emptySubtitle}>
            {canWrite ? 'Tap "Register Work" to assign tasks for a shift' : 'No registers match current filters'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const totalTodos = item.todos?.length || 0;
            const completedTodos = item.todos?.filter(t => t.status === 'COMPLETED').length || 0;
            const progress = totalTodos > 0 ? (completedTodos / totalTodos) : 0;
            const isHistoryOpen = expandedHistory.has(item._id);
            const statusConfig = STATUS_COLORS[item.status] || STATUS_COLORS.NOT_ATTENDED;
            const shiftConfig = SHIFT_COLORS[item.shift] || SHIFT_COLORS.MORNING;

            return (
              <View style={styles.card}>
                {/* Top Row: Date, Shift, Overall Status, Progress */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={styles.dateBadge}>
                      <Calendar size={12} color="#0f172a" />
                      <Text style={styles.cardDate}>
                        {new Date(item.date).toLocaleDateString('en-GB')}
                      </Text>
                    </View>

                    <View style={[styles.shiftBadge, { backgroundColor: shiftConfig.bg, borderColor: shiftConfig.border }]}>
                      <Text style={[styles.shiftBadgeText, { color: shiftConfig.text }]}>
                        {SHIFT_LABELS[item.shift]}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg, borderColor: statusConfig.border }]}>
                      <Text style={[styles.statusBadgeText, { color: statusConfig.text }]}>
                        {STATUS_LABELS[item.status]}
                      </Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={styles.cardActions}>
                    {canWrite && (
                      <>
                        <TouchableOpacity
                          style={styles.changeStatusBtn}
                          onPress={() => {
                            setStatusModalRecord(item);
                            setNewStatus(item.status);
                            setStatusRemark('');
                          }}
                        >
                          <Text style={styles.changeStatusBtnText}>Status</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setDeleteConfirmId(item._id)}
                          style={styles.trashBtn}
                        >
                          <Trash2 size={13} color="#94a3b8" />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressContainer}>
                  <Text style={styles.progressText}>
                    {completedTodos}/{totalTodos} Tasks Done
                  </Text>
                  <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.round(progress * 100)}%` }]} />
                  </View>
                </View>

                {/* Optional Shift Notes */}
                {item.remark ? (
                  <View style={styles.shiftNoteBox}>
                    <MessageSquare size={12} color="#b45309" />
                    <Text style={styles.shiftNoteText}>{item.remark}</Text>
                  </View>
                ) : null}

                {/* Checklist Section */}
                <View style={styles.todoList}>
                  {totalTodos === 0 ? (
                    <Text style={styles.noTodosText}>No tasks added to this shift yet.</Text>
                  ) : (
                    item.todos.map((todo, idx) => {
                      const pill = TODO_PILLS[todo.status] || TODO_PILLS.NOT_COMPLETED;
                      const isDone = todo.status === 'COMPLETED';

                      return (
                        <View
                          key={todo._id}
                          style={[
                            styles.todoItem,
                            isDone && styles.todoItemDone,
                          ]}
                        >
                          {/* Task Number & Icon */}
                          <View style={styles.todoLeft}>
                            <Text style={styles.todoIndex}>#{idx + 1}</Text>
                            {todo.status === 'COMPLETED' ? (
                              <CheckCircle2 size={14} color="#059669" />
                            ) : todo.status === 'PARTIALLY_COMPLETED' ? (
                              <AlertCircle size={14} color="#d97706" />
                            ) : (
                              <Circle size={14} color="#cbd5e1" />
                            )}
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[
                                  styles.todoTaskText,
                                  isDone && styles.todoTaskTextDone,
                                ]}
                              >
                                {todo.task}
                              </Text>
                              {todo.remark ? (
                                <Text style={styles.todoRemarkText}>Note: {todo.remark}</Text>
                              ) : null}
                            </View>
                          </View>

                          {/* Status Pill & Delete */}
                          <View style={styles.todoRight}>
                            {canWrite ? (
                              <TouchableOpacity
                                style={[styles.todoPillBtn, { backgroundColor: pill.bg }]}
                                onPress={() => {
                                  setTodoModalData({ workRegisterId: item._id, todo });
                                  setNewTodoStatus(todo.status);
                                  setTodoRemark(todo.remark || '');
                                }}
                              >
                                <Text style={[styles.todoPillText, { color: pill.text }]}>{pill.label}</Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={[styles.todoPillBtn, { backgroundColor: pill.bg }]}>
                                <Text style={[styles.todoPillText, { color: pill.text }]}>{pill.label}</Text>
                              </View>
                            )}

                            {canWrite && (
                              <TouchableOpacity
                                onPress={() => handleDeleteTodo(item._id, todo._id)}
                                style={styles.todoTrashBtn}
                              >
                                <Trash2 size={12} color="#cbd5e1" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                      );
                    })
                  )}

                  {/* Inline Task Adder */}
                  {canWrite && (
                    <View style={styles.inlineAddRow}>
                      <TextInput
                        value={inlineTaskInputs[item._id] || ''}
                        onChangeText={txt => setInlineTaskInputs(prev => ({ ...prev, [item._id]: txt }))}
                        placeholder="+ Add task to this shift..."
                        placeholderTextColor="#94a3b8"
                        style={styles.inlineInput}
                      />
                      <TouchableOpacity
                        style={[
                          styles.inlineAddBtn,
                          (!(inlineTaskInputs[item._id] || '').trim() || addingTaskForId === item._id) && styles.inlineAddBtnDisabled,
                        ]}
                        disabled={!(inlineTaskInputs[item._id] || '').trim() || addingTaskForId === item._id}
                        onPress={() => handleInlineAddTask(item._id)}
                      >
                        <Text style={styles.inlineAddBtnText}>
                          {addingTaskForId === item._id ? '...' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Audit History Accordion */}
                {item.statusHistory && item.statusHistory.length > 0 && (
                  <View style={styles.historyContainer}>
                    <TouchableOpacity
                      style={styles.historyToggle}
                      onPress={() => toggleHistory(item._id)}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <History size={12} color="#64748b" />
                        <Text style={styles.historyToggleText}>
                          Audit Trail ({item.statusHistory.length})
                        </Text>
                      </View>
                      {isHistoryOpen ? <ChevronUp size={12} color="#64748b" /> : <ChevronDown size={12} color="#64748b" />}
                    </TouchableOpacity>

                    {isHistoryOpen && (
                      <View style={styles.historyList}>
                        {item.statusHistory.map((h, i) => (
                          <View key={h._id || i} style={styles.historyEntry}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={styles.historyStatus}>{STATUS_LABELS[h.status] || h.status}</Text>
                              {h.remark ? <Text style={styles.historyRemark}>- {h.remark}</Text> : null}
                            </View>
                            <Text style={styles.historyMeta}>
                              {h.changedBy?.name || 'User'} &bull; {new Date(h.changedAt).toLocaleString('en-GB')}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}

              </View>
            );
          }}
        />
      )}

      {/* Modal: Register Shift Work (Create) */}
      <Modal visible={formVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Register Shift Work</Text>
                <Text style={styles.modalSubtitle}>Assign To-Do tasks for a shift</Text>
              </View>
              <TouchableOpacity onPress={() => setFormVisible(false)} style={styles.closeBtn}>
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Date */}
              <Text style={styles.inputLabel}>Date *</Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                onPress={() => setShowFormDatePicker(true)}
              >
                <Text style={styles.inputText}>
                  {new Date(formDate + 'T00:00:00').toLocaleDateString('en-GB')}
                </Text>
                <Calendar size={14} color="#64748b" />
              </TouchableOpacity>
              {showFormDatePicker && (
                <DateTimePicker
                  value={new Date(formDate + 'T00:00:00')}
                  mode="date"
                  display="default"
                  onChange={(event, selected) => {
                    if (Platform.OS === 'android') setShowFormDatePicker(false);
                    if (event.type === 'set' && selected) setFormDate(formatLocalDate(selected));
                    else if (event.type === 'dismissed') setShowFormDatePicker(false);
                  }}
                />
              )}

              {/* Shift */}
              <Text style={styles.inputLabel}>Shift *</Text>
              <View style={styles.shiftBtnRow}>
                {SHIFT_OPTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.shiftSelectBtn, selectedShift === s && styles.shiftSelectBtnActive]}
                    onPress={() => setSelectedShift(s)}
                  >
                    <Text style={[styles.shiftSelectBtnText, selectedShift === s && styles.shiftSelectBtnTextActive]}>
                      {SHIFT_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Tasks Builder */}
              <View style={styles.tasksBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text style={styles.inputLabel}>Shift Tasks ({newTodos.length})</Text>
                </View>

                {/* Input row */}
                <View style={styles.taskInputRow}>
                  <TextInput
                    value={currentTaskInput}
                    onChangeText={setCurrentTaskInput}
                    placeholder="Task (e.g. Shunt wagon to Track 3)..."
                    placeholderTextColor="#94a3b8"
                    style={styles.taskInput}
                  />
                  <TouchableOpacity
                    style={[styles.taskAddBtn, !currentTaskInput.trim() && styles.taskAddBtnDisabled]}
                    disabled={!currentTaskInput.trim()}
                    onPress={handleAddTaskToForm}
                  >
                    <Plus size={14} color="#ffffff" />
                    <Text style={styles.taskAddBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {/* List of tasks */}
                {newTodos.length === 0 ? (
                  <Text style={styles.noTasksAdded}>No tasks added yet. Write above and tap Add.</Text>
                ) : (
                  newTodos.map((t, index) => (
                    <View key={t.id} style={styles.newTodoItem}>
                      <Text style={styles.newTodoNumber}>#{index + 1}</Text>
                      <Text style={styles.newTodoText}>{t.task}</Text>
                      <TouchableOpacity onPress={() => handleRemoveTaskFromForm(t.id)}>
                        <Trash2 size={13} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>

              {/* Shift Notes */}
              <Text style={styles.inputLabel}>Shift Notes (Optional)</Text>
              <TextInput
                value={formRemark}
                onChangeText={setFormRemark}
                placeholder="Handover instructions or notes..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
                style={[styles.textInput, { minHeight: 56, textAlignVertical: 'top' }]}
              />

              {/* Note: Overall Status is HIDDEN per client request */}
              <Text style={styles.hiddenStatusNotice}>
                Initial shift status: <Text style={{ fontWeight: '700' }}>Not Attended</Text>
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setFormVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, (submitting || newTodos.length === 0 || !selectedShift) && styles.submitBtnDisabled]}
                disabled={submitting || newTodos.length === 0 || !selectedShift}
                onPress={handleCreateRegister}
              >
                <Text style={styles.submitBtnText}>
                  {submitting ? 'Creating...' : 'Create Register'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Change Overall Shift Status */}
      <Modal visible={!!statusModalRecord} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBoxSmall}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Shift Status</Text>
              <TouchableOpacity onPress={() => setStatusModalRecord(null)} style={styles.closeBtn}>
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBodySmall}>
              <Text style={styles.inputLabel}>New Status</Text>
              {STATUS_OPTIONS.map(st => (
                <TouchableOpacity
                  key={st}
                  style={[styles.statusOptionBtn, newStatus === st && styles.statusOptionBtnActive]}
                  onPress={() => setNewStatus(st)}
                >
                  <Text style={[styles.statusOptionBtnText, newStatus === st && styles.statusOptionBtnTextActive]}>
                    {STATUS_LABELS[st]}
                  </Text>
                  {statusModalRecord?.status === st && (
                    <Text style={{ fontSize: 10, color: '#94a3b8' }}>(current)</Text>
                  )}
                </TouchableOpacity>
              ))}

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Remark (Optional)</Text>
              <TextInput
                value={statusRemark}
                onChangeText={setStatusRemark}
                placeholder="Reason for change..."
                placeholderTextColor="#94a3b8"
                style={styles.textInput}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusModalRecord(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateOverallStatus}>
                <Text style={styles.submitBtnText}>Save Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Update Specific To-Do Status */}
      <Modal visible={!!todoModalData} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBoxSmall}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Task Status</Text>
                <Text style={styles.modalSubtitle} numberOfLines={1}>{todoModalData?.todo.task}</Text>
              </View>
              <TouchableOpacity onPress={() => setTodoModalData(null)} style={styles.closeBtn}>
                <X size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBodySmall}>
              <Text style={styles.inputLabel}>Status</Text>
              {(['COMPLETED', 'PARTIALLY_COMPLETED', 'NOT_COMPLETED'] as TodoStatus[]).map(ts => {
                const pill = TODO_PILLS[ts];
                return (
                  <TouchableOpacity
                    key={ts}
                    style={[styles.statusOptionBtn, newTodoStatus === ts && styles.statusOptionBtnActive]}
                    onPress={() => setNewTodoStatus(ts)}
                  >
                    <Text style={[styles.statusOptionBtnText, newTodoStatus === ts && styles.statusOptionBtnTextActive]}>
                      {pill.label}
                    </Text>
                    {todoModalData?.todo.status === ts && (
                      <Text style={{ fontSize: 10, color: '#94a3b8' }}>(current)</Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              <Text style={[styles.inputLabel, { marginTop: 10 }]}>Remark / Note (Optional)</Text>
              <TextInput
                value={todoRemark}
                onChangeText={setTodoRemark}
                placeholder="e.g. Completed with shunter..."
                placeholderTextColor="#94a3b8"
                style={styles.textInput}
              />
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTodoModalData(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitBtn} onPress={handleUpdateTodoStatus}>
                <Text style={styles.submitBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        visible={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteRegister}
        title="Delete Shift Register"
        message="Are you sure you want to delete this shift register and all its To-Do tasks?"
        confirmText="Delete"
        variant="danger"
      />
    </SafeAreaView>
  );
};

// ─── Styles (Clean, Compact, Smaller Text Sizes) ──────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 10,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerIconContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  headerSubtitle: { fontSize: 11, color: '#64748b' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },
  addBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  // Filters
  filterSection: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    justifyContent: 'center',
  },
  dateBtnText: { fontSize: 12, color: '#94a3b8' },
  dateBtnTextActive: { fontSize: 12, color: '#0f172a', fontWeight: '600' },
  clearDateBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  clearDateText: { fontSize: 11, color: '#ef4444', fontWeight: '500' },
  filterRow: { gap: 4, alignItems: 'center' },
  filterTab: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 5,
    backgroundColor: '#f1f5f9',
  },
  filterTabActive: { backgroundColor: '#0f172a' },
  filterTabText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  filterTabTextActive: { color: '#ffffff' },

  // Center / Empty
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginTop: 10 },
  emptySubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },

  // List & Cards
  listContent: { padding: 10, gap: 10 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap', flex: 1 },
  dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardDate: { fontSize: 12, fontWeight: '700', color: '#0f172a' },
  shiftBadge: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1 },
  shiftBadgeText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 4, borderWidth: 1 },
  statusBadgeText: { fontSize: 9, fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  changeStatusBtn: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    backgroundColor: '#ffffff',
  },
  changeStatusBtnText: { fontSize: 10, fontWeight: '600', color: '#334155' },
  trashBtn: { padding: 4 },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  progressText: { fontSize: 10.5, fontWeight: '600', color: '#64748b' },
  progressBarBg: { width: 90, height: 4.5, backgroundColor: '#e2e8f0', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#059669', borderRadius: 3 },

  // Shift Note
  shiftNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fefce8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#fef08a',
  },
  shiftNoteText: { fontSize: 11, color: '#92400e', fontStyle: 'italic', flex: 1 },

  // Todo list
  todoList: { padding: 8, gap: 5 },
  noTodosText: { fontSize: 11, color: '#94a3b8', textAlign: 'center', paddingVertical: 6 },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    gap: 6,
  },
  todoItemDone: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  todoLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 5, flex: 1 },
  todoIndex: { fontSize: 9.5, fontWeight: '700', color: '#94a3b8', marginTop: 1 },
  todoTaskText: { fontSize: 11.5, fontWeight: '500', color: '#0f172a' },
  todoTaskTextDone: { color: '#64748b', textDecorationLine: 'line-through' },
  todoRemarkText: { fontSize: 10, color: '#64748b', fontStyle: 'italic', marginTop: 1 },
  todoRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  todoPillBtn: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  todoPillText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  todoTrashBtn: { padding: 2 },

  // Inline Add
  inlineAddRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 4 },
  inlineInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 12,
    backgroundColor: '#f8fafc',
    color: '#0f172a',
  },
  inlineAddBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineAddBtnDisabled: { opacity: 0.4 },
  inlineAddBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },

  // History Accordion
  historyContainer: { borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  historyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#f8fafc',
  },
  historyToggleText: { fontSize: 10, fontWeight: '600', color: '#64748b' },
  historyList: { paddingHorizontal: 10, paddingBottom: 6, gap: 3 },
  historyEntry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  historyStatus: { fontSize: 10, fontWeight: '700', color: '#0f172a' },
  historyRemark: { fontSize: 10, color: '#64748b', fontStyle: 'italic' },
  historyMeta: { fontSize: 9, color: '#94a3b8' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 14 },
  modalBox: { backgroundColor: '#ffffff', borderRadius: 12, maxHeight: '90%', overflow: 'hidden' },
  modalBoxSmall: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { fontSize: 10.5, color: '#64748b', marginTop: 1 },
  closeBtn: { padding: 4 },
  modalBody: { paddingHorizontal: 14, paddingVertical: 10 },
  modalBodySmall: { padding: 14 },
  modalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },

  inputLabel: { fontSize: 11, fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginBottom: 4 },
  dropdownInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 7,
    paddingHorizontal: 10,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    backgroundColor: '#ffffff',
  },
  inputText: { fontSize: 12, color: '#0f172a', fontWeight: '500' },
  textInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    backgroundColor: '#ffffff',
    color: '#0f172a',
    marginBottom: 8,
  },

  shiftBtnRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  shiftSelectBtn: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  shiftSelectBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  shiftSelectBtnText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  shiftSelectBtnTextActive: { color: '#ffffff' },

  // Tasks Builder
  tasksBox: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#f8fafc',
    marginBottom: 10,
  },
  taskInputRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  taskInput: {
    flex: 1,
    height: 38,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 0,
    fontSize: 12,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  taskAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    borderRadius: 6,
    height: 38,
  },
  taskAddBtnDisabled: { opacity: 0.4 },
  taskAddBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
  noTasksAdded: { fontSize: 11, color: '#94a3b8', textAlign: 'center', paddingVertical: 8 },
  newTodoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 4,
    gap: 6,
  },
  newTodoNumber: { fontSize: 10.5, fontWeight: '700', color: '#94a3b8' },
  newTodoText: { flex: 1, fontSize: 12, color: '#0f172a' },

  hiddenStatusNotice: { fontSize: 10.5, color: '#94a3b8', marginVertical: 6 },

  statusOptionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusOptionBtnActive: { borderColor: '#0f172a', backgroundColor: '#f1f5f9' },
  statusOptionBtnText: { fontSize: 12, fontWeight: '500', color: '#334155' },
  statusOptionBtnTextActive: { fontWeight: '700', color: '#0f172a' },

  cancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  cancelBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  submitBtn: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '600' },
});

export default WorkRegister;
