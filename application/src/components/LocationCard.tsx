import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';

export interface LocationNode {
  code: string;
  name: string;
  remark?: string;
  isActive?: boolean;
}

interface Props {
  location: LocationNode;
  onPress?: () => void;
  selected?: boolean;
  rightAccessory?: React.ReactNode;
  children?: React.ReactNode;
}

export default function LocationCard({ location, onPress, selected, rightAccessory, children }: Props) {
  const [expanded, setExpanded] = useState(false);
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePress = () => {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (now - lastTap < 300) {
      // Double tap
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
      setExpanded(prev => !prev);
      lastTapRef.current = 0;
    } else {
      // Single tap
      lastTapRef.current = now;
      if (onPress) {
        tapTimeoutRef.current = setTimeout(() => {
          onPress();
        }, 300);
      } else {
        // Just expand/collapse on single tap if there is no onPress, or maybe nothing.
        // Wait, if no onPress, double tap still works.
      }
    }
  };

  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={handlePress} 
      style={[styles.card, selected && styles.cardSelected]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.code}>{location.code}</Text>
          <Text style={styles.name}>{location.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, location.isActive !== false ? styles.statusActive : styles.statusInactive]}>
            {location.isActive !== false ? <CheckCircle2 size={12} color="#16a34a" /> : <XCircle size={12} color="#dc2626" />}
            <Text style={[styles.statusText, location.isActive !== false ? styles.statusTextActive : styles.statusTextInactive]}>
              {location.isActive !== false ? 'Active' : 'Inactive'}
            </Text>
          </View>
          {rightAccessory}
        </View>
      </View>
      {location.remark ? (
        <View style={styles.remarkContainer}>
          <Text 
            style={styles.remarkText}
            numberOfLines={expanded ? undefined : 1}
          >
            {location.remark}
          </Text>
        </View>
      ) : null}
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cardSelected: {
    borderColor: '#0284c7',
    backgroundColor: '#f0f9ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  code: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 2,
  },
  name: {
    fontSize: 12,
    color: '#475569',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  statusActive: {
    backgroundColor: '#dcfce7',
  },
  statusInactive: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  statusTextActive: {
    color: '#16a34a',
  },
  statusTextInactive: {
    color: '#dc2626',
  },
  remarkContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  remarkText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  }
});
