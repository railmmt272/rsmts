import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { AlertTriangle, Trash2, CheckCircle2, Info } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ConfirmVariant = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  iconBg: string;
  iconColor: string;
  btnBg: string;
  btnText: string;
  Icon: any;
}> = {
  danger: {
    iconBg: '#fef2f2',
    iconColor: '#dc2626',
    btnBg: '#dc2626',
    btnText: '#ffffff',
    Icon: Trash2,
  },
  warning: {
    iconBg: '#fffbeb',
    iconColor: '#d97706',
    btnBg: '#d97706',
    btnText: '#ffffff',
    Icon: AlertTriangle,
  },
  success: {
    iconBg: '#f0fdf4',
    iconColor: '#16a34a',
    btnBg: '#16a34a',
    btnText: '#ffffff',
    Icon: CheckCircle2,
  },
  info: {
    iconBg: '#eff6ff',
    iconColor: '#2563eb',
    btnBg: '#2563eb',
    btnText: '#ffffff',
    Icon: Info,
  },
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
}) => {
  const [loading, setLoading] = useState(false);
  const config = VARIANT_CONFIG[variant];
  const { Icon } = config;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />
        <View style={styles.container}>
          {/* Icon */}
          <View style={[styles.iconCircle, { backgroundColor: config.iconBg }]}>
            <Icon size={28} color={config.iconColor} />
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, { backgroundColor: config.btnBg }, loading && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <ActivityIndicator color={config.btnText} size="small" />
              ) : (
                <Text style={[styles.confirmBtnText, { color: config.btnText }]}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  container: {
    width: Math.min(SCREEN_WIDTH - 64, 360),
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ConfirmModal;
