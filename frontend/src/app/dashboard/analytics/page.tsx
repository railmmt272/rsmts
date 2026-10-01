'use client';

import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area
} from 'recharts';
import { Activity, MapPin, TrendingUp } from 'lucide-react';

interface AnalyticsData {
  totalAssets: number;
  statusDistribution: { status: string; count: number }[];
  bottlenecks: { location: string; count: number }[];
  throughput: { date: string; count: number }[];
}

const COLORS = ['#0f172a', '#334155', '#475569', '#64748b', '#94a3b8']; // slate colors for light theme

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pipeline, setPipeline] = useState('ALL');
  
  // Default to last 7 days
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchData();
  }, [pipeline, startDate, endDate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/dashboard', {
        params: { pipeline, startDate, endDate }
      });
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 flex flex-col overflow-y-auto pr-2 pb-8">
      <div className="mb-6 flex justify-between items-end">
        <h1 className="text-xl text-gray-600">Analytics Dashboard</h1>
        
        {/* Filters */}
        <div className="flex items-center gap-4 bg-white p-3 rounded-lg border-2 border-gray-600 shadow-sm">
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1">Pipeline</label>
            <select 
              value={pipeline} 
              onChange={(e) => setPipeline(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-gray-900 bg-gray-50"
            >
              <option value="ALL">All Pipelines</option>
              <option value="WAGON_POH">Wagon POH</option>
              <option value="OTHERS">Others</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1">Start Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-gray-900 bg-gray-50"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 uppercase mb-1">End Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-gray-900 bg-gray-50"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6 animate-pulse">
          {/* Skeleton Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg border-2 border-gray-200 p-6 flex items-center gap-4 h-28">
                <div className="h-12 w-12 rounded-full bg-slate-200" />
                <div className="space-y-3">
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-6 w-16 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>

          {/* Skeleton Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 h-[400px]">
              <div className="h-6 w-48 bg-slate-200 rounded mb-6" />
              <div className="h-64 w-full bg-slate-100 rounded-full mx-auto max-w-[250px]" />
            </div>
            <div className="bg-white rounded-lg border-2 border-gray-200 p-6 h-[400px]">
              <div className="h-6 w-48 bg-slate-200 rounded mb-6" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <div className="h-4 w-12 bg-slate-200 rounded" />
                    <div className="h-6 flex-1 bg-slate-100 rounded" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Skeleton Charts Row 2 */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 h-[400px]">
            <div className="h-6 w-64 bg-slate-200 rounded mb-6" />
            <div className="h-[250px] w-full bg-slate-100 rounded" />
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg border-2 border-gray-600 p-6 flex items-center gap-4 shadow-sm">
              <div className="p-4 rounded-full bg-slate-100 text-slate-800">
                <Activity className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Assets</p>
                <p className="text-2xl font-bold text-gray-900">{data.totalAssets}</p>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border-2 border-gray-600 p-6 flex items-center gap-4 shadow-sm">
              <div className="p-4 rounded-full bg-slate-100 text-slate-800">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Movements in Period</p>
                <p className="text-2xl font-bold text-gray-900">
                  {data.throughput.reduce((sum, item) => sum + item.count, 0)}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg border-2 border-gray-600 p-6 flex items-center gap-4 shadow-sm">
              <div className="p-4 rounded-full bg-slate-100 text-slate-800">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Top Bottleneck</p>
                <p className="text-xl font-bold text-gray-900 truncate">
                  {data.bottlenecks.length > 0 ? data.bottlenecks[0].location : 'None'}
                </p>
              </div>
            </div>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="bg-white rounded-lg border-2 border-gray-600 p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Asset Status Distribution</h2>
              <div className="h-[300px] w-full">
                {data.statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="status"
                        label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {data.statusDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                )}
              </div>
            </div>

            {/* Bottlenecks */}
            <div className="bg-white rounded-lg border-2 border-gray-600 p-6 shadow-sm">
              <h2 className="text-lg font-medium text-gray-900 mb-6">Location Bottlenecks (Top 10)</h2>
              <div className="h-[300px] w-full">
                {data.bottlenecks.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.bottlenecks} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" stroke="#64748b" />
                      <YAxis dataKey="location" type="category" stroke="#64748b" width={80} />
                      <Tooltip 
                        cursor={{fill: '#f1f5f9'}}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="count" fill="#334155" radius={[0, 4, 4, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-400">No data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Charts Row 2 */}
          <div className="bg-white rounded-lg border-2 border-gray-600 p-6 shadow-sm">
            <h2 className="text-lg font-medium text-gray-900 mb-6">Movement Throughput Over Time</h2>
            <div className="h-[300px] w-full">
              {data.throughput.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.throughput} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#475569" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#475569" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#64748b" 
                      tickFormatter={(val) => {
                        const d = new Date(val);
                        return `${d.getMonth()+1}/${d.getDate()}`;
                      }}
                    />
                    <YAxis stroke="#64748b" />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelFormatter={(val) => new Date(val as string).toLocaleDateString()}
                    />
                    <Area type="monotone" dataKey="count" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400">No data available for the selected period</div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500">Failed to load data</div>
      )}
    </div>
  );
}