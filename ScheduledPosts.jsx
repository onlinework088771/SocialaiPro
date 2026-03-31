import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { CalendarClock, Trash2, CheckCircle2, XCircle, AlertCircle, Clock3, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ScheduledPosts = () => {
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchScheduledPosts();
  }, [filter]);

  const fetchScheduledPosts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/scheduled`, {
        params: { status: filter },
      });
      setScheduledPosts(response.data.scheduled_posts || []);
    } catch (err) {
      console.error('Failed to fetch scheduled posts', err);
      toast.error('Failed to load scheduled posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scheduleId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled post?')) {
      return;
    }

    try {
      await axios.delete(`${API}/scheduled/${scheduleId}`);
      toast.success('Scheduled post deleted');
      fetchScheduledPosts();
    } catch (err) {
      console.error('Failed to delete', err);
      toast.error('Failed to delete scheduled post');
    }
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
          icon: <AlertCircle size={16} className="text-amber-400" />,
          badge: 'bg-amber-500/15 text-amber-300 border-amber-500/20',
        };
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

  const filters = [
    { id: 'pending', label: 'Pending' },
    { id: 'success', label: 'Published' },
    { id: 'failed', label: 'Failed' },
  ];

  return (
    <div className="page-container">
      <Sidebar />
      <div className="main-content">
        <div className="px-4 pb-8 pt-4 md:px-8 md:pt-8">
          <div className="mb-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl md:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-300">
                  <Sparkles className="h-3.5 w-3.5" />
                  Queue Control Center
                </p>
                <h1 className="text-2xl font-black text-white md:text-3xl">Scheduled Posts</h1>
                <p className="mt-2 text-sm text-zinc-400">Manage pending, published and failed jobs across your connected Facebook pages.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#101014] px-4 py-3 text-sm text-zinc-300">
                Default schedule timezone: <span className="font-semibold text-white">US Eastern Time</span>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {filters.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                data-testid={`filter-${item.id}`}
                className={`rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                  filter === item.id
                    ? 'border-blue-500/30 bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]'
                    : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="stat-card text-center py-16">
              <div className="mx-auto mb-4 inline-block h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-400">Loading scheduled posts...</p>
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div className="stat-card text-center py-16">
              <CalendarClock size={44} className="mx-auto mb-4 text-zinc-500" />
              <h3 className="text-lg font-bold text-white">No {filter} jobs found</h3>
              <p className="mt-2 text-sm text-zinc-400">Create a scheduled post from the AI Composer to fill this queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {scheduledPosts.map((post) => {
                const meta = getStatusMeta(post.status);
                return (
                  <div
                    key={post.schedule_id}
                    className="stat-card relative overflow-hidden"
                    data-testid={`scheduled-post-${post.schedule_id}`}
                  >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-2">
                        {meta.icon}
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${meta.badge}`}>
                          {post.status}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0d0d12] px-3 py-2 text-xs text-zinc-400">
                          <Clock3 className="h-4 w-4" />
                          <span>{formatDate(post.scheduled_time)}</span>
                        </div>
                        {post.status === 'pending' && (
                          <button
                            onClick={() => handleDelete(post.schedule_id)}
                            data-testid={`delete-${post.schedule_id}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-300 transition hover:bg-rose-500/15"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Content</p>
                        <p className="line-clamp-4 text-sm leading-6 text-zinc-200">{post.message}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Type</p>
                          <p className="text-sm font-semibold capitalize text-white">{post.content_type}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Pages</p>
                          <p className="text-sm text-zinc-200">{post.selected_page_ids?.length || 0} selected</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-[#0d0d12] p-4">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Mode</p>
                          <p className="text-sm font-semibold capitalize text-white">{post.schedule_type}</p>
                        </div>
                      </div>

                      {post.error_message && (
                        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-300">System note</p>
                          <p className="text-sm text-rose-100">{post.error_message}</p>
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

export default ScheduledPosts;
