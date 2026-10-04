import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, Plus, Clock, CheckCircle2, Edit2, Trash2, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LocationPickerModal from '../../components/LocationPickerModal';

interface ShuntingProgram {
  _id: string;
  initialPosition: string;
  assetCategory: string;
  remark: string;
  status: 'PENDING' | 'DONE';
  createdAt: string;
  dateMarkedDone?: string;
}

const ShuntingPrograms = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<ShuntingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const limit = 10;
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<ShuntingProgram | null>(null);
  
  // Form State
  const [initialPosition, setInitialPosition] = useState('');
  const [assetCategory, setAssetCategory] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [categories, setCategories] = useState<{label: string, value: string}[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | null>(null);
  
  // Expanded Cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const lastTapRef = React.useRef<{[key: string]: number}>({});

  const handleCardPress = (id: string) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[id] || 0;
    if (now - lastTap < 300) {
      setExpandedCards(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      lastTapRef.current[id] = 0;
    } else {
      lastTapRef.current[id] = now;
    }
  };

  useEffect(() => {
    fetchPrograms(1);
  }, []);

  const fetchPrograms = async (pageNumber = 1) => {
    try {
      if (pageNumber === 1) setLoading(true);
      else setLoadingMore(true);

      const [programsRes, locsRes, catsRes] = await Promise.all([
        api.get(`/shunting-programs?page=${pageNumber}&limit=${limit}`),
        pageNumber === 1 ? api.get('/locations?isActive=true').catch(() => ({ data: [] })) : Promise.resolve({ data: locations }),
        pageNumber === 1 ? api.get('/asset-categories/hierarchy').catch(() => ({ data: [] })) : Promise.resolve({ data: categories })
      ]);
      
      const responseData = programsRes.data;
      const isPaginated = !Array.isArray(responseData);
      const newPrograms = isPaginated ? responseData.data : responseData;
      
      if (pageNumber === 1) {
        setPrograms(newPrograms);
        if (locsRes.data.length > 0) setLocations(locsRes.data);
        if (catsRes.data.length > 0) {
          const grandparents = catsRes.data.map((c: any) => ({ label: c.name, value: c.code }));
          setCategories(grandparents);
        }
      } else {
        if (!isPaginated) {
          setHasMore(false);
          return;
        }
        setPrograms(prev => {
          const existingIds = new Set(prev.map(p => p._id));
          const uniqueNew = newPrograms.filter((p: ShuntingProgram) => !existingIds.has(p._id));
          return [...prev, ...uniqueNew];
        });
      }
      
      setHasMore(isPaginated ? newPrograms.length === limit : false);
      setPage(pageNumber);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Failed',
        text2: 'Could not load shunting programs',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      fetchPrograms(page + 1);
    }
  };

  const handleRefresh = () => {
    fetchPrograms(1);
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Program',
      'Are you sure you want to delete this shunting program?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/shunting-programs/${id}`);
              Toast.show({ type: 'success', text1: 'Deleted', text2: 'Program deleted successfully' });
              fetchPrograms(1);
            } catch (err) {
              Toast.show({ type: 'error', text1: 'Delete Failed', text2: 'Could not delete program' });
            }
          }
        }
      ]
    );
  };

  const toggleStatus = (program: ShuntingProgram) => {
    if (user?.role === 'VIEWER') {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'You do not have permission to change status.' });
      return;
    }
    const newStatus = program.status === 'PENDING' ? 'DONE' : 'PENDING';
    Alert.alert(
      'Confirm Status Change',
      `Mark this program as ${newStatus.toLowerCase()}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Mark ${newStatus}`,
          onPress: async () => {
            try {
              await api.patch(`/shunting-programs/${program._id}`, { status: newStatus });
              Toast.show({ type: 'success', text1: 'Status Updated', text2: `Program marked as ${newStatus}` });
              fetchPrograms(1);
            } catch (err) {
              Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Could not update status' });
            }
          }
        }
      ]
    );
  };

  const openModal = (program?: ShuntingProgram) => {
    if (user?.role === 'VIEWER') {
      Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'You do not have permission to modify programs.' });
      return;
    }
    if (program) {
      setProgramToEdit(program);
      setInitialPosition(program.initialPosition);
      setAssetCategory(program.assetCategory);
      setRemark(program.remark);
    } else {
      setProgramToEdit(null);
      setInitialPosition('');
      setAssetCategory('');
      setRemark('');
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!initialPosition.trim() || !assetCategory.trim() || !remark.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Initial Position, Category and remark are required' });
      return;
    }
    
    setSubmitting(true);
    try {
      if (programToEdit) {
        await api.patch(`/shunting-programs/${programToEdit._id}`, { initialPosition, assetCategory, remark });
        Toast.show({ type: 'success', text1: 'Updated', text2: 'Program updated successfully' });
      } else {
        await api.post('/shunting-programs', { initialPosition, assetCategory, remark, status: 'PENDING' });
        Toast.show({ type: 'success', text1: 'Created', text2: 'Program created successfully' });
      }
      setModalVisible(false);
      fetchPrograms(1);
    } catch (err) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Could not save program' });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPrograms = useMemo(() => {
    let result = [...programs];
    if (statusFilter !== 'ALL') {
      result = result.filter(p => p.status === statusFilter);
    }
    
    if (dateRange.start && dateRange.start.length === 10) {
      const start = new Date(dateRange.start);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        result = result.filter(p => new Date(p.createdAt) >= start);
      }
    }
    
    if (dateRange.end && dateRange.end.length === 10) {
      const end = new Date(dateRange.end);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        result = result.filter(p => new Date(p.createdAt) <= end);
      }
    }

    result.sort((a, b) => {
      if (a.status === 'PENDING' && b.status === 'DONE') return -1;
      if (a.status === 'DONE' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [programs, statusFilter, dateRange]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ClipboardList size={28} color="#0f172a" />
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.pageTitle}>Shunting Programs</Text>
            <Text style={styles.pageSubtitle}>Manage shop-wise tasks</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => openModal()}>
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {['ALL', 'PENDING', 'DONE'].map(status => (
            <TouchableOpacity 
              key={status} 
              style={[styles.filterTab, statusFilter === status && styles.filterTabActive]}
              onPress={() => setStatusFilter(status as any)}
            >
              <Text style={[styles.filterTabText, statusFilter === status && styles.filterTabTextActive]}>
                {status === 'ALL' ? 'All' : status === 'PENDING' ? 'Pending' : 'Done'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.dateFilterContainer}>
          <TouchableOpacity 
            style={styles.dateInputBtn} 
            onPress={() => setShowDatePicker('start')}
          >
            <Text style={dateRange.start ? styles.dateInputText : styles.dateInputPlaceholder}>
              {dateRange.start || 'Start Date'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.dateToText}>to</Text>
          <TouchableOpacity 
            style={styles.dateInputBtn} 
            onPress={() => setShowDatePicker('end')}
          >
            <Text style={dateRange.end ? styles.dateInputText : styles.dateInputPlaceholder}>
              {dateRange.end || 'End Date'}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={showDatePicker === 'start' && dateRange.start ? new Date(dateRange.start) : (showDatePicker === 'end' && dateRange.end ? new Date(dateRange.end) : new Date())}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              const currentPicker = showDatePicker;
              if (Platform.OS === 'android') {
                setShowDatePicker(null);
              }
              if (event.type === 'set' && selectedDate) {
                const dateStr = selectedDate.toISOString().split('T')[0];
                setDateRange(prev => ({ ...prev, [currentPicker]: dateStr }));
              } else if (event.type === 'dismissed') {
                setShowDatePicker(null);
              }
            }}
          />
        )}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredPrograms}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No shunting programs found.</Text>}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onRefresh={handleRefresh}
          refreshing={loading}
          ListFooterComponent={() => loadingMore ? <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 16 }} /> : null}
          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => handleCardPress(item._id)}
              style={styles.card}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
                <TouchableOpacity 
                  style={[styles.statusBadge, item.status === 'DONE' ? styles.statusBadgeDone : styles.statusBadgePending]}
                  onPress={() => toggleStatus(item)}
                >
                  {item.status === 'DONE' ? <CheckCircle2 size={14} color="#059669" /> : <Clock size={14} color="#d97706" />}
                  <Text style={[styles.statusText, item.status === 'DONE' ? styles.statusTextDone : styles.statusTextPending]}>
                    {item.status === 'DONE' ? 'Done' : 'Pending'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.cardBody}>
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={styles.cardLabel}>Category:</Text>
                  <Text style={styles.cardValue}>{item.assetCategory}</Text>
                </View>
                <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                  <Text style={styles.cardLabel}>Initial Pos:</Text>
                  <Text style={styles.cardValue}>{item.initialPosition}</Text>
                </View>
                {item.status === 'DONE' && item.dateMarkedDone && (
                  <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                    <Text style={styles.cardLabel}>Done Date:</Text>
                    <Text style={styles.cardValue}>{new Date(item.dateMarkedDone).toLocaleDateString()}</Text>
                  </View>
                )}
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.cardLabel}>Remark:</Text>
                  <Text 
                    style={styles.remarkText}
                    numberOfLines={expandedCards.has(item._id) ? undefined : 2}
                  >
                    {item.remark}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={() => openModal(item)}>
                  <Edit2 size={20} color="#0284c7" />
                </TouchableOpacity>
                {user?.role !== 'VIEWER' && (
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(item._id)}>
                    <Trash2 size={20} color="#dc2626" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal 
        visible={modalVisible} 
        transparent 
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView behavior="padding" style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{programToEdit ? 'Edit Program' : 'New Program'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Asset Category</Text>
              <TouchableOpacity 
                style={styles.dropdownInput}
                onPress={() => setCategoryPickerVisible(true)}
              >
                <Text style={assetCategory ? styles.inputText : styles.placeholderText}>
                  {assetCategory ? categories.find(c => c.value === assetCategory)?.label + ` (${assetCategory})` : 'Select Category...'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Initial Position</Text>
              <TouchableOpacity 
                style={styles.dropdownInput}
                onPress={() => setPickerVisible(true)}
              >
                <Text style={initialPosition ? styles.inputText : styles.placeholderText}>
                  {initialPosition ? `${locations.find(l => l.code === initialPosition)?.name || initialPosition} (${initialPosition})` : 'Select Initial Position...'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Shunting Program</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter details..."
                value={remark}
                onChangeText={setRemark}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
              />
              
              <TouchableOpacity 
                style={[styles.submitBtn, (!initialPosition.trim() || !assetCategory.trim() || !remark.trim() || submitting) && styles.submitBtnDisabled]} 
                onPress={handleSubmit}
                disabled={!initialPosition.trim() || !assetCategory.trim() || !remark.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{programToEdit ? 'Save Changes' : 'Create Program'}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reusable Location Picker Modal */}
      <LocationPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        title="Select Initial Position"
        locations={locations}
        onSelect={setInitialPosition}
        selectedCode={initialPosition}
      />

      {/* Reusable Category Picker Modal */}
      <Modal visible={categoryPickerVisible} transparent animationType="slide" onRequestClose={() => setCategoryPickerVisible(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Asset Category</Text>
              <TouchableOpacity onPress={() => setCategoryPickerVisible(false)} style={styles.closeBtn}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={item => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.pickerItem, assetCategory === item.value && styles.pickerItemSelected]}
                  onPress={() => {
                    setAssetCategory(item.value);
                    setCategoryPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, assetCategory === item.value && styles.pickerItemTextSelected]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No categories available</Text>}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 0,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  pageSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  addBtn: {
    backgroundColor: '#0f172a',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateInputBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dateInputText: {
    fontSize: 13,
    color: '#0f172a',
  },
  dateInputPlaceholder: {
    fontSize: 13,
    color: '#9ca3af',
  },
  dateToText: {
    marginHorizontal: 10,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 40,
    fontSize: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardDate: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeDone: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  statusBadgePending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  statusTextDone: {
    color: '#059669',
  },
  statusTextPending: {
    color: '#d97706',
  },
  cardBody: {
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    width: 90,
  },
  cardValue: {
    fontSize: 12,
    color: '#0f172a',
    flex: 1,
  },
  remarkText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    justifyContent: 'flex-end',
  },
  iconBtn: {
    marginLeft: 16,
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '95%',
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {},
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
  },
  submitBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 15,
    color: '#0f172a',
  },
  placeholderText: {
    fontSize: 15,
    color: '#9ca3af',
  },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  pickerItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  pickerItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  pickerItemText: {
    fontSize: 16,
    color: '#334155',
  },
  pickerItemTextSelected: {
    color: '#0284c7',
    fontWeight: '600',
  },
});

export default ShuntingPrograms;
