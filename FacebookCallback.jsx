import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const FacebookCallback = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState('Validating Facebook callback');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      handleCallback(code, state);
    } else {
      toast.error('Invalid callback parameters');
      navigate('/post');
    }
  }, []);

  const handleCallback = async (code, state) => {
    try {
      setStage('Exchanging Facebook authorization');
      const response = await axios.get(`${API}/auth/facebook/callback`, {
        params: { code, state },
      });

      if (response.data.success) {
        setStage(`Connected ${response.data.fb_user_name}`);
        toast.success(`Connected ${response.data.fb_user_name} successfully!`);
        setTimeout(() => navigate('/post'), 1200);
      }
    } catch (err) {
      console.error('Facebook callback error:', err);
      toast.error(err.response?.data?.detail || 'Failed to connect Facebook account');
      navigate('/post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.16),transparent_24%)]" />

      <div className="relative z-10 w-full max-w-xl rounded-[32px] border border-white/10 bg-[#0f1118]/95 p-8 text-center shadow-2xl shadow-black/40 backdrop-blur-xl md:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] bg-gradient-to-br from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_32px_rgba(79,70,229,0.35)]">
          {loading ? <Loader2 className="h-7 w-7 animate-spin text-white" /> : <CheckCircle2 className="h-7 w-7 text-white" />}
        </div>

        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-blue-200">
          <ShieldCheck className="h-4 w-4" /> Secure Facebook OAuth
        </div>

        <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">Social Ai Pro is connecting your account</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400 md:text-base">
          Please wait while we verify the Facebook callback, encrypt the token, and sync your account into your Social Ai Pro workspace.
        </p>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-black/20 p-5 text-left">
          <div className="flex items-start gap-3">
            <div className="mt-1 rounded-2xl bg-white/5 p-2 text-violet-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Current step</p>
              <p className="mt-2 text-base font-semibold text-white">{stage}</p>
              <p className="mt-2 text-sm leading-7 text-zinc-400">
                After completion, you’ll be redirected to the AI Composer so you can fetch pages and start publishing immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FacebookCallback;
