import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, SlidersHorizontal, CheckCircle2, Circle, X, ChevronDown, Clock } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import LocationsTopologyView from '../../components/LocationsTopologyView';

// Shared types
export interface Asset {
  _id: string;
  assetNumber: string;
  type: string;
  categoryCode: string;
  status: string;
  currentPipeline: string;
  currentLocationCode: string;
  description?: string;
  remark?: string;
}

export interface LocationNode {
  code: string;
  name: string;
  category: 'COMMON' | 'REPAIRING' | 'MANUFACTURING';
  locationType: string;
  maxCapacity: number;
  children?: LocationNode[];
}

export interface MovementLog {
  _id: string;
  fromLocationCode: string;
  toLocationCode: string;
  movedBy: {
    username: string;
    name: string;
  };
  movedAt: string;
  remark: string;
}

// Custom Modal Picker Component
const CustomPickerModal = ({ 
  visible, onClose, title, items, onSelect, selectedValue 
}: { 
  visible: boolean, onClose: () => void, title: string, items: {label: string, value: string}[], onSelect: (val: string) => void, selectedValue: string 
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerCloseBtn}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={item => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.pickerItem, selectedValue === item.value && styles.pickerItemSelected]}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={[styles.pickerItemText, selectedValue === item.value && styles.pickerItemTextSelected]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.pickerEmptyText}>No options available</Text>}
          />
        </View>
      </View>
    </Modal>
  );
};

const repairTabs = [
  { id: 'ALL', label: 'All Repair' },
  { id: 'NSY', label: 'NSY' },
  { id: 'SHOP', label: 'Shop (WRS 1-4)' },
  { id: 'QA', label: 'QA (WRS 5)' },
  { id: 'OTHER', label: 'Other' },
  { id: 'READY_TO_DISPATCH', label: '🟡 Ready to Dispatch' },
  { id: 'DISPATCHED', label: '✅ Dispatched' },
];

const mfgTabs = [
  { id: 'ALL', label: 'All MFG' },
  { id: 'GIF', label: 'GIF Shop' },
  { id: 'CRANE', label: 'Crane Manufacturing' },
  { id: 'OTHER', label: 'Other' },
  { id: 'READY_TO_DISPATCH', label: '🟡 Ready to Dispatch' },
  { id: 'DISPATCHED', label: '✅ Dispatched' },
];

