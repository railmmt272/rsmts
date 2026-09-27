import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Pressable } from 'react-native';
import { X } from 'lucide-react-native';
import LocationCard, { LocationNode } from './LocationCard';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  locations: LocationNode[];
  onSelect: (code: string) => void;
  selectedCode?: string;
  allowAll?: boolean;
}

export default function LocationPickerModal({ visible, onClose, title, locations, onSelect, selectedCode, allowAll }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={locations}
            keyExtractor={item => item.code}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              allowAll ? (
                <TouchableOpacity
                  style={[styles.allOption, selectedCode === 'ALL' && styles.allOptionSelected]}
                  onPress={() => {
                    onSelect('ALL');
                    onClose();
                  }}
                >
                  <Text style={[styles.allOptionText, selectedCode === 'ALL' && styles.allOptionTextSelected]}>
                    All Locations
                  </Text>
                </TouchableOpacity>
              ) : undefined
            }
            renderItem={({ item }) => (
              <LocationCard 
                location={item} 
                selected={item.code === selectedCode}
                onPress={() => {
                  onSelect(item.code);
                  onClose();
                }}
              />
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>No locations available</Text>}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  listContent: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 20,
  },
  allOption: {
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    alignItems: 'center',
  },
  allOptionSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  allOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#475569',
  },
  allOptionTextSelected: {
    color: '#2563eb',
    fontWeight: '600',
  },
});
