import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Briefcase, Lock, FileText, CheckCircle2, Edit2, Check, User, LogOut } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const Profile = () => {
  const { user, logout, refreshUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remark, setRemark] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRemark(user.remark || '');
    }
  }, [user]);

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = { name, email, remark };
      if (password) {
        payload.password = password;
      }
      
      await api.patch(`/users/${user._id}`, payload);
      await refreshUser();
      setIsEditing(false);
      setPassword('');
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to update profile. You might not have permission.';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Image
            source={require('../../assets/logo_bg_removed.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.greeting}>Hi, {user.name}</Text>
          <Text style={styles.userName}>{user.role}</Text>
        </View>
        <TouchableOpacity 
          style={styles.headerEditBtn} 
          onPress={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={isSaving}
        >
          {isEditing ? <Check size={20} color="#0f172a" /> : <Edit2 size={20} color="#0f172a" />}
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <User size={20} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.label}>Name</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                />
              ) : (
                <Text style={styles.value}>{user.name}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Mail size={20} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.label}>Email</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              ) : (
                <Text style={styles.value}>{user.email}</Text>
              )}
            </View>
          </View>

          <View style={styles.infoRow}>
            <Briefcase size={20} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.label}>Role</Text>
              <View style={styles.badgeRow}>
                <Text style={styles.value}>{user.role}</Text>
                {user.isActive && (
                  <View style={styles.activeBadge}>
                    <CheckCircle2 size={12} color="#15803d" />
                    <Text style={styles.activeText}>Active</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          {isEditing && (
            <View style={styles.infoRow}>
              <Lock size={20} color="#64748b" />
              <View style={styles.infoContent}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Leave blank to keep current"
                />
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <FileText size={20} color="#64748b" />
            <View style={styles.infoContent}>
              <Text style={styles.label}>Remark</Text>
              {isEditing ? (
                <TextInput
                  style={styles.input}
                  value={remark}
                  onChangeText={setRemark}
                  placeholder="Add a remark"
                />
              ) : (
                <Text style={styles.value}>{user.remark || 'No remark added'}</Text>
              )}
            </View>
          </View>
        </View>


        {!isEditing && (
          <TouchableOpacity 
            style={[styles.editButton, { marginTop: 12, backgroundColor: '#fee2e2' }]} 
            onPress={logout}
          >
            <LogOut size={18} color="#dc2626" />
            <Text style={[styles.editButtonText, { color: '#dc2626' }]}>Logout</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
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
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerEditBtn: {
    padding: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    marginLeft: 12,
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
    alignItems: 'flex-start',
    flex: 1,
    paddingLeft: 12,
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  activeText: {
    color: '#15803d',
    fontSize: 10,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#0f172a',
  },
  input: {
    fontSize: 16,
    color: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
    paddingVertical: 2,
  },
  editButton: {
    backgroundColor: '#0f172a',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Profile;
