import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, FlatList, Platform, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BookOpen, Plus, CheckCircle2, Clock, AlertCircle, XCircle, Edit2, Trash2, X, ChevronDown, ChevronUp
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import ConfirmModal from '../../components/ConfirmModal';

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkStatus = 'COMPLETED' | 'NOT_ATTENDED' | 'PARTIALLY_COMPLETED' | 'NOT_COMPLETED';
type ShiftType = 'MORNING' | 'STAGGERED' | 'NIGHT';

interface StatusHistoryEntry {
  _id?: string;
  status: WorkStatus;
  remark?: string;
  changedBy: { name: string } | null;
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

const formatLabel = (str?: string) => (str ? str.replace(/_/g, ' ') : '-');

interface WorkRegister {
  _id: string;
  shuntingProgram: ShuntingProgramRef;
  date: string;
  shift: ShiftType;
  status: WorkStatus;
  remark?: string;
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
  NOT_ATTENDED: { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
  PARTIALLY_COMPLETED: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  NOT_COMPLETED: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
};

const SHIFT_COLORS: Record<ShiftType, { bg: string; text: string }> = {
  MORNING: { bg: '#fffbeb', text: '#92400e' },
  STAGGERED: { bg: '#eff6ff', text: '#1e40af' },
  NIGHT: { bg: '#eef2ff', text: '#3730a3' },
};

// ─── Component ────────────────────────────────────────────────────────────────

const WorkRegister = () => {
  const { user } = useAuth();
  const canWrite = user?.role === 'WAGON_ADMIN' || user?.role === 'TPT_RAIL_ADMIN';

  const [records, setRecords] = useState<WorkRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const lastTapRef = React.useRef<{ [key: string]: number }>({});

  // Filters
  const [dateFilter, setDateFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState<ShiftType | ''>('');
  const [statusFilter, setStatusFilter] = useState<WorkStatus | ''>('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Form modal state
  const [formVisible, setFormVisible] = useState(false);
  const [pendingPrograms, setPendingPrograms] = useState<ShuntingProgramRef[]>([]);
  const [programPickerVisible, setProgramPickerVisible] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0]);
  const [showFormDatePicker, setShowFormDatePicker] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ShiftType | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<WorkStatus>('NOT_ATTENDED');
  const [formRemark, setFormRemark] = useState('');
  const [recordToEdit, setRecordToEdit] = useState<WorkRegister | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Status change modal
  const [statusModalRecord, setStatusModalRecord] = useState<WorkRegister | null>(null);
  const [newStatus, setNewStatus] = useState<WorkStatus>('NOT_ATTENDED');
  const [statusRemark, setStatusRemark] = useState('');
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  // Confirm delete
  const [confirmConfig, setConfirmConfig] = useState<{
    visible: boolean; title: string; message: string; onConfirm: () => Promise<void>;
  }>({ visible: false, title: '', message: '', onConfirm: async () => {} });

  useEffect(() => {
    fetchRecords();
  }, [dateFilter, shiftFilter, statusFilter]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '200' });
      if (dateFilter) { params.append('startDate', dateFilter); params.append('endDate', dateFilter); }
      if (shiftFilter) params.append('shift', shiftFilter);
      if (statusFilter) params.append('status', statusFilter);
      const res = await api.get(`/work-registers?${params.toString()}`);
      const data = res.data?.data ?? res.data;
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      Toast.show({ type: 'error', text1: 'Fetch Failed', text2: 'Could not load work register' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingPrograms = async () => {
    try {
      const res = await api.get('/work-registers/pending-programs');
      setPendingPrograms(res.data);
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not load pending programs' });
    }
  };

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCardPress = (id: string) => {
    const now = Date.now();
    const last = lastTapRef.current[id] || 0;
    if (now - last < 300) {
      toggleCard(id);
      lastTapRef.current[id] = 0;
    } else {
      lastTapRef.current[id] = now;
    }
  };

  const openAddModal = () => {
    setRecordToEdit(null);
    setSelectedProgramId('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setSelectedShift('');
    setSelectedStatus('NOT_ATTENDED');
    setFormRemark('');
    fetchPendingPrograms();
    setFormVisible(true);
  };

  const openEditModal = (rec: WorkRegister) => {
    setRecordToEdit(rec);
    setSelectedProgramId(rec.shuntingProgram._id);
    setFormDate(rec.date.split('T')[0]);
    setSelectedShift(rec.shift);
    setSelectedStatus(rec.status);
    setFormRemark(rec.remark ?? '');
    setFormVisible(true);
  };

  const handleFormSubmit = async () => {
    if (!selectedShift) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select a shift' });
      return;
    }
    if (!recordToEdit && !selectedProgramId) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select a shunting program' });
      return;
    }
    setSubmitting(true);
    try {
      if (recordToEdit) {
        await api.patch(`/work-registers/${recordToEdit._id}`, { shift: selectedShift, date: formDate, remark: formRemark });
        Toast.show({ type: 'success', text1: 'Updated', text2: 'Work register updated' });
      } else {
        await api.post('/work-registers', {
          shuntingProgramId: selectedProgramId,
          date: formDate,
          shift: selectedShift,
          status: selectedStatus,
          remark: formRemark,
        });
        Toast.show({ type: 'success', text1: 'Registered', text2: 'Work register created' });
      }
      setFormVisible(false);
      fetchRecords();
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save record' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusSubmit = async () => {
    if (!statusModalRecord || newStatus === statusModalRecord.status) {
      Toast.show({ type: 'error', text1: 'No Change', text2: 'Please select a different status' });
      return;
    }
    setStatusSubmitting(true);
    try {
      await api.patch(`/work-registers/${statusModalRecord._id}`, { status: newStatus, remark: statusRemark });
      Toast.show({ type: 'success', text1: 'Status Updated' });
      setStatusModalRecord(null);
      fetchRecords();
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not update status' });
    } finally {
      setStatusSubmitting(false);
    }
  };

  const openStatusModal = (rec: WorkRegister) => {
    setStatusModalRecord(rec);
    setNewStatus(rec.status);
    setStatusRemark('');
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      visible: true,
      title: 'Delete Record',
      message: 'Are you sure you want to delete this work register record? This cannot be undone.',
      onConfirm: async () => {
        try {
          await api.delete(`/work-registers/${id}`);
          Toast.show({ type: 'success', text1: 'Deleted' });
          fetchRecords();
        } catch {
          Toast.show({ type: 'error', text1: 'Delete Failed' });
        }
      },
    });
  };

