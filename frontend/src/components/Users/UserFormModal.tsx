'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';

console.log("UserFormModal loaded with new UI");

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userToEdit?: User | null;
}

export default function UserFormModal({ isOpen, onClose, onSuccess, userToEdit }: UserFormModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'VIEWER',
    isActive: true,
    remark: '',
  });

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        name: userToEdit.name || '',
        email: userToEdit.email || '',
        password: '', // blank password on edit means do not change
        role: userToEdit.role || 'VIEWER',
        isActive: userToEdit.isActive ?? true,
        remark: userToEdit.remark || '',
      });
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'VIEWER',
        isActive: true,
        remark: '',
      });
    }
    setError(null);
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload: any = { ...formData };

    // On update, remove empty password so we don't try to change it
    if (userToEdit && !payload.password) {
      delete payload.password;
    }

    try {
      if (userToEdit) {
        await api.patch(`/users/${userToEdit._id}`, payload);
        toast.success(`User ${payload.name} updated successfully`);
      } else {
        await api.post('/users', payload);
        toast.success(`User ${payload.name} created successfully`);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'An error occurred';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/20 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 bg-white/40">
          <h3 className="text-lg font-semibold text-gray-900">
            {userToEdit ? 'Edit User' : 'Add User'}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="block w-full border border-gray-300/80 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white/70 transition-colors sm:text-sm"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Email Address</label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="block w-full border border-gray-300/80 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white/70 transition-colors sm:text-sm"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Password</label>
            <input
              type="password"
              name="password"
              required={!userToEdit}
              value={formData.password}
              onChange={handleChange}
              className="block w-full border border-gray-300/80 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white/70 transition-colors sm:text-sm"
              placeholder={userToEdit ? "Leave blank to keep unchanged" : "Minimum 6 characters"}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Role</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="block w-full border border-gray-300/80 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white/70 transition-colors sm:text-sm"
            >
              <option value="SYSTEM_ADMIN">System Admin</option>
              <option value="MANAGEMENT">Management</option>
              <option value="YARD_CONTROLLER">Yard Controller</option>
              <option value="REPAIR_SUPERVISOR">Repair Supervisor</option>
              <option value="MANUFACTURING_SUPERVISOR">Manufacturing Supervisor</option>
              <option value="QA_INSPECTOR">QA Inspector</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Remarks (Optional)</label>
            <textarea
              name="remark"
              rows={3}
              value={formData.remark}
              onChange={handleChange}
              className="block w-full border border-gray-300/80 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent bg-white/70 transition-colors sm:text-sm resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex items-center pt-2">
            <input
              type="checkbox"
              id="isActive"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
              Active User Account
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg border border-gray-300 bg-white/50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Saving...' : userToEdit ? 'Save Changes' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