const CommandCenter = () => {
  const { user } = useAuth();
  
  // Permissions
  const isViewer = user?.role === 'VIEWER';
  const showRepair = user?.role !== 'MANUFACTURING_SUPERVISOR';
  const showMfg = user?.role !== 'REPAIR_SUPERVISOR';

  // State
  const [assets, setAssets] = useState<Asset[]>([]);
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activePipeline, setActivePipeline] = useState<'REPAIRING' | 'MANUFACTURING' | 'LOCATIONS'>(
    showRepair ? 'REPAIRING' : showMfg ? 'MANUFACTURING' : 'LOCATIONS'
  );
  const [activeStage, setActiveStage] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Routing Modal State
  const [routeModalVisible, setRouteModalVisible] = useState(false);
  const [selectedAssetForRoute, setSelectedAssetForRoute] = useState<Asset | null>(null);
  const [allowedDestinations, setAllowedDestinations] = useState<string[]>([]);
  
  const [routeLocL1, setRouteLocL1] = useState('');
  const [routeLocL2, setRouteLocL2] = useState('');
  const [routeLocL3, setRouteLocL3] = useState('');

  const [routeRemark, setRouteRemark] = useState('');
  const [loadingDestinations, setLoadingDestinations] = useState(false);
  const [routingSubmitting, setRoutingSubmitting] = useState(false);

  // History Modal State
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [selectedHistoryAsset, setSelectedHistoryAsset] = useState<Asset | null>(null);
  const [movementHistory, setMovementHistory] = useState<MovementLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const lastTapRef = React.useRef<{[key: string]: number}>({});

  const handleCardPress = (asset: Asset) => {
    const now = Date.now();
    const lastTap = lastTapRef.current[asset._id] || 0;
    if (now - lastTap < 300) {
      openHistoryModal(asset);
      lastTapRef.current[asset._id] = 0;
    } else {
      lastTapRef.current[asset._id] = now;
    }
  };

  const openHistoryModal = async (asset: Asset) => {
    setSelectedHistoryAsset(asset);
    setHistoryModalVisible(true);
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const res = await api.get(`/movements/asset/${asset.assetNumber}`);
      setMovementHistory(res.data);
    } catch (err: any) {
      setHistoryError(err.response?.data?.message || 'Failed to fetch history');
    } finally {
      setHistoryLoading(false);
    }
  };

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
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const [assetsRes, locRes] = await Promise.all([
        api.get('/assets'),
        api.get('/locations/hierarchy')
      ]);
      setAssets(assetsRes.data);
      setLocations(locRes.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const occupancyMap = useMemo(() => {
    return assets.reduce((acc, asset) => {
      const loc = asset.currentLocationCode;
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [assets]);

  // Reset stage when switching pipelines or searching
  useEffect(() => {
    setActiveStage('ALL');
  }, [activePipeline, searchTerm]);

  // Filtering Logic
  const filteredAssets = useMemo(() => {
    let result = assets.filter((a) => a.currentPipeline === activePipeline);

    if (searchTerm.trim()) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((a) =>
        a.assetNumber.toLowerCase().includes(lowerSearch) ||
        a.categoryCode.toLowerCase().includes(lowerSearch) ||
        a.currentLocationCode.toLowerCase().includes(lowerSearch)
      );
    }

    if (activePipeline === 'REPAIRING') {
      switch (activeStage) {
        case 'ALL':
          result = result.filter(a => !['READY_TO_DISPATCH', 'DISPATCHED'].includes(a.status));
          break;
        case 'NSY':
          result = result.filter(a => a.currentLocationCode === 'NSY' && !['READY_TO_DISPATCH','DISPATCHED'].includes(a.status));
          break;
        case 'SHOP':
          result = result.filter(a => ['WRS_1', 'WRS_2', 'WRS_3', 'WRS_4'].includes(a.currentLocationCode) && !['READY_TO_DISPATCH','DISPATCHED'].includes(a.status));
          break;
        case 'QA':
          result = result.filter(a => a.currentLocationCode === 'WRS_5' && !['READY_TO_DISPATCH','DISPATCHED'].includes(a.status));
          break;
        case 'READY_TO_DISPATCH':
          result = result.filter(a => a.status === 'READY_TO_DISPATCH');
          break;
        case 'DISPATCHED':
          result = result.filter(a => a.status === 'DISPATCHED');
          break;
        case 'OTHER':
          result = result.filter(a => !['NSY', 'WRS_1', 'WRS_2', 'WRS_3', 'WRS_4', 'WRS_5'].includes(a.currentLocationCode) && !['READY_TO_DISPATCH','DISPATCHED'].includes(a.status));
          break;
      }
    } else {
      switch (activeStage) {
        case 'ALL':
          result = result.filter(a => !['READY_TO_DISPATCH', 'DISPATCHED'].includes(a.status));
          break;
        case 'GIF':
          result = result.filter(a => a.currentLocationCode === 'GIF_SHOP' && !['READY_TO_DISPATCH','DISPATCHED'].includes(a.status));
          break;
        case 'CRANE':
          result = result.filter(a => a.currentLocationCode === 'CRANE_MANUFACTURING_SHOP' && !['READY_TO_DISPATCH','DISPATCHED'].includes(a.status));
          break;
        case 'READY_TO_DISPATCH':
          result = result.filter(a => a.status === 'READY_TO_DISPATCH');
          break;
        case 'DISPATCHED':
          result = result.filter(a => a.status === 'DISPATCHED');
          break;
        case 'OTHER':
          result = result.filter(a => !['GIF_SHOP', 'CRANE_MANUFACTURING_SHOP'].includes(a.currentLocationCode) && !['READY_TO_DISPATCH','DISPATCHED'].includes(a.status));
          break;
      }
    }

    return result;
  }, [assets, activePipeline, activeStage, searchTerm]);

  const openPicker = (
    title: string, 
    items: {label: string, value: string}[], 
    selectedValue: string, 
    onSelect: (val: string) => void
  ) => {
    setPickerConfig({ visible: true, title, items, selectedValue, onSelect });
  };

  const allowedHierarchy = useMemo(() => {
    if (!allowedDestinations.length) return [];
    const filterHierarchy = (nodes: LocationNode[]): LocationNode[] => {
      return nodes.map(node => {
        let newChildren: LocationNode[] = [];
        if (node.children && node.children.length > 0) {
          newChildren = filterHierarchy(node.children);
        }
        if (allowedDestinations.includes(node.code) || newChildren.length > 0) {
          return { ...node, children: newChildren };
        }
        return null;
      }).filter(Boolean) as LocationNode[];
    };
    return filterHierarchy(locations);
  }, [locations, allowedDestinations]);

  const locL1Options = allowedHierarchy.map(l => ({ label: `${l.name} (${l.code})`, value: l.code }));
  const selectedLocL1Node = allowedHierarchy.find(l => l.code === routeLocL1);
  
  const locL2Options = selectedLocL1Node?.children?.map(l => ({ label: `${l.name} (${l.code})`, value: l.code })) || [];
  const selectedLocL2Node = selectedLocL1Node?.children?.find(l => l.code === routeLocL2);
  
  const locL3Options = selectedLocL2Node?.children?.map(l => ({ label: `${l.name} (${l.code})`, value: l.code })) || [];

  const checkPermission = () => {
    if (isViewer) {
      Toast.show({
        type: 'error',
        text1: 'Permission Denied',
        text2: 'You do not have permission to perform this action.',
      });
      return false;
    }
    return true;
  };

  const handleDelete = (asset: Asset) => {
    if (!checkPermission()) return;
    
    Alert.alert(
      'Delete Asset',
      `Are you sure you want to delete asset ${asset.assetNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/assets/${asset.assetNumber}`);
              Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: `Asset ${asset.assetNumber} deleted successfully`,
              });
              fetchAssets();
            } catch (err: any) {
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: err.response?.data?.message || err.message || 'Failed to delete asset',
              });
            }
          }
        }
      ]
    );
  };

  const handleDispatch = async (asset: Asset) => {
    if (!checkPermission()) return;
    
    const nextStatus = asset.status === 'READY_TO_DISPATCH' ? 'DISPATCHED' : 'READY_TO_DISPATCH';
    const label = nextStatus === 'DISPATCHED' ? 'dispatched' : 'marked as Ready to Dispatch';
    
    try {
      await api.patch(`/assets/${asset.assetNumber}/status`, { status: nextStatus });
      Toast.show({
        type: 'success',
        text1: 'Status Updated',
        text2: `Asset ${asset.assetNumber} ${label}`,
      });
      fetchAssets();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: err.response?.data?.message || err.message || 'Failed to update dispatch status',
      });
    }
  };

  const openRouteModal = async (asset: Asset) => {
    if (!checkPermission()) return;
    
    setSelectedAssetForRoute(asset);
    setRouteLocL1('');
    setRouteLocL2('');
    setRouteLocL3('');
    setRouteRemark('');
    setRouteModalVisible(true);
    
    try {
      setLoadingDestinations(true);
      const res = await api.get('/routing-rules/allowed', {
        params: {
          category: asset.categoryCode,
          pipeline: asset.currentPipeline
        }
      });
      setAllowedDestinations(res.data);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Failed',
        text2: err.response?.data?.message || err.message || 'Failed to fetch allowed destinations',
      });
      setAllowedDestinations([]);
    } finally {
      setLoadingDestinations(false);
    }
  };

  const handleRouteSubmit = async () => {
    const finalLoc = routeLocL3 || routeLocL2 || routeLocL1;
    if (!selectedAssetForRoute || !finalLoc || !routeRemark.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Destination and remark are required.',
      });
      return;
    }

    if (!allowedDestinations.includes(finalLoc)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Destination',
        text2: 'Please select a fully specified, valid destination.',
      });
      return;
    }

    try {
      setRoutingSubmitting(true);
      await api.post('/movements', {
        assetNumber: selectedAssetForRoute.assetNumber,
        toLocationCode: finalLoc,
        remark: routeRemark.trim()
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Asset successfully moved to ${finalLoc}`,
      });
      
      setRouteModalVisible(false);
      fetchAssets();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Routing Failed',
        text2: err.response?.data?.message || err.message || 'Failed to move asset',
      });
    } finally {
      setRoutingSubmitting(false);
    }
  };

  const currentStageTabs = activePipeline === 'REPAIRING' ? repairTabs : mfgTabs;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image source={require('../../assets/logo_bg_removed.png')} style={styles.logoImage} resizeMode="contain" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>Hi, {user?.name}</Text>
          <Text style={styles.userName}>{user?.role}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={16} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search assets, location..."
          placeholderTextColor="#9ca3af"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <SlidersHorizontal size={16} color="#64748b" style={styles.filterIcon} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Workshop Operations Command Center</Text>

        {/* Pipelines Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollTabsRow}>
          {showRepair && (
            <TouchableOpacity 
              style={[styles.tabButton, activePipeline === 'REPAIRING' && styles.tabButtonActive]}
              onPress={() => setActivePipeline('REPAIRING')}
            >
              <Text style={[styles.tabText, activePipeline === 'REPAIRING' && styles.tabTextActive]}>Repair</Text>
            </TouchableOpacity>
          )}
          {showMfg && (
            <TouchableOpacity 
              style={[styles.tabButton, activePipeline === 'MANUFACTURING' && styles.tabButtonActive]}
              onPress={() => setActivePipeline('MANUFACTURING')}
            >
              <Text style={[styles.tabText, activePipeline === 'MANUFACTURING' && styles.tabTextActive]}>MFG</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.tabButton, activePipeline === 'LOCATIONS' && styles.tabButtonActive]}
            onPress={() => setActivePipeline('LOCATIONS')}
          >
            <Text style={[styles.tabText, activePipeline === 'LOCATIONS' && styles.tabTextActive]}>Locations Topology</Text>
          </TouchableOpacity>
        </ScrollView>

        {activePipeline !== 'LOCATIONS' ? (
          <>
            <Text style={styles.sectionSubtitle}>Stages</Text>

            {/* Stages Sub-Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollTabsRow}>
              {currentStageTabs.map(tab => {
                const isSelected = activeStage === tab.id;
                let customStyle = {};
                let customTextStyle = {};
                
                if (isSelected) {
                  if (tab.id === 'DISPATCHED') {
                    customStyle = { backgroundColor: '#d1fae5', borderColor: '#10b981' };
                    customTextStyle = { color: '#065f46' };
                  } else if (tab.id === 'READY_TO_DISPATCH') {
                    customStyle = { backgroundColor: '#fef3c7', borderColor: '#f59e0b' };
                    customTextStyle = { color: '#92400e' };
                  } else {
                    customStyle = styles.tabButtonActive;
                    customTextStyle = styles.tabTextActive;
                  }
                }

                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tabButton, styles.smallTab, isSelected && customStyle]}
                    onPress={() => setActiveStage(tab.id)}
                  >
                    <Text style={[styles.tabText, isSelected && customTextStyle]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Asset Cards */}
            {loading ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
            ) : error ? (
              <Text style={{ color: 'red', textAlign: 'center', marginTop: 20 }}>{error}</Text>
            ) : filteredAssets.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No assets found for this filter.</Text>
              </View>
            ) : (
              filteredAssets.map(asset => (
                <TouchableOpacity activeOpacity={0.9} onPress={() => handleCardPress(asset)} key={asset._id} style={styles.card}>
                  <View style={styles.cardContent}>
                    <View style={styles.columnLeft}>
                      <Text style={styles.label}>Asset No: <Text style={styles.value}>{asset.assetNumber}</Text></Text>
                      <Text style={styles.label}>Location: <Text style={styles.value}>{asset.currentLocationCode}</Text></Text>
                    </View>
                    <View style={styles.columnMid}>
                      <Text style={styles.label}>Category: <Text style={styles.value}>{asset.categoryCode || 'N/A'}</Text></Text>
                    </View>
                  </View>
                  <View style={styles.statusRow}>
                    <Text style={styles.label}>Status:</Text>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{asset.status}</Text>
                    </View>
                  </View>
                  <View style={styles.remarkRow}>
                    <Text style={styles.label} numberOfLines={2}>Remarks: <Text style={styles.value}>{asset.remark || 'N/A'}</Text></Text>
                  </View>
                  <View style={styles.cardActions}>
                {asset.status !== 'DISPATCHED' && (
                  <TouchableOpacity style={[styles.actionBtn, asset.status === 'READY_TO_DISPATCH' ? styles.btnGreen : styles.btnOrangeLight]} onPress={() => handleDispatch(asset)}>
                    <Text style={asset.status === 'READY_TO_DISPATCH' ? styles.btnTextGreen : styles.btnTextOrangeLight}>
                      {asset.status === 'READY_TO_DISPATCH' ? '✓ Mark Dispatched' : 'Mark Ready to Dispatch'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, styles.btnGray]} onPress={() => openRouteModal(asset)}>
                  <Text style={styles.btnTextGray}>Route / Reroute</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.btnRed]} onPress={() => handleDelete(asset)}>
                  <Text style={styles.btnTextRed}>Delete</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
            )}
          </>
        ) : (
          <LocationsTopologyView locations={locations} occupancyMap={occupancyMap} loading={loading} error={error} />
        )}

      </ScrollView>

      {/* Route Reroute Modal */}
      <Modal
        visible={routeModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRouteModalVisible(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Route / Reroute Asset</Text>
              <TouchableOpacity onPress={() => setRouteModalVisible(false)} style={styles.closeBtn}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>Select Destination for Asset <Text style={{fontWeight: '700', color: '#0f172a'}}>{selectedAssetForRoute?.assetNumber}</Text></Text>
              
              {loadingDestinations ? (
                <ActivityIndicator size="small" color="#0284c7" style={{ marginVertical: 20 }} />
              ) : allowedDestinations.length === 0 ? (
                <Text style={{ color: '#dc2626', marginVertical: 10 }}>No allowed destinations found for this asset.</Text>
              ) : (
                <View style={{ marginBottom: 20 }}>
                  <Text style={styles.modalLabel}>Select Destination <Text style={styles.required}>*</Text></Text>
                  <TouchableOpacity style={styles.dropdownInput} onPress={() => openPicker('Select Location Group', locL1Options, routeLocL1, (val) => { setRouteLocL1(val); setRouteLocL2(''); setRouteLocL3(''); })}>
                    <Text style={routeLocL1 ? styles.inputText : styles.placeholderText}>{routeLocL1 ? locL1Options.find(o => o.value === routeLocL1)?.label : 'Select Location Group'}</Text>
                    <ChevronDown size={20} color="#9ca3af" />
                  </TouchableOpacity>
                  
                  {routeLocL1 && locL2Options.length > 0 && (
                    <TouchableOpacity style={styles.dropdownInput} onPress={() => openPicker('Select Sub Location', locL2Options, routeLocL2, (val) => { setRouteLocL2(val); setRouteLocL3(''); })}>
                      <Text style={routeLocL2 ? styles.inputText : styles.placeholderText}>{routeLocL2 ? locL2Options.find(o => o.value === routeLocL2)?.label : 'Select Sub Location'}</Text>
                      <ChevronDown size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  )}

                  {routeLocL2 && locL3Options.length > 0 && (
                    <TouchableOpacity style={styles.dropdownInput} onPress={() => openPicker('Select Track/Point', locL3Options, routeLocL3, setRouteLocL3)}>
                      <Text style={routeLocL3 ? styles.inputText : styles.placeholderText}>{routeLocL3 ? locL3Options.find(o => o.value === routeLocL3)?.label : 'Select Track/Point'}</Text>
                      <ChevronDown size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Text style={styles.modalLabel}>Remark <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Enter remark"
                value={routeRemark}
                onChangeText={setRouteRemark}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
              
              <TouchableOpacity 
                style={[styles.submitBtn, (!(routeLocL3 || routeLocL2 || routeLocL1) || !routeRemark.trim() || routingSubmitting) && styles.submitBtnDisabled]} 
                onPress={handleRouteSubmit}
                disabled={!(routeLocL3 || routeLocL2 || routeLocL1) || !routeRemark.trim() || routingSubmitting}
              >
                {routingSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Route Asset</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reusable Picker Modal */}
      {/* History Modal */}
      <Modal visible={historyModalVisible} transparent animationType="slide" onRequestClose={() => setHistoryModalVisible(false)}>
        <View style={styles.pickerOverlay}>
          <View style={[styles.pickerContent, { maxHeight: '80%' }]}>
            <View style={styles.pickerHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Clock color="#0284c7" size={20} style={{marginRight: 8}} />
                <Text style={styles.pickerTitle}>History: {selectedHistoryAsset?.assetNumber}</Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.pickerCloseBtn}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            {historyLoading ? (
              <ActivityIndicator size="large" color="#0284c7" style={{ marginVertical: 40 }} />
            ) : historyError ? (
              <Text style={{ color: 'red', textAlign: 'center', marginVertical: 20 }}>{historyError}</Text>
            ) : (
              <FlatList
                data={movementHistory}
                keyExtractor={item => item._id}
                contentContainerStyle={{ padding: 20 }}
                renderItem={({ item }) => (
                  <View style={{ marginBottom: 16, borderLeftWidth: 2, borderLeftColor: '#e2e8f0', paddingLeft: 12 }}>
                    <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
                      {new Date(item.movedAt).toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#0f172a', fontWeight: '500', marginBottom: 2 }}>
                      {item.fromLocationCode} ➔ {item.toLocationCode}
                    </Text>
                    <Text style={{ fontSize: 13, color: '#475569' }}>
                      By: {item.movedBy?.name || item.movedBy?.username || 'System'}
                    </Text>
                    {!!item.remark && (
                      <Text style={{ fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' }}>
                        "{item.remark}"
                      </Text>
                    )}
                  </View>
                )}
                ListEmptyComponent={<Text style={styles.pickerEmptyText}>No movement history found.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>

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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  logoContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logoImage: {
    width: 40,
    height: 40,
  },
  userInfo: {
    alignItems: 'flex-end',
  },
  greeting: {
    fontSize: 13,
    fontWeight: '500',
    color: '#0f172a',
  },
  userName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 20,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0f172a',
    paddingVertical: 0,
  },
  filterIcon: {
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#444850',
    marginBottom: 12,
  },
  scrollTabsRow: {
    marginBottom: 16,
    flexDirection: 'row',
  },
  tabButton: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'flex-start',
  },
  tabButtonActive: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  tabTextActive: {
    color: '#0369a1',
  },
  smallTab: {
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  columnLeft: {
    flex: 3,
    paddingRight: 10,
  },
  columnMid: {
    flex: 2,
  },
  label: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 6,
  },
  value: {
    fontWeight: '600',
    color: '#0f172a',
    fontSize: 11,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  remarkRow: {
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0284c7',
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnOrange: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  btnTextOrange: {
    color: '#d97706',
    fontSize: 10,
    fontWeight: '600',
  },
  btnOrangeLight: {
    borderColor: '#fbbf24',
    backgroundColor: '#fffbeb',
  },
  btnTextOrangeLight: {
    color: '#92400e',
    fontWeight: '600',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 16,
  },
  dropdownInput: {
    flexDirection: 'row',
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
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
  pickerCloseBtn: {
    padding: 4,
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
  pickerEmptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: 20,
    fontStyle: 'italic',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
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
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#0284c7',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  btnGreen: {
    borderColor: '#34d399',
    backgroundColor: '#ecfdf5',
  },
  btnTextGreen: {
    color: '#047857',
    fontSize: 10,
    fontWeight: '600',
  },
  btnGray: {
    borderColor: '#94a3b8',
    backgroundColor: '#ffffff',
  },
  btnTextGray: {
    color: '#334155',
    fontSize: 10,
    fontWeight: '500',
  },
  btnRed: {
    borderColor: '#fca5a5',
    backgroundColor: '#ffffff',
  },
  btnTextRed: {
    color: '#e11d48',
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '500',
  }
});

export default CommandCenter;
