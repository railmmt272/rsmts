import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Briefcase, Lock, FileText, Edit2, User, Eye, EyeOff } from 'lucide-react-native';
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
      <View style={styles.topGradientArea}>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        
        <View style={styles.avatarContainer}>
          <View style={styles.avatarCircle}>
            <User size={56} color="#0284c7" />
          </View>
          <View style={styles.editBadge}>
            <Edit2 size={12} color="#ffffff" />
          </View>
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
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

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#0f172a" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topGradientArea: {
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 90,
    height: 90,
    position: 'relative',
  },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#bae6fd',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0f172a',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  readonlyInputContainer: {
    backgroundColor: '#f8fafc',
    shadowOpacity: 0,
    elevation: 0,
    borderColor: '#e2e8f0',
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
    color: '#64748b',
  },
  eyeIcon: {
    padding: 8,
    marginRight: -8,
  },
  bottomContainer: {
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  saveButton: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  logoutButton: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  }
});

export default Profile;
