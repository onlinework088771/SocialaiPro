import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Facebook } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code && state) {
      handleCallback(code, state);
    }
  }, []);
  
  const handleCallback = async (code, state) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/auth/facebook/callback`, {
        params: { code, state }
      });
      
      if (response.data.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect Facebook account');
    } finally {
      setLoading(false);
    }
  };
  
  const handleFacebookLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API}/auth/facebook/login`);
      window.location.href = response.data.login_url;
    } catch (err) {
      setError('Failed to initiate Facebook login');
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-sm uppercase tracking-wider font-semibold text-text-muted">Connecting...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md p-6">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-black tracking-tight text-primary mb-2" data-testid="login-title">Social Ai Pro</h1>
          <p className="text-xs uppercase tracking-widest text-text-muted">Multi-Page Facebook Posting Tool</p>
        </div>
        
        <div className="border border-border-strong p-8 bg-white">
          <h2 className="text-2xl font-bold text-text-main mb-4">Get Started</h2>
          <p className="text-sm text-text-muted mb-8">Connect your Facebook account to start posting to multiple pages simultaneously.</p>
          
          {error && (
            <div className="mb-6 p-4 border border-error bg-red-50" data-testid="login-error">
              <p className="text-xs text-error font-mono">{error}</p>
            </div>
          )}
          
          <button
            onClick={handleFacebookLogin}
            disabled={loading}
            data-testid="facebook-login-button"
            className="w-full bg-primary text-white font-bold py-4 px-6 hover:bg-primary-hover transition-colors flex items-center justify-center gap-3 focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            <Facebook size={20} />
            <span>Connect with Facebook</span>
          </button>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-xs text-text-muted">By connecting, you agree to grant Social Ai Pro access to manage your Facebook pages.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;