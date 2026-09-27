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
}

export default function LocationPickerModal({ visible, onClose, title, locations, onSelect, selectedCode }: Props) {
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
});
