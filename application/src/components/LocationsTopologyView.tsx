import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Asset } from '../screens/dashboard/CommandCenter';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import LocationCard from './LocationCard';

interface Location {
  code: string;
  name: string;
  isActive?: boolean;
}

interface Props {
  locations: Location[];
  assets: Asset[];
  loading: boolean;
  error: string;
}

export default function LocationsTopologyView({ locations, assets, loading, error }: Props) {
  const [expandedLocation, setExpandedLocation] = useState<string | null>(null);

  if (loading) {
    return <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />;
  }

  if (error) {
    return <Text style={{ color: 'red', textAlign: 'center', marginTop: 20 }}>{error}</Text>;
  }

  // Group assets by location
  const assetsByLocation = assets.reduce((acc, asset) => {
    const loc = asset.currentLocationCode;
    if (!acc[loc]) acc[loc] = [];
    acc[loc].push(asset);
    return acc;
  }, {} as Record<string, Asset[]>);

  const toggleLocation = (code: string) => {
    setExpandedLocation(prev => prev === code ? null : code);
  };

  if (locations.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.description}>No active locations found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Live occupancy and asset distribution across all active locations.
      </Text>
      
      {locations.map((loc) => {
        const locAssets = assetsByLocation[loc.code] || [];
        const isExpanded = expandedLocation === loc.code;

        return (
          <View key={loc.code} style={styles.groupContainer}>
            <LocationCard
              location={loc}
              onPress={() => toggleLocation(loc.code)}
              rightAccessory={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={styles.occupancyBadge}>
                    <Text style={styles.occupancyText}>{locAssets.length} Assets</Text>
                  </View>
                  {isExpanded ? <ChevronDown size={20} color="#6b7280" /> : <ChevronRight size={20} color="#9ca3af" />}
                </View>
              }
            >
            {isExpanded && (
              <View style={styles.assetsList}>
                {locAssets.length === 0 ? (
                  <Text style={styles.noSubLocations}>No assets currently at this location</Text>
                ) : (
                  locAssets.map((a, i) => (
                    <View key={a._id || i} style={styles.assetItem}>
                      <Text style={styles.assetNum}>{a.assetNumber}</Text>
                      <View style={[styles.statusBadge, a.status === 'READY_TO_DISPATCH' && styles.statusWarn, a.status === 'DISPATCHED' && styles.statusSuccess]}>
                        <Text style={[styles.statusText, a.status === 'READY_TO_DISPATCH' && styles.statusTextWarn, a.status === 'DISPATCHED' && styles.statusTextSuccess]}>{a.status.replace(/_/g, ' ')}</Text>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
            </LocationCard>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  description: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 18,
  },
  groupContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  groupHeaderExpanded: {
    backgroundColor: '#f0f9ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  groupCode: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  occupancyBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  occupancyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  assetsList: {
    padding: 16,
    backgroundColor: '#fff',
  },
  noSubLocations: {
    fontSize: 12,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  assetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  assetNum: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  statusBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusWarn: { backgroundColor: '#fef3c7' },
  statusSuccess: { backgroundColor: '#dcfce3' },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#475569',
  },
  statusTextWarn: { color: '#d97706' },
  statusTextSuccess: { color: '#166534' },
});
