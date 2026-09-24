'use client';

import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';

interface Location {
  _id: string;
  code: string;
  name: string;
  remark?: string;
  isActive: boolean;
}

export default function LocationsManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    remark: '',
    isActive: true
  });
  
  const toast = useToast();

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await api.get('/locations');
      setLocations(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch locations');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingLocation(null);
    setFormData({ code: '', name: '', remark: '', isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (loc: Location) => {
    setEditingLocation(loc);
    setFormData({
      code: loc.code,
      name: loc.name,
      remark: loc.remark || '',
      isActive: loc.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete location ${code}?`)) return;
    try {
      await api.delete(`/locations/${code}`);
      toast.success('Location deleted successfully');
      fetchLocations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete location');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      if (editingLocation) {
        await api.patch(`/locations/${editingLocation.code}`, formData);
        toast.success('Location updated successfully');
      } else {
        await api.post('/locations', formData);
        toast.success('Location created successfully');
      }
      setIsModalOpen(false);
      fetchLocations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save location');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-600 flex-1 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Locations</h2>
        <button 
          onClick={openCreateModal}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Location
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading locations...</div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-xs sticky top-0">
              <tr>
                <th className="px-6 py-3 font-semibold">Code</th>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Remark</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {locations.map((loc) => (
                <tr key={loc._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{loc.code}</td>
                  <td className="px-6 py-4 text-gray-700">{loc.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      loc.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {loc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{loc.remark || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openEditModal(loc)}
                      className="text-blue-600 hover:text-blue-900 p-1 mx-1"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(loc.code)}
                      className="text-red-600 hover:text-red-900 p-1 mx-1"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Code</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    disabled={!!editingLocation} // Cannot edit code after creation
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
                    placeholder="e.g. WRS_1_TO_4"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900"
                    placeholder="e.g. WRS 1 to 4"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remark (Optional)</label>
                  <textarea 
                    value={formData.remark}
                    onChange={(e) => setFormData({...formData, remark: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900"
                    placeholder="Additional details..."
                    rows={2}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                    Active (Can assets be routed here?)
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting ? 'Saving...' : <><Check className="h-4 w-4" /> Save</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
