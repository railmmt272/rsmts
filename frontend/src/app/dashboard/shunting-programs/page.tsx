'use client';

import { useState, useEffect } from 'react';
import { Plus, ListTodo, CheckCircle2, Clock } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/contexts/ToastContext';
import ShuntingProgramFormModal from '@/components/ShuntingPrograms/ShuntingProgramFormModal';

interface ShuntingProgram {
  _id: string;
  shop: string;
  remark: string;
  status: 'PENDING' | 'DONE';
  createdAt: string;
}

export default function ShuntingProgramsPage() {
  const [programs, setPrograms] = useState<ShuntingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    try {
      setLoading(true);
      const response = await api.get('/shunting-programs');
      setPrograms(response.data);
    } catch (error) {
      toast.error('Failed to load shunting programs');
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'PENDING' ? 'DONE' : 'PENDING';
    try {
      await api.patch(`/shunting-programs/${id}`, { status: newStatus });
      toast.success(`Marked as ${newStatus}`);
      fetchPrograms();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="h-6 w-6" />
            Shunting Programs
          </h1>
          <p className="text-gray-500 mt-1">Manage shop-wise shunting tasks and movements</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-gray-900 text-white px-4 py-2 rounded-md hover:bg-black transition-colors flex items-center gap-2 font-medium"
        >
          <Plus className="h-4 w-4" />
          Add New Program
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                  S.No
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">
                  Shop
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Remarks
                </th>
                <th className="py-4 px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40 text-center">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-5 w-5 border-2 border-gray-500 border-t-transparent rounded-full" />
                      Loading programs...
                    </div>
                  </td>
                </tr>
              ) : programs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-gray-500">
                    <ListTodo className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No programs found</p>
                    <p>Click "Add New Program" to create one.</p>
                  </td>
                </tr>
              ) : (
                programs.map((program, index) => (
                  <tr key={program._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-gray-900">{program.shop}</span>
                    </td>
                    <td className="py-4 px-6 text-gray-700 whitespace-pre-wrap">
                      {program.remark}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => toggleStatus(program._id, program.status)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${
                          program.status === 'DONE'
                            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                        }`}
                      >
                        {program.status === 'DONE' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Done
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5" />
                            Pending
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ShuntingProgramFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchPrograms}
      />
    </div>
  );
}
