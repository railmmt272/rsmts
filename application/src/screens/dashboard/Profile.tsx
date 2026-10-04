import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Briefcase, Lock, FileText, User, Eye, EyeOff, LogOut, Edit2 } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import Toast from 'react-native-toast-message';

const Profile = () => {
  const { user, logout, refreshUser } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remark, setRemark] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRemark(user.remark || '');
    }
  }, [user]);

  if (!user) return null;

  const hasChanges = name !== user.name || email !== user.email || remark !== (user.remark || '') || password.length > 0;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: any = { name, email, remark };
      if (password) {
        payload.password = password;
      }

      await api.patch(`/users/${user._id}`, payload);
      await refreshUser();
      setPassword('');
      Toast.show({ type: 'success', text1: 'Success', text2: 'Profile updated successfully' });
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.message || 'Failed to update profile. You might not have permission.';
      Toast.show({ type: 'error', text1: 'Error', text2: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRight} />
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <User size={56} color="#0066ff" />
            </View>
            <View style={styles.editBadge}>
              <Edit2 size={14} color="#ffffff" />
            </View>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Name"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••"
                  secureTextEntry={!showPassword}
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                  {showPassword ? <Eye size={20} color="#94a3b8" /> : <EyeOff size={20} color="#94a3b8" />}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role</Text>
              <View style={[styles.inputContainer, styles.readonlyInputContainer]}>
                <Briefcase size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.readonlyText]}
                  value={user.role}
                  editable={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Remark</Text>
              <View style={styles.inputContainer}>
                <FileText size={20} color="#64748b" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={remark}
                  onChangeText={setRemark}
                  placeholder="No remark added"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View style={styles.bottomContainer}>
              {hasChanges && (
                <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerRight: {
    width: 40,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarContainer: {
    alignSelf: 'center',
    position: 'relative',
    marginBottom: 32,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0066ff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  readonlyInputContainer: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    height: '100%',
  },
  readonlyText: {
    color: '#94a3b8',
  },
  eyeIcon: {
    padding: 8,
    marginRight: -8,
  },
  bottomContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#0066ff',
    borderRadius: 16,
    height: 56,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  }
});

export default Profile;
