import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LayoutDashboard, User, TrainFront, ClipboardList } from 'lucide-react-native';
import CommandCenter from './CommandCenter';
import RegisterAsset from './RegisterAsset';
import ShuntingPrograms from './ShuntingPrograms';
import Profile from './Profile';

type TabType = 'CommandCenter' | 'RegisterAsset' | 'ShuntingPrograms' | 'Profile';

const MainTabs = () => {
  const [activeTab, setActiveTab] = useState<TabType>('CommandCenter');

  const renderScreen = () => {
    switch (activeTab) {
      case 'CommandCenter':
        return <CommandCenter />;
      case 'RegisterAsset':
        return <RegisterAsset />;
      case 'ShuntingPrograms':
        return <ShuntingPrograms />;
      case 'Profile':
        return <Profile />;
      default:
        return <CommandCenter />;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {renderScreen()}
      </View>

      <SafeAreaView edges={['bottom']} style={styles.tabBar}>
        <View style={styles.tabBarInner}>
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('CommandCenter')}
          >
            <LayoutDashboard
              size={24}
              color={activeTab === 'CommandCenter' ? '#0284c7' : '#9ca3af'}
            />
            {activeTab === 'CommandCenter' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('RegisterAsset')}
          >
            <TrainFront
              size={24}
              color={activeTab === 'RegisterAsset' ? '#0284c7' : '#9ca3af'}
            />
            {activeTab === 'RegisterAsset' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('ShuntingPrograms')}
          >
            <ClipboardList
              size={24}
              color={activeTab === 'ShuntingPrograms' ? '#0284c7' : '#9ca3af'}
            />
            {activeTab === 'ShuntingPrograms' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => setActiveTab('Profile')}
          >
            <User
              size={24}
              color={activeTab === 'Profile' ? '#0284c7' : '#9ca3af'}
            />
            {activeTab === 'Profile' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  tabBarInner: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0284c7',
  }
});

export default MainTabs;
