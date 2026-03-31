import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Calendar,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowRight,
  Sparkles,
  Globe2,
  Clock3,
  Send,
  BarChart3,
  LayoutGrid,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatCard = ({ icon: Icon, label, value, helper, color }) => (
  <div className="stat-card group relative overflow-hidden">
    <div className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r ${color}`} />
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{label}</p>
        <p className="text-3xl font-black text-white">{value}</p>
        <p className="mt-2 text-sm text-zinc-400">{helper}</p>
      </div>
      <div className={`rounded-2xl bg-gradient-to-br p-3 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

const ActionLink = ({ to, icon: Icon, title, description, gradient }) => (
  <Link
    to={to}
    className="group rounded-[24px] border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.05]"
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className={`mb-4 inline-flex rounded-2xl bg-gradient-to-br p-3 ${gradient}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">{description}</p>
      </div>
      <ArrowRight className="mt-1 h-5 w-5 text-zinc-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
    </div>
  </Link>
);

const formatSlot = (slot) => {
  if (!slot) return '--';
  const [hour, minute] = slot.split(':');
  const date = new Date();
  date.setHours(Number(hour), Number(minute), 0, 0);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  });
};

const formatDate = (value) => {
  if (!value) return 'Recently connected';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently connected';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const NewDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to load dashboard stats');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4"></div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Loading Social Ai Pro…</p>
        </div>
      </div>
    );
  }

  const preferredSlots = stats?.preferred_slots || [];
  const pagesByAccount = stats?.pages_by_account || [];
  const recentActivity = stats?.recent_activity || [];

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />

      <div className="flex-1 md:ml-64 pt-20 md:pt-0">
        <div className="p-4 md:p-8">
          <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0e1016]/95 p-6 shadow-2xl shadow-black/30 md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_24%)]" />
            <div className="relative z-10 grid gap-6 lg:grid-cols-[1.4fr_0.9fr] lg:items-end">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
                  <Sparkles className="h-4 w-4" /> Social Ai Pro Control Center
                </div>
                <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl">
                  Welcome back, {user?.full_name || 'Creator'}.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
                  Manage multiple Facebook accounts, publish faster, and keep every campaign aligned with US audience windows from one polished mobile-friendly workspace.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/post" className="btn-primary inline-flex items-center gap-2">
                    <Send className="h-4 w-4" /> Open AI Composer
                  </Link>
                  <Link
                    to="/accounts"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]"
                  >
                    <Users className="h-4 w-4" /> Manage Accounts
                  </Link>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2 text-blue-300">
                    <Globe2 className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.22em]">Timezone</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats?.timezone_label || 'US Eastern Time'}</p>
                  <p className="mt-2 text-sm text-zinc-400">Default posting windows stay optimized for USA reach.</p>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                  <div className="mb-3 flex items-center gap-2 text-violet-300">
                    <Clock3 className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.22em]">Preferred Slots</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {preferredSlots.length > 0 ? preferredSlots.map((slot) => (
                      <span key={slot} className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-zinc-200">
                        {formatSlot(slot)}
                      </span>
                    )) : <span className="text-sm text-zinc-400">No slots configured</span>}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Users} label="Connected Accounts" value={stats?.total_accounts || 0} helper="Separate Facebook identities, managed safely." color="from-blue-500 to-cyan-400" />
            <StatCard icon={LayoutGrid} label="Total Pages" value={stats?.total_pages || 0} helper="Pages available for bulk publishing." color="from-violet-500 to-fuchsia-500" />
            <StatCard icon={Calendar} label="Scheduled Posts" value={stats?.scheduled_posts || 0} helper="Queued for the next smart delivery window." color="from-emerald-500 to-teal-400" />
            <StatCard icon={Activity} label="Automation" value={stats?.automation_status === 'active' ? 'ON' : 'IDLE'} helper="Background scheduling service status." color="from-orange-500 to-amber-400" />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ActionLink
                  to="/post"
                  icon={Sparkles}
                  title="Smart Composer"
                  description="Create text, photo, video, and reel posts with AI titles, hashtags, and bulk page selection."
                  gradient="from-blue-500 to-violet-500"
                />
                <ActionLink
                  to="/scheduled"
                  icon={Calendar}
                  title="Scheduling Queue"
                  description="Monitor auto-scheduled posts, manual delivery slots, and fallback timing for missed windows."
                  gradient="from-emerald-500 to-cyan-500"
                />
                <ActionLink
                  to="/analytics"
                  icon={BarChart3}
                  title="Performance Insights"
                  description="Track publishing success, failures, and posting rhythm to improve your Facebook workflow."
                  gradient="from-fuchsia-500 to-pink-500"
                />
              </div>

              <div className="stat-card">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Account Overview</p>
                    <h2 className="mt-2 text-xl font-bold text-white">Connected Facebook Profiles</h2>
                  </div>
                  <Link to="/accounts" className="text-sm font-semibold text-blue-300 hover:text-blue-200">
                    View all
                  </Link>
                </div>

                {pagesByAccount.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-zinc-400">
                    No connected Facebook account yet. Add one to start syncing pages.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pagesByAccount.map((account) => (
                      <div key={account.fb_user_id} className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-black/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{account.fb_user_name}</p>
                          <p className="mt-1 text-xs text-zinc-500">Facebook profile connected · {formatDate(account.created_at)}</p>
                        </div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-zinc-200">
                          <Users className="h-3.5 w-3.5 text-blue-300" /> {account.pages_count || 0} page{account.pages_count === 1 ? '' : 's'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="stat-card">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 p-3">
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Publishing Health</p>
                    <h2 className="text-xl font-bold text-white">Execution Snapshot</h2>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">Successful</p>
                    <p className="mt-2 text-3xl font-black text-white">{stats?.published_posts || 0}</p>
                  </div>
                  <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200">Failed</p>
                    <p className="mt-2 text-3xl font-black text-white">{stats?.failed_posts || 0}</p>
                  </div>
                </div>
              </div>

              <div className="stat-card">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-violet-500 p-3">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Recent Activity</p>
                    <h2 className="text-xl font-bold text-white">Latest publishing events</h2>
                  </div>
                </div>

                {recentActivity.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-zinc-400">
                    No publishing history yet. Your first post will appear here.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.slice(0, 5).map((activity, index) => {
                      const isSuccess = activity.status === 'success';
                      return (
                        <div key={`${activity.created_at}-${index}`} className="rounded-3xl border border-white/10 bg-black/20 p-4">
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 rounded-2xl p-2 ${isSuccess ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>
                              {isSuccess ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-white capitalize">{activity.status}</p>
                                <span className="text-xs text-zinc-500">• {formatDate(activity.created_at)}</span>
                              </div>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-300">
                                {activity.message || 'No message available'}
                              </p>
                              {activity.page_names?.length > 0 && (
                                <p className="mt-2 text-xs text-zinc-500">
                                  {activity.page_names.join(', ')}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default NewDashboard;
