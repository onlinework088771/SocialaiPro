import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { CalendarDays, CheckCircle2, XCircle, Clock3, Layers3 } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/history`);
      setHistory(response.data.history || []);
    } catch (err) {
      console.error('Failed to fetch history', err);
      toast.error('Failed to load posting history');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York',
      timeZoneName: 'short',
    });
  };

  const getStatusMeta = (status) => {
    switch (status) {
      case 'success':
        return {
          icon: <CheckCircle2 size={16} className="text-emerald-400" />,
          badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
        };
      case 'failed':
        return {
          icon: <XCircle size={16} className="text-rose-400" />,
          badge: 'bg-rose-500/15 text-rose-300 border-rose-500/20',
        };
      default:
        return {
          icon: <Clock3 size={16} className="text-amber-400" />,
          badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
        };
    }
  };

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-content">
        <div className="px-4 pb-8 pt-4 md:px-8 md:pt-8">
          <div className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl md:p-7">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-300">
                  <Layers3 className="h-3.5 w-3.5" />
                  Activity Ledger
                </p>
                <h1 className="text-2xl font-black text-white md:text-3xl">Posting History</h1>
                <p className="mt-2 text-sm text-zinc-400">Every publish attempt across your connected Facebook pages in US time.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#101014] px-4 py-3 text-sm text-zinc-300">
                Timezone: <span className="font-semibold text-white">US Eastern Time</span>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="stat-card text-center py-16">
              <div className="mx-auto mb-4 inline-block h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Loading history...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="stat-card text-center py-16">
              <Clock3 size={44} className="mx-auto mb-4 text-zinc-500" />
              <h3 className="text-lg font-bold text-white">No posting activity yet</h3>
              <p className="mt-2 text-sm text-zinc-400">Once you publish or schedule content, your timeline will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {history.map((item, index) => {
                const meta = getStatusMeta(item.status);
                return (
                  <div
                    key={`${item.created_at}-${index}`}
                    className="stat-card relative overflow-hidden"
                    data-testid={`history-row-${index}`}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-300">
                        {meta.icon}
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${meta.badge}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="inline-flex items-center gap-2 text-xs text-zinc-500">
                        <CalendarDays className="h-4 w-4" />
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Content</p>
                        <p className="line-clamp-4 text-sm leading-6 text-zinc-200">{item.message}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Type</p>
                          <p className="text-sm font-semibold capitalize text-white">{item.content_type}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Pages</p>
                          <p className="text-sm text-zinc-200">{item.page_names?.join(', ') || 'Unknown pages'}</p>
                        </div>
                      </div>

                      {item.error_message && (
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300">Error</p>
                          <p className="text-sm text-rose-100">{item.error_message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default History;
