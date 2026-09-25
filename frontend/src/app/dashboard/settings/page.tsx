'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { Activity, Database, Server, Clock, AlertTriangle } from 'lucide-react';
import LocationsManagement from '@/components/Settings/LocationsManagement';
import CategoriesManagement from '@/components/Settings/CategoriesManagement';
interface SystemHealth {
  status: string;
  database: string;
  uptime: number;
  timestamp: string;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

interface AuditLog {
  _id: string;
  userEmail: string;
  action: string;
  method: string;
  url: string;
  statusCode: number;
  createdAt: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [healthError, setHealthError] = useState('');
  
  // Pagination for logs
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;

  const [activeTab, setActiveTab] = useState('system');

  useEffect(() => {
    if (activeTab === 'system') {
      fetchHealth();
      fetchLogs();
    }
  }, [activeTab]);

  const fetchHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await api.get('/system/health');
      setHealth(res.data);
      setHealthError('');
    } catch (err: any) {
      setHealthError('Failed to fetch system health. Backend may be offline.');
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const res = await api.get('/system/audit-logs');
      setLogs(res.data);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const clearLogs = async () => {
    if (!window.confirm('Are you sure you want to delete all activity logs? This action cannot be undone.')) {
      return;
    }
    try {
      setLoadingLogs(true);
      await api.delete('/system/audit-logs');
      setLogs([]);
      setCurrentPage(1);
    } catch (err: any) {
      console.error('Failed to clear logs:', err);
      alert('Failed to clear logs. Please try again later.');
    } finally {
      setLoadingLogs(false);
    }
  };

  const isAuthorized = user?.role === 'SYSTEM_ADMIN' || user?.role === 'MANAGEMENT';

  if (!isAuthorized) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg p-8 max-w-md w-full">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to view system settings.</p>
        </div>
      </div>
    );
  }

  // Pagination logic
  const totalPages = Math.ceil(logs.length / itemsPerPage);
  const currentLogs = logs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatBytes = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="w-full flex-1 flex flex-col">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl text-gray-600">Settings</h1>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 border-b-2 font-medium text-sm ${
            activeTab === 'system'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          System Health & Logs
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`px-4 py-2 border-b-2 font-medium text-sm ${
            activeTab === 'locations'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Locations Management
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-4 py-2 border-b-2 font-medium text-sm ${
            activeTab === 'categories'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          Categories Management
        </button>
      </div>

      {activeTab === 'system' && (
        <>
          {/* Health Overview */}
          <div className="bg-white rounded-lg border-2 border-gray-600 p-6 mb-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-gray-700" />
              System Health
            </h2>
            
            {loadingHealth ? (
              <p className="text-sm text-gray-500">Checking system health...</p>
            ) : healthError ? (
              <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
                {healthError}
              </div>
            ) : health && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${health.database === 'connected' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <Database className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Database</p>
                    <p className="text-sm font-medium text-gray-900 capitalize">{health.database}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-blue-100 text-blue-700">
                    <Server className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Memory Used</p>
                    <p className="text-sm font-medium text-gray-900">{formatBytes(health.memory.heapUsed)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-purple-100 text-purple-700">
                    <Clock className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Uptime</p>
                    <p className="text-sm font-medium text-gray-900">{formatUptime(health.uptime)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Audit Logs */}
          <div className="bg-white rounded-lg border-2 border-gray-600 flex-1 flex flex-col overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-medium text-gray-900">Recent Activity Logs</h2>
              <div className="flex gap-2">
                <button onClick={clearLogs} className="text-sm text-red-600 hover:text-red-800 px-3 py-1 border border-red-200 hover:bg-red-50 rounded-md transition-colors">
                  Clear All
                </button>
                <button onClick={fetchLogs} className="text-sm text-blue-600 hover:text-blue-800 px-3 py-1 border border-blue-200 hover:bg-blue-50 rounded-md transition-colors">
                  Refresh
                </button>
              </div>
            </div>
            
            {loadingLogs ? (
              <div className="p-8 text-center text-gray-500">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No recent activity found.</div>
            ) : (
              <div className="flex-1 flex flex-col">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-700 uppercase tracking-wider text-xs">
                      <tr>
                        <th className="px-6 py-3 font-semibold">Timestamp</th>
                        <th className="px-6 py-3 font-semibold">User</th>
                        <th className="px-6 py-3 font-semibold">Action</th>
                        <th className="px-6 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {currentLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-500">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-medium text-gray-900">
                            {log.userEmail}
                          </td>
                          <td className="px-6 py-4 text-gray-700">
                            {log.action} <span className="text-xs text-gray-400 ml-2">({log.method} {log.url})</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              log.statusCode >= 200 && log.statusCode < 300 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {log.statusCode}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-6 py-3 mt-auto border-t border-gray-200 bg-gray-50">
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, logs.length)}</span> of{' '}
                    <span className="font-medium">{logs.length}</span> logs
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
                          className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                            currentPage === page
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'locations' && (
        <LocationsManagement />
      )}

      {activeTab === 'categories' && (
        <CategoriesManagement />
      )}
    </div>
  );
}