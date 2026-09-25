import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, Plus, Clock, CheckCircle2, Edit2, Trash2, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

interface ShuntingProgram {
  _id: string;
  shop: string;
  remark: string;
  status: 'PENDING' | 'DONE';
  createdAt: string;
}

const ShuntingPrograms = () => {
  const { user } = useAuth();
  const [programs, setPrograms] = useState<ShuntingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [programToEdit, setProgramToEdit] = useState<ShuntingProgram | null>(null);
  
  // Form State
  const [shop, setShop] = useState('');
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'DONE'>('ALL');

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const [programsRes, locsRes] = await Promise.all([
        api.get('/shunting-programs'),
        api.get('/locations?isActive=true').catch(() => ({ data: [] }))
      ]);
      setPrograms(programsRes.data);
      setLocations(locsRes.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Failed',
        text2: 'Could not load shunting programs',
      });
    } finally {
      setLoading(false);
    }
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
              fetchPrograms();
            } catch (err) {
              Toast.show({ type: 'error', text1: 'Delete Failed', text2: 'Could not delete program' });
            }
          }
        }
      ]
    );
  };

  const toggleStatus = (program: ShuntingProgram) => {
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
              fetchPrograms();
            } catch (err) {
              Toast.show({ type: 'error', text1: 'Update Failed', text2: 'Could not update status' });
            }
          }
        }
      ]
    );
  };

  const openModal = (program?: ShuntingProgram) => {
    if (program) {
      setProgramToEdit(program);
      setShop(program.shop);
      setRemark(program.remark);
    } else {
      setProgramToEdit(null);
      setShop('');
      setRemark('');
    }
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!shop.trim() || !remark.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Shop and remark are required' });
      return;
    }
    
    setSubmitting(true);
    try {
      if (programToEdit) {
        await api.patch(`/shunting-programs/${programToEdit._id}`, { shop, remark });
        Toast.show({ type: 'success', text1: 'Updated', text2: 'Program updated successfully' });
      } else {
        await api.post('/shunting-programs', { shop, remark, status: 'PENDING' });
        Toast.show({ type: 'success', text1: 'Created', text2: 'Program created successfully' });
      }
      setModalVisible(false);
      fetchPrograms();
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
    result.sort((a, b) => {
      if (a.status === 'PENDING' && b.status === 'DONE') return -1;
      if (a.status === 'DONE' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [programs, statusFilter]);

  const isAdmin = user?.role === 'SYSTEM_ADMIN' || user?.role === 'ADMIN';

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredPrograms}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No shunting programs found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
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
                <Text style={styles.shopName}>{item.shop}</Text>
                <Text style={styles.remarkText}>{item.remark}</Text>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openModal(item)}>
                  <Edit2 size={16} color="#0284c7" />
                  <Text style={[styles.actionBtnText, { color: '#0284c7' }]}>Edit</Text>
                </TouchableOpacity>
                {isAdmin && (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item._id)}>
                    <Trash2 size={16} color="#dc2626" />
                    <Text style={[styles.actionBtnText, { color: '#dc2626' }]}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{programToEdit ? 'Edit Program' : 'New Program'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Shop Location</Text>
              <TouchableOpacity 
                style={styles.dropdownInput}
                onPress={() => setPickerVisible(true)}
              >
                <Text style={shop ? styles.inputText : styles.placeholderText}>
                  {shop ? `${locations.find(l => l.code === shop)?.name || shop} (${shop})` : 'Select Shop Location...'}
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
                style={[styles.submitBtn, (!shop.trim() || !remark.trim() || submitting) && styles.submitBtnDisabled]} 
                onPress={handleSubmit}
                disabled={!shop.trim() || !remark.trim() || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>{programToEdit ? 'Save Changes' : 'Create Program'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reusable Location Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Shop</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)} style={styles.closeBtn}>
                <X size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={locations}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[styles.pickerItem, shop === item.code && styles.pickerItemSelected]}
                  onPress={() => {
                    setShop(item.code);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, shop === item.code && styles.pickerItemTextSelected]}>
                    {item.name} ({item.code})
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No locations available</Text>}
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
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
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
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#0f172a',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#fff',
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
    borderRadius: 12,
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
  shopName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  remarkText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
  },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
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
    minHeight: '50%',
    padding: 24,
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
  modalBody: {
    flex: 1,
  },
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
