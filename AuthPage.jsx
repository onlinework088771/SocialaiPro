import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Sparkles, ArrowRight } from 'lucide-react';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('Welcome back!');
      } else {
        await signup(email, fullName, password);
        toast.success('Account created successfully!');
      }
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 animate-fade-in">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 mb-4">
            <Sparkles className="w-10 h-10 text-blue-500" />
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
              Social Ai Pro
            </h1>
          </div>
          <p className="text-gray-400 text-sm">
            AI-powered multi-page Facebook publishing for modern creators and agencies
          </p>
        </div>
        
        <div className="glass-effect rounded-2xl p-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                isLogin
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
              data-testid="login-tab"
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all ${
                !isLogin
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                  : 'bg-transparent text-gray-400 hover:text-white'
              }`}
              data-testid="signup-tab"
            >
              Sign Up
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  placeholder="John Doe"
                  className="input-dark"
                  data-testid="fullname-input"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="input-dark"
                data-testid="email-input"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="input-dark"
                data-testid="password-input"
                minLength={6}
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="submit-button"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'Login' : 'Create Account'}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-400">
            {isLogin ? (
              <p>
                Do not have an account?{' '}
                <button
                  onClick={() => setIsLogin(false)}
                  className="text-blue-500 hover:text-blue-400 font-semibold"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => setIsLogin(true)}
                  className="text-blue-500 hover:text-blue-400 font-semibold"
                >
                  Login
                </button>
              </p>
            )}
          </div>
        </div>
        
        <div className="mt-8 text-center animate-slide-up" style={{animationDelay: '0.2s'}}>
          <p className="text-xs text-gray-500">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
