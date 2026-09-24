'use client';

import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react';

interface Category {
  _id: string;
  code: string;
  name: string;
  level: 'GRANDPARENT' | 'PARENT' | 'CHILD';
  parentCode: string | null;
  isActive: boolean;
}

export default function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    level: 'GRANDPARENT' | 'PARENT' | 'CHILD';
    parentCode: string;
    isActive: boolean;
  }>({
    code: '',
    name: '',
    level: 'GRANDPARENT',
    parentCode: '',
    isActive: true
  });
  
  const toast = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/asset-categories');
      setCategories(res.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ code: '', name: '', level: 'GRANDPARENT', parentCode: '', isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      code: cat.code,
      name: cat.name,
      level: cat.level,
      parentCode: cat.parentCode || '',
      isActive: cat.isActive
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (code: string) => {
    if (!confirm(`Are you sure you want to delete category ${code}?`)) return;
    try {
      await api.delete(`/asset-categories/${code}`);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      
      const payload = {
        ...formData,
        parentCode: formData.parentCode || null
      };

      if (editingCategory) {
        await api.patch(`/asset-categories/${editingCategory.code}`, payload);
        toast.success('Category updated successfully');
      } else {
        await api.post('/asset-categories', payload);
        toast.success('Category created successfully');
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to find potential parents for the selected level
  const getPotentialParents = (currentLevel: string) => {
    if (currentLevel === 'PARENT') {
      return categories.filter(c => c.level === 'GRANDPARENT');
    }
    if (currentLevel === 'CHILD') {
      return categories.filter(c => c.level === 'PARENT');
    }
    return [];
  };

  return (
    <div className="bg-white rounded-lg border-2 border-gray-600 flex-1 flex flex-col overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Asset Categories</h2>
        <button 
          onClick={openCreateModal}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-gray-800 transition-colors flex items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">Loading categories...</div>
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-xs sticky top-0">
              <tr>
                <th className="px-6 py-3 font-semibold">Code</th>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Level</th>
                <th className="px-6 py-3 font-semibold">Parent Code</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{cat.code}</td>
                  <td className="px-6 py-4 text-gray-700">{cat.name}</td>
                  <td className="px-6 py-4 text-gray-700">{cat.level}</td>
                  <td className="px-6 py-4 text-gray-500">{cat.parentCode || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      cat.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {cat.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => openEditModal(cat)}
                      className="text-blue-600 hover:text-blue-900 p-1 mx-1"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(cat.code)}
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Code</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.code}
                    onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    disabled={!!editingCategory} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100"
                    placeholder="e.g. WAGON"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900"
                    placeholder="e.g. Wagons"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                  <select
                    value={formData.level}
                    onChange={(e) => {
                      setFormData({
                        ...formData, 
                        level: e.target.value as any,
                        parentCode: '' // Reset parent when level changes
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                  >
                    <option value="GRANDPARENT">GRANDPARENT (Top Level)</option>
                    <option value="PARENT">PARENT</option>
                    <option value="CHILD">CHILD (Bottom Level)</option>
                  </select>
                </div>

                {formData.level !== 'GRANDPARENT' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
                    <select
                      value={formData.parentCode}
                      onChange={(e) => setFormData({...formData, parentCode: e.target.value})}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-gray-900 bg-white"
                    >
                      <option value="">-- Select Parent Category --</option>
                      {getPotentialParents(formData.level).map(p => (
                        <option key={p.code} value={p.code}>
                          {p.code} ({p.name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="checkbox" 
                    id="catIsActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="h-4 w-4 text-gray-900 focus:ring-gray-900 border-gray-300 rounded"
                  />
                  <label htmlFor="catIsActive" className="text-sm font-medium text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-4 border-t">
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
