import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Calendar,
  Clock,
  History,
  LogOut,
  Sparkles,
  Image,
  BarChart3,
  Users,
  LayoutDashboard,
  X,
  EllipsisVertical,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { path: '/post', icon: Sparkles, label: 'AI Composer' },
    { path: '/accounts', icon: Users, label: 'Accounts' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/media', icon: Image, label: 'Media Library' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/scheduled', icon: Clock, label: 'Scheduled' },
    { path: '/history', icon: History, label: 'History' },
  ];

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  const SidebarContent = ({ mobile = false }) => (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_30px_rgba(99,102,241,0.35)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight bg-gradient-to-r from-white via-blue-100 to-violet-200 bg-clip-text text-transparent">
                Social Ai Pro
              </h1>
              <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">
                Facebook Publishing Suite
              </p>
            </div>
          </div>

          {mobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 via-violet-500/8 to-transparent p-4">
          <div className="mb-2 flex items-center gap-2 text-blue-300">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[0.22em]">US Eastern Time</span>
          </div>
          <p className="text-sm font-medium text-white">Default scheduling is optimized for USA audience windows.</p>
          <p className="mt-1 text-xs text-zinc-400">Multi-account posting, AI captions, smart hashtagging and page-level targeting.</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => mobile && setMobileOpen(false)}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive(item.path)
                  ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-[0_0_24px_rgba(79,70,229,0.35)]'
                  : 'text-zinc-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all ${
                  isActive(item.path)
                    ? 'border-white/10 bg-white/10'
                    : 'border-white/5 bg-white/[0.03] group-hover:border-white/10 group-hover:bg-white/[0.06]'
                }`}
              >
                <Icon size={18} strokeWidth={2.2} />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
          <p className="mb-1 text-[10px] uppercase tracking-[0.24em] text-zinc-500">Workspace</p>
          <p className="truncate text-sm font-semibold text-white">{user?.full_name || 'Social AI User'}</p>
          <p className="truncate text-xs text-zinc-400">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          data-testid="logout-button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-200"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#09090c]/90 backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_24px_rgba(99,102,241,0.35)]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-white">Social Ai Pro</p>
              <p className="truncate text-[10px] uppercase tracking-[0.22em] text-zinc-500">Mobile workspace</p>
            </div>
          </div>

          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-200 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            aria-label="Open navigation menu"
          >
            <EllipsisVertical className="h-5 w-5" />
          </button>
        </div>
      </header>

      <aside className="fixed left-0 top-0 z-30 hidden h-full w-64 flex-col border-r border-white/10 bg-[#0b0b10]/95 backdrop-blur-xl md:flex">
        <SidebarContent />
      </aside>

      {mobileOpen && (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu overlay"
          />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-[88vw] max-w-[320px] flex-col border-l border-white/10 bg-[#0b0b10]/98 shadow-2xl shadow-black/60 backdrop-blur-xl md:hidden">
            <SidebarContent mobile />
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;
