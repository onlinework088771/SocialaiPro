import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Users,
  LayoutGrid,
  Clock3,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const SummaryCard = ({ icon: Icon, title, value, helper, gradient }) => (
  <div className="stat-card">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">{title}</p>
        <p className="mt-2 text-3xl font-black text-white">{value}</p>
        <p className="mt-2 text-sm text-zinc-400">{helper}</p>
      </div>
      <div className={`rounded-2xl bg-gradient-to-br p-3 ${gradient}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

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

const AccountsPage = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const totalPages = useMemo(
    () => accounts.reduce((sum, account) => sum + (account.pages_count || 0), 0),
    [accounts]
  );

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data.accounts || []);
    } catch (err) {
      console.error('Failed to fetch accounts', err);
      toast.error('Failed to load Facebook accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAccount = async () => {
    try {
      const response = await axios.get(`${API}/auth/facebook/login`);
      window.location.href = response.data.login_url;
    } catch (err) {
      console.error('Failed to initiate Facebook login:', err);
      toast.error('Failed to connect Facebook account');
    }
  };

  const handleDisconnect = async (fbUserId, fbUserName) => {
    if (!window.confirm(`Disconnect ${fbUserName}? This will also remove synced pages for this profile.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/accounts/${fbUserId}`);
      toast.success(`${fbUserName} disconnected`);
      fetchAccounts();
    } catch (err) {
      console.error('Failed to disconnect account:', err);
      toast.error('Failed to disconnect account');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <div className="flex-1 md:ml-64 pt-20 md:pt-0 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block h-12 w-12 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4"></div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500">Loading account hub…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />

      <div className="flex-1 md:ml-64 pt-20 md:pt-0">
        <div className="p-4 md:p-8">
          <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0e1016]/95 p-6 shadow-2xl shadow-black/30 md:p-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.14),transparent_22%)]" />
            <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
                  <ShieldCheck className="h-4 w-4" /> Multi-account Facebook access
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white md:text-5xl">Connected account workspace</h1>
                <p className="mt-4 text-sm leading-7 text-zinc-400 md:text-base">
                  Link multiple Facebook profiles, sync pages separately, and keep publishing cleanly isolated for each Social Ai Pro user workspace.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={handleConnectAccount} className="btn-primary inline-flex items-center gap-2" data-testid="connect-new-account">
                    <Plus className="h-4 w-4" /> Connect Facebook Account
                  </button>
                  <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-300">
                    <Clock3 className="h-4 w-4 text-blue-300" /> Default scheduling: US Eastern Time
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[380px]">
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Workspace Owner</p>
                  <p className="mt-3 truncate text-lg font-bold text-white">{user?.full_name || 'Social Ai Pro User'}</p>
                  <p className="mt-1 truncate text-sm text-zinc-400">{user?.email}</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Connection Mode</p>
                  <p className="mt-3 text-lg font-bold text-white">Secure OAuth</p>
                  <p className="mt-1 text-sm text-zinc-400">Each Facebook account stays stored separately.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard icon={Users} title="Connected Accounts" value={accounts.length} helper="Multiple Facebook identities supported." gradient="from-blue-500 to-cyan-400" />
            <SummaryCard icon={LayoutGrid} title="Synced Pages" value={totalPages} helper="Pages fetched per account and stored separately." gradient="from-violet-500 to-fuchsia-500" />
            <SummaryCard icon={Sparkles} title="Publishing Ready" value={accounts.length > 0 ? 'YES' : 'NO'} helper="Composer account switcher is ready for bulk posting." gradient="from-emerald-500 to-teal-400" />
            <SummaryCard icon={ShieldCheck} title="Data Isolation" value="ON" helper="Uploads, pages, and tokens stay user-scoped." gradient="from-orange-500 to-amber-400" />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="stat-card">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Account Directory</p>
                  <h2 className="mt-2 text-2xl font-bold text-white">Your Facebook profiles</h2>
                </div>
                <button onClick={handleConnectAccount} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.05]">
                  <Plus className="h-4 w-4" /> Add another
                </button>
              </div>

              {accounts.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 px-6 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 to-violet-500 shadow-[0_0_30px_rgba(79,70,229,0.25)]">
                    <Users className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white">No Facebook accounts connected</h3>
                  <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-zinc-400">
                    Connect your first Facebook profile to fetch pages automatically, switch accounts in the composer, and post in bulk.
                  </p>
                  <button onClick={handleConnectAccount} className="btn-primary mt-6 inline-flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Connect Facebook Account
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {accounts.map((account) => (
                    <div
                      key={account.fb_user_id}
                      className="group rounded-[28px] border border-white/10 bg-white/[0.03] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20"
                      data-testid={`account-card-${account.fb_user_id}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 text-lg font-black text-white shadow-[0_0_24px_rgba(79,70,229,0.25)]">
                            {account.fb_user_name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-bold text-white">{account.fb_user_name}</h3>
                            <div className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-300">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Connected and ready
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Pages</p>
                          <p className="mt-2 text-2xl font-black text-white">{account.pages_count || 0}</p>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Timezone</p>
                          <p className="mt-2 text-sm font-semibold text-white">{account.timezone || 'US Eastern Time'}</p>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Connected</p>
                        <p className="mt-2 text-sm font-medium text-zinc-300">{formatDate(account.created_at)}</p>
                        <p className="mt-1 truncate text-xs text-zinc-500">Facebook ID: {account.fb_user_id}</p>
                      </div>

                      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                        <a
                          href="/post"
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.06]"
                        >
                          Open composer <ArrowRight className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDisconnect(account.fb_user_id, account.fb_user_name)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-200"
                          data-testid={`disconnect-${account.fb_user_id}`}
                        >
                          <Trash2 className="h-4 w-4" /> Disconnect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="stat-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">How it works</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Multi-account flow</h2>
                <div className="mt-5 space-y-4">
                  {[
                    'Connect a Facebook profile using secure OAuth.',
                    'Social Ai Pro stores each Facebook account separately.',
                    'Selecting an account refreshes and displays its pages automatically.',
                    'The composer lets you switch profiles and post to single or multiple pages.',
                  ].map((item, index) => (
                    <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-7 text-zinc-300">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="stat-card">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">Best practice</p>
                <h2 className="mt-2 text-2xl font-bold text-white">Publishing setup tips</h2>
                <ul className="mt-5 space-y-3 text-sm leading-7 text-zinc-300">
                  <li>• Keep your Facebook app in Live mode when you want non-test users to connect.</li>
                  <li>• Verify the redirect URL in Facebook App Settings matches your deployed domain.</li>
                  <li>• Sync pages after reconnecting if Facebook permissions change.</li>
                  <li>• Use the composer’s account switcher before selecting destination pages.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AccountsPage;
