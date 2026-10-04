'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Plus, Edit2, Shield, Mail, KeySquare, Calendar, Trash2 } from 'lucide-react';
import UserFormModal, { User } from '@/components/Users/UserFormModal';
import { useSearchParams, useRouter } from 'next/navigation';
import { useToast } from '@/contexts/ToastContext';

import { Suspense } from "react";

function UsersPageContent() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<User | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const isManagementOrAdmin = currentUser?.role === 'WAGON_ADMIN' || currentUser?.role === 'TPT_RAIL_ADMIN';

  useEffect(() => {
    if (searchParams.get('add') === 'true' && isManagementOrAdmin) {
      setUserToEdit(null);
      setIsModalOpen(true);
      // clean up the URL without causing a full reload
      router.replace('/dashboard/users');
    }
  }, [searchParams, router, isManagementOrAdmin]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (u: User) => {
    setUserToEdit(u);
    setIsModalOpen(true);
  };

  const handleDelete = async (u: User) => {
    if (window.confirm(`Are you sure you want to delete user ${u.name}?`)) {
      try {
        await api.delete(`/users/${u._id}`);
        toast.success(`User ${u.name} deleted successfully`);
        fetchUsers();
      } catch (err: any) {
        toast.error(err.response?.data?.message || err.message || 'Failed to delete user');
      }
    }
  };

  const handleAddNew = () => {
    setUserToEdit(null);
    setIsModalOpen(true);
  };

  const handleModalSuccess = () => {
    fetchUsers();
  };

  // Pagination logic
  const totalPages = Math.ceil(users.length / itemsPerPage);
  const currentUsers = users.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl text-gray-600">
            User Management
          </h1>
        </div>
        {isManagementOrAdmin && (
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border-2 border-gray-600 rounded-md hover:bg-gray-50 focus:outline-none transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add User
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-md mb-6 border border-red-100">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-white border-2 border-gray-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-5xl animate-pulse">
                {/* Left Section Skeleton */}
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-48 bg-slate-200 rounded" />
                  <div className="h-4 w-64 bg-slate-100 rounded" />
                  <div className="h-4 w-56 bg-slate-100 rounded" />
                </div>
                
                {/* Middle Section Skeleton */}
                <div className="flex-1 space-y-3">
                  <div className="h-4 w-32 bg-slate-200 rounded" />
                  <div className="h-6 w-16 bg-slate-200 rounded-full" />
                </div>
                
                {/* Right Section Skeleton */}
                <div className="flex items-center justify-end md:pl-4 gap-2">
                  <div className="h-9 w-20 bg-slate-200 rounded-lg" />
                  <div className="h-9 w-24 bg-slate-200 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : currentUsers.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-500">
            No users found on this page.
          </div>
        ) : (
          currentUsers.map(u => (
            <div 
              key={u._id} 
              className="bg-white border-2 border-gray-600 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between hover:border-gray-900 hover:shadow-md transition-all group gap-6 max-w-5xl"
            >
              {/* Left Section: User Details */}
              <div className="flex-1 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-24">Full Name :</span>
                  <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{u.name}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-24">Email :</span>
                  <span className="font-medium text-gray-900 flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {u.email}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-24">Remarks :</span>
                  <span className="text-gray-700 line-clamp-1">{u.remark || '-'}</span>
                </div>
              </div>

              {/* Middle Section: Role & Status */}
              <div className="flex-1 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-20">Role :</span>
                  <span className="inline-flex items-center text-gray-900 font-medium">
                    <Shield className="h-3.5 w-3.5 mr-1 text-gray-400" />
                    {u.role.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 min-w-20">Status :</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${u.isActive ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Right Section: Actions */}
              <div className="flex items-center justify-end md:pl-4 gap-2">
                {isManagementOrAdmin && (
                  <>
                    <button
                      onClick={() => handleEdit(u)}
                      className="whitespace-nowrap flex items-center gap-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 px-4 py-2 rounded-lg border-2 border-gray-400 hover:border-gray-600 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    
                    {u.isActive && (
                      <button
                        onClick={() => handleDelete(u)}
                        className="whitespace-nowrap flex items-center gap-2 text-xs font-medium text-red-600 bg-white hover:bg-red-50 px-4 py-2 rounded-lg border-2 border-red-200 hover:border-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && (
        <div className="flex items-center justify-between pt-4 pb-2 mt-auto border-t border-gray-100">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * itemsPerPage, users.length)}</span> of{' '}
            <span className="font-medium">{users.length}</span> users
          </p>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <div className="flex space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    currentPage === page
                      ? 'bg-gray-800 text-white font-medium'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <UserFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleModalSuccess}
        userToEdit={userToEdit}
      />
    </div>
  );
}

export default function UsersPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading users...</div>}>
      <UsersPageContent />
    </Suspense>
  );
}
