import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, 
  ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { ChevronDown, TrainFront, X } from 'lucide-react-native';
import api from '../../services/api';

interface IdentificationRule {
  type: 'NUMERIC' | 'ALPHANUMERIC';
  length: number;
  checkDigit: boolean;
}

interface CategoryNode {
  code: string;
  name: string;
  identificationRule?: IdentificationRule;
  children: CategoryNode[];
}

interface LocationNode {
  code: string;
  name: string;
  isActive: boolean;
}

// Custom Modal Picker Component
const CustomPickerModal = ({ 
  visible, onClose, title, items, onSelect, selectedValue 
}: { 
  visible: boolean, onClose: () => void, title: string, items: {label: string, value: string}[], onSelect: (val: string) => void, selectedValue: string 
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={item => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.modalItem, selectedValue === item.value && styles.modalItemSelected]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={[styles.modalItemText, selectedValue === item.value && styles.modalItemTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No options available</Text>}
          />
        </View>
      </View>
    </Modal>
  );
};

export default function RegisterAsset() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [operation, setOperation] = useState<'REPAIRING' | 'MANUFACTURING'>('REPAIRING');
  const [assetNumber, setAssetNumber] = useState('');
  const [remark, setRemark] = useState('');

  // Hierarchies
  const [categoryHierarchy, setCategoryHierarchy] = useState<CategoryNode[]>([]);
  const [locations, setLocations] = useState<LocationNode[]>([]);

  // Selected Categories
  const [catL1, setCatL1] = useState('');
  const [catL2, setCatL2] = useState('');
  const [catL3, setCatL3] = useState('');

  const [selectedLocation, setSelectedLocation] = useState('');

  // Modal State
  const [pickerConfig, setPickerConfig] = useState<{
    visible: boolean;
    title: string;
    items: {label: string, value: string}[];
    selectedValue: string;
    onSelect: (val: string) => void;
  }>({
    visible: false, title: '', items: [], selectedValue: '', onSelect: () => {}
  });

  useEffect(() => {
    fetchHierarchies();
  }, []);

  const fetchHierarchies = async () => {
    try {
      setLoading(true);
      const [catsRes, locsRes] = await Promise.all([
        api.get('/asset-categories/hierarchy'),
        api.get('/locations?isActive=true')
      ]);
      setCategoryHierarchy(catsRes.data);
      setLocations(locsRes.data);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load hierarchies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAssetNumber('');
    setRemark('');
    setCatL1(''); setCatL2(''); setCatL3('');
    setSelectedLocation('');
  };

  const handleOperationChange = (op: 'REPAIRING' | 'MANUFACTURING') => {
    setOperation(op);
    setSelectedLocation(''); // Reset location
    setCatL1(''); setCatL2(''); setCatL3(''); // Reset categories
  };

  const handleSubmit = async () => {
    const finalCat = catL3 || catL2 || catL1;
    const finalLoc = selectedLocation;

    if (!assetNumber || !finalCat || !finalLoc) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please fill out all required fields (Category, Asset Number, Location)',
      });
      return;
    }

    if (idRule && assetNumber.length !== idRule.length) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: `Asset Number must be exactly ${idRule.length} ${idRule.type === 'NUMERIC' ? 'digits' : 'characters'} long.`,
      });
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        assetNumber,
        categoryCode: finalCat,
        currentLocationCode: finalLoc,
        operation,
        remark
      };

      await api.post('/assets', payload);
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Asset registered successfully!',
      });
      resetForm();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: err.response?.data?.message || err.message || 'An error occurred',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const openPicker = (
    title: string, 
    items: {label: string, value: string}[], 
    selectedValue: string, 
    onSelect: (val: string) => void
  ) => {
    setPickerConfig({ visible: true, title, items, selectedValue, onSelect });
  };

  // Derived Category Lists
  const grandparentOptions = operation === 'MANUFACTURING' 
    ? categoryHierarchy.filter(c => ['WAGON', 'CRANE'].includes(c.code))
    : categoryHierarchy;

  const catL1Options = grandparentOptions.map(c => ({ label: `${c.name} (${c.code})`, value: c.code }));
  const selectedCatL1Node = grandparentOptions.find(c => c.code === catL1);
  
  const catL2Options = selectedCatL1Node?.children?.map(c => ({ label: `${c.name} (${c.code})`, value: c.code })) || [];
  const selectedCatL2Node = selectedCatL1Node?.children?.find(c => c.code === catL2);
  
  const catL3Options = selectedCatL2Node?.children?.map(c => ({ label: `${c.name} (${c.code})`, value: c.code })) || [];

  const getIdentificationRule = (): IdentificationRule | undefined => {
    let rule: IdentificationRule | undefined = undefined;
    if (selectedCatL1Node) {
      if (selectedCatL1Node.identificationRule) rule = selectedCatL1Node.identificationRule;
      if (selectedCatL2Node) {
        if (selectedCatL2Node.identificationRule) rule = selectedCatL2Node.identificationRule;
        const ch = selectedCatL2Node.children?.find(c => c.code === catL3);
        if (ch && ch.identificationRule) rule = ch.identificationRule;
      }
    }
    return rule;
  };

  const idRule = getIdentificationRule();

  const handleAssetNumberChange = (text: string) => {
    let val = text;
    if (idRule) {
      if (idRule.type === 'NUMERIC') {
        val = val.replace(/\D/g, ''); // Remove non-digits
      }
      if (val.length > idRule.length) {
        val = val.slice(0, idRule.length); // Enforce max length
      }
    }
    setAssetNumber(val);
  };

  // Derived Location Lists
  const locationOptions = locations.map((l: LocationNode) => ({ label: `${l.name} (${l.code})`, value: l.code }));
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TrainFront size={28} color="#0284c7" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Register New Asset</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading configurations...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchHierarchies}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            
            {/* Operation Toggle */}
            <View style={styles.section}>
              <Text style={styles.label}>Operation Type <Text style={styles.required}>*</Text></Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity 
                  style={[styles.toggleBtn, operation === 'REPAIRING' && styles.toggleBtnActive]}
                  onPress={() => handleOperationChange('REPAIRING')}
                >
                  <Text style={[styles.toggleText, operation === 'REPAIRING' && styles.toggleTextActive]}>Repairing</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.toggleBtn, operation === 'MANUFACTURING' && styles.toggleBtnActive]}
                  onPress={() => handleOperationChange('MANUFACTURING')}
                >
                  <Text style={[styles.toggleText, operation === 'MANUFACTURING' && styles.toggleTextActive]}>Manufacturing</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Category Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Asset Category <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={styles.dropdownInput} onPress={() => openPicker('Select Category Type', catL1Options, catL1, (val) => { setCatL1(val); setCatL2(''); setCatL3(''); })}>
                <Text style={catL1 ? styles.inputText : styles.placeholderText}>{catL1 ? catL1Options.find(o => o.value === catL1)?.label : 'Select Category Type'}</Text>
                <ChevronDown size={20} color="#9ca3af" />
              </TouchableOpacity>
              
              {catL1 && catL2Options.length > 0 && (
                <TouchableOpacity style={styles.dropdownInput} onPress={() => openPicker('Select Asset Type', catL2Options, catL2, (val) => { setCatL2(val); setCatL3(''); })}>
                  <Text style={catL2 ? styles.inputText : styles.placeholderText}>{catL2 ? catL2Options.find(o => o.value === catL2)?.label : 'Select Asset Type'}</Text>
                  <ChevronDown size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}

              {catL2 && catL3Options.length > 0 && (
                <TouchableOpacity style={styles.dropdownInput} onPress={() => openPicker('Select Specific Model', catL3Options, catL3, setCatL3)}>
                  <Text style={catL3 ? styles.inputText : styles.placeholderText}>{catL3 ? catL3Options.find(o => o.value === catL3)?.label : 'Select Specific Model'}</Text>
                  <ChevronDown size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            {/* Asset Number - Placed AFTER Category per user instruction */}
            <View style={styles.section}>
              <Text style={styles.label}>Asset Number <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.textInput}
                placeholder={idRule ? `Enter ${idRule.length} ${idRule.type === 'NUMERIC' ? 'digits' : 'characters'}` : "Enter unique asset identifier"}
                value={assetNumber}
                onChangeText={handleAssetNumberChange}
                placeholderTextColor="#9ca3af"
                autoCapitalize="characters"
                keyboardType={idRule?.type === 'NUMERIC' ? 'number-pad' : 'default'}
              />
            </View>

            {/* Location Selection */}
            <View style={styles.section}>
              <Text style={styles.label}>Initial Location <Text style={styles.required}>*</Text></Text>
              <TouchableOpacity style={styles.dropdownInput} onPress={() => openPicker('Select Location', locationOptions, selectedLocation, setSelectedLocation)}>
                <Text style={selectedLocation ? styles.inputText : styles.placeholderText}>
                  {selectedLocation ? locationOptions.find((o: any) => o.value === selectedLocation)?.label : 'Select Initial Location'}
                </Text>
                <ChevronDown size={20} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {/* Remark */}
            <View style={styles.section}>
              <Text style={styles.label}>Initial Remark</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Optional notes or details"
                value={remark}
                onChangeText={setRemark}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} 
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Register Asset</Text>
              )}
            </TouchableOpacity>
            
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Reusable Picker Modal */}
      <CustomPickerModal 
        visible={pickerConfig.visible}
        title={pickerConfig.title}
        items={pickerConfig.items}
        selectedValue={pickerConfig.selectedValue}
        onSelect={pickerConfig.onSelect}
        onClose={() => setPickerConfig(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  headerIcon: {
    marginRight: 12,
  },
  keyboardView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0284c7',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#0284c7',
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  toggleTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  dropdownInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  inputText: {
    fontSize: 15,
    color: '#0f172a',
    flex: 1,
  },
  placeholderText: {
    fontSize: 15,
    color: '#9ca3af',
    flex: 1,
  },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  submitBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalItemSelected: {
    backgroundColor: '#f0f9ff',
  },
  modalItemText: {
    fontSize: 16,
    color: '#334155',
  },
  modalItemTextSelected: {
    color: '#0284c7',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: 20,
    fontStyle: 'italic',
  }
});