  const selectedProgram = pendingPrograms.find(p => p._id === selectedProgramId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BookOpen size={26} color="#0f172a" />
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.pageTitle}>Work Register</Text>
            <Text style={styles.pageSubtitle}>Shift-wise task tracking</Text>
          </View>
        </View>
        {canWrite && (
          <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterSection}>
        {/* Date filter */}
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Text style={dateFilter ? styles.dateBtnTextActive : styles.dateBtnText}>
              {dateFilter ? dateFilter : 'Filter by Date'}
            </Text>
          </TouchableOpacity>
          {dateFilter && (
            <TouchableOpacity onPress={() => setDateFilter('')} style={styles.clearDateBtn}>
              <X size={14} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={dateFilter ? new Date(dateFilter) : new Date()}
            mode="date"
            display="default"
            onChange={(event, selected) => {
              if (Platform.OS === 'android') setShowDatePicker(false);
              if (event.type === 'set' && selected) {
                setDateFilter(selected.toISOString().split('T')[0]);
              } else if (event.type === 'dismissed') {
                setShowDatePicker(false);
              }
            }}
          />
        )}

        {/* Shift filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {(['', ...SHIFT_OPTIONS] as Array<ShiftType | ''>).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, shiftFilter === s && styles.filterTabActive]}
              onPress={() => setShiftFilter(s)}
            >
              <Text style={[styles.filterTabText, shiftFilter === s && styles.filterTabTextActive]}>
                {s ? SHIFT_LABELS[s] : 'All Shifts'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
          {(['', ...STATUS_OPTIONS] as Array<WorkStatus | ''>).map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.filterTab, statusFilter === s && styles.filterTabActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[styles.filterTabText, statusFilter === s && styles.filterTabTextActive]}>
                {s ? STATUS_LABELS[s] : 'All Status'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={records}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No work register records found.</Text>}
          onRefresh={fetchRecords}
          refreshing={loading}
          renderItem={({ item }) => {
            const isExpanded = expandedCards.has(item._id);
            const sp = item.shuntingProgram;
            const sc = STATUS_COLORS[item.status];
            const shiftC = SHIFT_COLORS[item.shift];
            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => handleCardPress(item._id)}
                style={styles.card}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <View style={[styles.shiftBadge, { backgroundColor: shiftC.bg }]}>
                      <Text style={[styles.shiftBadgeText, { color: shiftC.text }]}>{SHIFT_LABELS[item.shift]}</Text>
                    </View>
                    <Text style={styles.cardDate}>{new Date(item.date).toLocaleDateString('en-GB')}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg, borderColor: sc.border }]}>
                    <Text style={[styles.statusBadgeText, { color: sc.text }]}>{STATUS_LABELS[item.status]}</Text>
                  </View>
                </View>

                {/* Card Body */}
                <View style={styles.cardBody}>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Shop:</Text><Text style={styles.infoValue}>{sp?.shop ?? '-'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>RS Type:</Text><Text style={styles.infoValue}>{formatLabel(sp?.rsType)}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>RS No:</Text><Text style={styles.infoValue}>{sp?.rsNo ?? '-'}</Text></View>
                  <View style={styles.infoRow}><Text style={styles.infoLabel}>Initial Pos:</Text><Text style={styles.infoValue}>{formatLabel(sp?.initialPosition)}</Text></View>
                  {sp?.finalPosition && (
                    <View style={styles.infoRow}><Text style={styles.infoLabel}>Final Pos:</Text><Text style={styles.infoValue}>{formatLabel(sp.finalPosition)}</Text></View>
                  )}
                </View>

                {/* Expanded: Status History */}
                {isExpanded && (
                  <View style={styles.historySection}>
                    <Text style={styles.historyTitle}>Status History</Text>
                    {item.statusHistory.length === 0 ? (
                      <Text style={styles.historyEmpty}>No history recorded.</Text>
                    ) : (
                      item.statusHistory.map((entry, i) => {
                        const ec = STATUS_COLORS[entry.status];
                        return (
                          <View key={entry._id ?? i} style={styles.historyEntry}>
                            <View style={styles.historyDot} />
                            <View style={styles.historyContent}>
                              <View style={[styles.historyStatusBadge, { backgroundColor: ec.bg, borderColor: ec.border }]}>
                                <Text style={[styles.historyStatusText, { color: ec.text }]}>{STATUS_LABELS[entry.status]}</Text>
                              </View>
                              <Text style={styles.historyMeta}>
                                {new Date(entry.changedAt).toLocaleString('en-GB')}
                                {entry.changedBy ? `  ·  ${entry.changedBy.name}` : ''}
                              </Text>
                              {entry.remark ? <Text style={styles.historyRemark}>{entry.remark}</Text> : null}
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {/* Card Footer Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => toggleCard(item._id)} style={styles.expandBtn}>
                    {isExpanded ? <ChevronUp size={16} color="#6b7280" /> : <ChevronDown size={16} color="#6b7280" />}
                    <Text style={styles.expandBtnText}>{isExpanded ? 'Hide History' : 'Show History'}</Text>
                  </TouchableOpacity>
                  {canWrite && (
                    <View style={styles.actionBtns}>
                      <TouchableOpacity style={styles.statusBtn} onPress={() => openStatusModal(item)}>
                        <Text style={styles.statusBtnText}>Status</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => openEditModal(item)}>
                        <Edit2 size={18} color="#0284c7" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item._id)}>
                        <Trash2 size={18} color="#dc2626" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ─── Add / Edit Modal ─────────────────────────────────────── */}
      <Modal visible={formVisible} transparent animationType="slide" onRequestClose={() => setFormVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setFormVisible(false)}>
          <Pressable style={styles.modalContainer} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{recordToEdit ? 'Edit Work Register' : 'Register Work'}</Text>
              <TouchableOpacity onPress={() => setFormVisible(false)} style={styles.closeBtn}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* Program selector */}
              {!recordToEdit && (
                <>
                  <Text style={styles.inputLabel}>Pending Shunting Program *</Text>
                  <TouchableOpacity style={styles.dropdownInput} onPress={() => setProgramPickerVisible(true)}>
                    <Text style={selectedProgramId ? styles.inputText : styles.placeholderText}>
                      {selectedProgram
                        ? `[${selectedProgram.shop}] ${selectedProgram.rsNo} — ${formatLabel(selectedProgram.rsType)}`
                        : 'Select program...'}
                    </Text>
                  </TouchableOpacity>
                  {selectedProgram && (
                    <View style={styles.selectedProgramInfo}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Program Details</Text>
                        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f1f5f9' }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#334155' }}>{selectedProgram.shop}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>RS No: {selectedProgram.rsNo} ({formatLabel(selectedProgram.rsType)})</Text>
                      <Text style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                        Route: {formatLabel(selectedProgram.initialPosition)}{selectedProgram.finalPosition ? ` → ${formatLabel(selectedProgram.finalPosition)}` : ''}
                      </Text>
                      {selectedProgram.remark ? (
                        <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#64748b', marginTop: 4 }}>Note: {selectedProgram.remark}</Text>
                      ) : null}
                    </View>
                  )}
                </>
              )}

              {/* Date */}
              <Text style={styles.inputLabel}>Date *</Text>
              <TouchableOpacity style={styles.dropdownInput} onPress={() => setShowFormDatePicker(true)}>
                <Text style={styles.inputText}>{formDate}</Text>
              </TouchableOpacity>
              {showFormDatePicker && (
                <DateTimePicker
                  value={new Date(formDate)}
                  mode="date"
                  display="default"
                  onChange={(event, selected) => {
                    if (Platform.OS === 'android') setShowFormDatePicker(false);
                    if (event.type === 'set' && selected) setFormDate(selected.toISOString().split('T')[0]);
                    else if (event.type === 'dismissed') setShowFormDatePicker(false);
                  }}
                />
              )}

              {/* Shift */}
              <Text style={styles.inputLabel}>Shift *</Text>
              <View style={styles.shiftRow}>
                {SHIFT_OPTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.shiftOption, selectedShift === s && styles.shiftOptionActive]}
                    onPress={() => setSelectedShift(s)}
                  >
                    <Text style={[styles.shiftOptionText, selectedShift === s && styles.shiftOptionTextActive]}>
                      {SHIFT_LABELS[s]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status (create only) */}
              {!recordToEdit && (
                <>
                  <Text style={styles.inputLabel}>Initial Status</Text>
                  <TouchableOpacity style={styles.dropdownInput} onPress={() => setStatusPickerVisible(true)}>
                    <Text style={styles.inputText}>{STATUS_LABELS[selectedStatus]}</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Remark */}
              <Text style={styles.inputLabel}>Remarks (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Add any notes..."
                value={formRemark}
                onChangeText={setFormRemark}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleFormSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>{recordToEdit ? 'Save Changes' : 'Register Work'}</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─── Program Picker ─────────────────────────────────────────── */}
      <Modal visible={programPickerVisible} transparent animationType="slide" onRequestClose={() => setProgramPickerVisible(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Pending Program</Text>
              <TouchableOpacity onPress={() => setProgramPickerVisible(false)} style={styles.closeBtn}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={pendingPrograms}
              keyExtractor={item => item._id}
              ListEmptyComponent={<Text style={styles.emptyText}>No pending programs.</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, selectedProgramId === item._id && styles.pickerItemSelected]}
                  onPress={() => { setSelectedProgramId(item._id); setProgramPickerVisible(false); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#f1f5f9' }}>
                        <Text style={{ fontSize: 10, fontWeight: '700', color: '#475569' }}>{item.shop}</Text>
                      </View>
                      <Text style={[styles.pickerItemText, selectedProgramId === item._id && styles.pickerItemTextSelected]}>
                        RS No: {item.rsNo}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>({formatLabel(item.rsType)})</Text>
                  </View>
                  <Text style={styles.pickerItemSub}>
                    {formatLabel(item.initialPosition)}{item.finalPosition ? ` → ${formatLabel(item.finalPosition)}` : ''}
                  </Text>
                  {item.remark ? (
                    <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#94a3b8', marginTop: 3 }}>
                      Note: {item.remark}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ─── Status Picker (for form initial status) ───────────────── */}
      <Modal visible={statusPickerVisible} transparent animationType="slide" onRequestClose={() => setStatusPickerVisible(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Initial Status</Text>
              <TouchableOpacity onPress={() => setStatusPickerVisible(false)} style={styles.closeBtn}>
                <X size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={STATUS_OPTIONS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.pickerItem, selectedStatus === item && styles.pickerItemSelected]}
                  onPress={() => { setSelectedStatus(item); setStatusPickerVisible(false); }}
                >
                  <Text style={[styles.pickerItemText, selectedStatus === item && styles.pickerItemTextSelected]}>
                    {STATUS_LABELS[item]}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* ─── Status Change Modal ─────────────────────────────────────── */}
      {statusModalRecord && (
        <Modal visible={!!statusModalRecord} transparent animationType="slide" onRequestClose={() => setStatusModalRecord(null)}>
          <Pressable style={styles.modalOverlay} onPress={() => setStatusModalRecord(null)}>
            <Pressable style={[styles.modalContainer, { maxHeight: '70%' }]} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Change Status</Text>
                <TouchableOpacity onPress={() => setStatusModalRecord(null)} style={styles.closeBtn}>
                  <X size={22} color="#64748b" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Text style={styles.inputLabel}>New Status</Text>
                {STATUS_OPTIONS.map(s => {
                  const sc = STATUS_COLORS[s];
                  return (
                    <TouchableOpacity
                      key={s}
                      style={[styles.statusOptionBtn, newStatus === s && { borderColor: sc.border, backgroundColor: sc.bg }]}
                      onPress={() => setNewStatus(s)}
                    >
                      <Text style={[styles.statusOptionText, newStatus === s && { color: sc.text }]}>
                        {STATUS_LABELS[s]}
                      </Text>
                      {s === statusModalRecord.status && (
                        <Text style={styles.currentTag}>(current)</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <Text style={[styles.inputLabel, { marginTop: 16 }]}>Remark (Optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="Reason for status change..."
                  value={statusRemark}
                  onChangeText={setStatusRemark}
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={3}
                />

                <TouchableOpacity
                  style={[styles.submitBtn, (statusSubmitting || newStatus === statusModalRecord.status) && styles.submitBtnDisabled]}
                  onPress={handleStatusSubmit}
                  disabled={statusSubmitting || newStatus === statusModalRecord.status}
                >
                  {statusSubmitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.submitBtnText}>Update Status</Text>
                  }
                </TouchableOpacity>
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Confirm modal */}
      <ConfirmModal
        visible={confirmConfig.visible}
        onClose={() => setConfirmConfig(prev => ({ ...prev, visible: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText="Delete"
        variant="danger"
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  pageSubtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  addBtn: { backgroundColor: '#0f172a', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  filterSection: { backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateBtn: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  dateBtnText: { fontSize: 13, color: '#9ca3af' },
  dateBtnTextActive: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  clearDateBtn: { padding: 6 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', marginRight: 8 },
  filterTabActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterTabText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  filterTabTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  shiftBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  shiftBadgeText: { fontSize: 11, fontWeight: '700' },
  cardDate: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusBadgeText: { fontSize: 11, fontWeight: '600' },
  cardBody: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', marginBottom: 3 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', width: 80 },
  infoValue: { fontSize: 12, color: '#0f172a', flex: 1 },
  historySection: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: '#3b82f6' },
  historyTitle: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  historyEmpty: { fontSize: 12, color: '#9ca3af' },
  historyEntry: { flexDirection: 'row', marginBottom: 10 },
  historyDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#94a3b8', marginTop: 4, marginRight: 10 },
  historyContent: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  historyStatusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, marginBottom: 4 },
  historyStatusText: { fontSize: 11, fontWeight: '600' },
  historyMeta: { fontSize: 11, color: '#9ca3af' },
  historyRemark: { fontSize: 12, color: '#475569', marginTop: 4 },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  expandBtnText: { fontSize: 12, color: '#6b7280' },
  actionBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  statusBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  iconBtn: { padding: 4 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContainer: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#0f172a' },
  closeBtn: { padding: 4 },
  modalBody: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  dropdownInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14, backgroundColor: '#fff' },
  inputText: { fontSize: 14, color: '#0f172a' },
  placeholderText: { fontSize: 14, color: '#9ca3af' },
  textInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0f172a', marginBottom: 14, backgroundColor: '#fff' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  shiftRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  shiftOption: { flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#fff' },
  shiftOptionActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  shiftOptionText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  shiftOptionTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#0f172a', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  pickerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  pickerContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%' },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  pickerItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  pickerItemSelected: { backgroundColor: '#f0fdf4' },
  pickerItemText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  pickerItemTextSelected: { color: '#059669', fontWeight: '700' },
  pickerItemSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  statusOptionBtn: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusOptionText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  currentTag: { fontSize: 11, color: '#9ca3af' },
  selectedProgramInfo: { backgroundColor: '#f8fafc', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 14, marginTop: -6 },
});

export default WorkRegister;
