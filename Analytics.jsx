import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { toast } from 'sonner';
import { TrendingUp, BarChart3, PieChart, Clock } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

const Analytics = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchAnalytics();
  }, []);
  
  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <div className="flex-1 md:ml-64 pt-20 md:pt-0 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }
  
  const contentTypeData = Object.entries(stats?.content_types || {}).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value
  }));
  
  const successData = [
    { name: 'Success', value: stats?.overview?.success_count || 0 },
    { name: 'Failed', value: stats?.overview?.failed_count || 0 }
  ];
  
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      
      <div className="flex-1 md:ml-64 pt-20 md:pt-0">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Analytics & Insights</h1>
            <p className="text-gray-400">Track your social media performance</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Total Posts</p>
                  <p className="text-3xl font-black text-white">{stats?.overview?.total_posts || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Success Rate</p>
                  <p className="text-3xl font-black text-white">{stats?.overview?.success_rate || 0}%</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Successful</p>
                  <p className="text-3xl font-black text-green-500">{stats?.overview?.success_count || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/20">
                  <PieChart className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </div>
            
            <div className="stat-card">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Failed</p>
                  <p className="text-3xl font-black text-red-500">{stats?.overview?.failed_count || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20">
                  <Clock className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="stat-card">
              <h3 className="text-lg font-bold text-white mb-4">Posts Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats?.daily_posts || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{fontSize: 12}} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#1a1a1a', border: '1px solid #27272a', borderRadius: '8px'}}
                    labelStyle={{color: '#9ca3af'}}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{fill: '#3b82f6'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="stat-card">
              <h3 className="text-lg font-bold text-white mb-4">Success vs Failed</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={successData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({name, value}) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {successData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{backgroundColor: '#1a1a1a', border: '1px solid #27272a', borderRadius: '8px'}}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="stat-card">
              <h3 className="text-lg font-bold text-white mb-4">Posts by Content Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={contentTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#1a1a1a', border: '1px solid #27272a', borderRadius: '8px'}}
                  />
                  <Bar dataKey="value" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="stat-card">
              <h3 className="text-lg font-bold text-white mb-4">Best Posting Times</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats?.hourly_distribution || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="hour" stroke="#6b7280" label={{value: 'Hour (24h)', position: 'insideBottom', offset: -5, fill: '#6b7280'}} />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#1a1a1a', border: '1px solid #27272a', borderRadius: '8px'}}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
