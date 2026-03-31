import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import EmojiPicker from 'emoji-picker-react';
import {
  Send, FileText, Image, Video, Film, Sparkles, Upload,
  Smile, Hash, Type, Save, Eye, TrendingUp, Loader2,
  ChevronDown, X, Zap, Users, Clock
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageSelector from '../components/PageSelector';
import ScheduleSelector from '../components/ScheduleSelector';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CHAR_LIMIT = 63206;
const CHAR_WARN = 2000;

const Dashboard = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [pages, setPages] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagesLoading, setPagesLoading] = useState(false);

  const [contentType, setContentType] = useState('text');
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [posting, setPosting] = useState(false);
  const [scheduleData, setScheduleData] = useState({ type: 'now' });
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [aiMode, setAiMode] = useState('informative');

  const [showEmoji, setShowEmoji] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [estimatedReach, setEstimatedReach] = useState(null);

  const textareaRef = useRef(null);
  const emojiRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAccounts();
    loadDraft();
  }, []);

  useEffect(() => {
    if (message.length > 50 && selectedPages.length > 0) {
      const reach = Math.floor(1200 + selectedPages.length * 3400 + message.length * 2.5 + Math.random() * 5000);
      setEstimatedReach(reach);
    } else {
      setEstimatedReach(null);
    }
  }, [message, selectedPages]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts`);
      setAccounts(response.data.accounts);
      if (response.data.accounts.length > 0) {
        setSelectedAccount(response.data.accounts[0].fb_user_id);
        fetchPages(response.data.accounts[0].fb_user_id);
      }
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  };

  const fetchPages = async (fbUserId) => {
    setPagesLoading(true);
    try {
      const response = await axios.get(`${API}/pages/${fbUserId}`);
      setPages(response.data.pages);
    } catch (err) {
      console.error('Failed to fetch pages', err);
    } finally {
      setPagesLoading(false);
    }
  };

  const handleAccountChange = (fbUserId) => {
    setSelectedAccount(fbUserId);
    setSelectedPages([]);
    setPages([]);
    fetchPages(fbUserId);
  };

  const handleGenerateTitle = async () => {
    if (!message.trim()) { toast.error('Enter content description first'); return; }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/generate-title?mode=${aiMode}`, {
        content_description: message, content_type: contentType
      });
      setMessage(`${response.data.title}\n\n${message}`);
      toast.success('Title generated!');
    } catch (err) { toast.error('Failed to generate title'); }
    finally { setLoading(false); }
  };

  const handleGenerateHashtags = async () => {
    if (!message.trim()) { toast.error('Enter content first'); return; }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/generate-hashtags?mode=${aiMode}`, {
        content_description: message, title: ''
      });
      setMessage(`${message}\n\n${response.data.hashtags.join(' ')}`);
      toast.success('Hashtags generated!');
    } catch (err) { toast.error('Failed to generate hashtags'); }
    finally { setLoading(false); }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('content_type', contentType);
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedFile(response.data);
      if (contentType === 'photo') setImageUrl(response.data.public_url);
      else if (contentType === 'video' || contentType === 'reel') setVideoUrl(response.data.public_url);
      const autoContent = `${response.data.auto_generated.title}\n\n${response.data.auto_generated.hashtags.join(' ')}`;
      setMessage(autoContent);
      toast.success('File uploaded! Content auto-generated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed');
    } finally { setUploading(false); }
  };

  const handlePost = async () => {
    if (selectedPages.length === 0) { toast.error('Select at least one page'); return; }
    if (!message.trim() && contentType === 'text') { toast.error('Enter a message'); return; }
    if (contentType === 'photo' && !imageUrl && !uploadedFile) { toast.error('Upload an image'); return; }
    if ((contentType === 'video' || contentType === 'reel') && !videoUrl && !uploadedFile) { toast.error('Upload a video'); return; }

    setPosting(true);
    try {
      if (scheduleData.type === 'now') {
        const response = await axios.post(`${API}/post`, {
          content_type: contentType, message, 
          image_url: contentType === 'photo' ? imageUrl : null,
          video_url: (contentType === 'video' || contentType === 'reel') ? videoUrl : null,
          selected_page_ids: selectedPages, fb_user_id: selectedAccount,
          auto_generate_title: false, auto_generate_hashtags: false
        });
        const successCount = response.data.results.filter(r => r.success).length;
        if (response.data.success) {
          toast.success(`Published to ${successCount} page(s)!`);
          clearForm();
        } else {
          toast.warning(`Partial success: ${successCount} page(s)`);
        }
      } else {
        const response = await axios.post(`${API}/schedule`, {
          content_type: contentType, message,
          image_url: contentType === 'photo' ? imageUrl : null,
          video_url: (contentType === 'video' || contentType === 'reel') ? videoUrl : null,
          selected_page_ids: selectedPages, fb_user_id: selectedAccount,
          schedule_type: scheduleData.type, scheduled_time: scheduleData.scheduledTime,
          auto_generate_title: false, auto_generate_hashtags: false
        });
        toast.success(response.data.message);
        clearForm();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Post failed');
    } finally { setPosting(false); }
  };

  const clearForm = () => {
    setMessage(''); setImageUrl(''); setVideoUrl('');
    setUploadedFile(null); setDraftSaved(false);
    localStorage.removeItem('postgrid_draft');
  };

  const saveDraft = useCallback(() => {
    const draft = { message, contentType, aiMode, imageUrl, videoUrl, savedAt: new Date().toISOString() };
    localStorage.setItem('postgrid_draft', JSON.stringify(draft));
    setDraftSaved(true);
    toast.success('Draft saved');
    setTimeout(() => setDraftSaved(false), 2000);
  }, [message, contentType, aiMode, imageUrl, videoUrl]);

  const loadDraft = () => {
    const saved = localStorage.getItem('postgrid_draft');
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        if (draft.message) setMessage(draft.message);
        if (draft.contentType) setContentType(draft.contentType);
        if (draft.aiMode) setAiMode(draft.aiMode);
        if (draft.imageUrl) setImageUrl(draft.imageUrl);
        if (draft.videoUrl) setVideoUrl(draft.videoUrl);
      } catch {}
    }
  };

  const onEmojiClick = (emojiData) => {
    const cursor = textareaRef.current?.selectionStart || message.length;
    const newMsg = message.slice(0, cursor) + emojiData.emoji + message.slice(cursor);
    setMessage(newMsg);
    setShowEmoji(false);
  };

  const removeMedia = () => {
    setUploadedFile(null); setImageUrl(''); setVideoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConnectFacebook = async () => {
    try {
      const response = await axios.get(`${API}/auth/facebook/login`);
      window.location.href = response.data.login_url;
    } catch (err) { toast.error('Failed to connect Facebook'); }
  };

  const contentTypes = [
    { value: 'text', icon: FileText, label: 'Text', color: 'from-blue-500 to-cyan-400' },
    { value: 'photo', icon: Image, label: 'Photo', color: 'from-green-500 to-emerald-400' },
    { value: 'video', icon: Video, label: 'Video', color: 'from-orange-500 to-amber-400' },
    { value: 'reel', icon: Film, label: 'Reel', color: 'from-pink-500 to-rose-400' }
  ];

  const aiModes = [
    { value: 'informative', label: 'Informative' },
    { value: 'funny', label: 'Funny' },
    { value: 'emotional', label: 'Emotional' },
    { value: 'trending', label: 'Trending' }
  ];

  const charCount = message.length;
  const charPercent = Math.min((charCount / CHAR_LIMIT) * 100, 100);

  if (accounts.length === 0) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <div className="flex-1 md:ml-64 pt-20 md:pt-0 flex items-center justify-center p-5 md:p-8">
          <div className="max-w-md text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">Connect Your Facebook</h2>
            <p className="text-zinc-400 mb-8 text-sm leading-relaxed">Link your Facebook account to start managing pages and publishing content at scale.</p>
            <button
              onClick={handleConnectFacebook}
              data-testid="connect-facebook-button"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl px-8 py-3.5 font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all duration-300"
            >
Connect Facebook Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <div className="flex-1 md:ml-64 pt-20 md:pt-0">
        {/* Header */}
        <div className="px-4 pb-4 pt-4 md:px-8 md:pt-8">
          <div className="animate-fade-in">
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent" data-testid="composer-heading">
              Social AI Composer
            </h1>
            <p className="mt-1 text-sm text-zinc-500">Create, optimize, schedule, and publish across your Facebook pages</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="px-4 pb-8 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* LEFT COLUMN */}
            <div className="lg:col-span-8 space-y-5">

              {/* Account Selector */}
              <div className="composer-card p-5 animate-slide-up" data-testid="account-section">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">Facebook Account</h3>
                  </div>
                  <button
                    onClick={handleConnectFacebook}
                    data-testid="add-account-button"
                    className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    + Add Account
                  </button>
                </div>
                <div className="relative">
                  <select
                    value={selectedAccount || ''}
                    onChange={(e) => handleAccountChange(e.target.value)}
                    data-testid="account-selector"
                    className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white appearance-none cursor-pointer focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 outline-none transition-all pr-10"
                  >
                    {accounts.map((account) => (
                      <option key={account.fb_user_id} value={account.fb_user_id}>
                        {account.fb_user_name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                </div>
              </div>

              {/* Content Type */}
              <div className="composer-card p-5 animate-slide-up-delay-1" data-testid="content-type-section">
                <h3 className="text-sm font-semibold text-white mb-3">Content Type</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {contentTypes.map((type) => {
                    const Icon = type.icon;
                    const isActive = contentType === type.value;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setContentType(type.value)}
                        data-testid={`content-type-${type.value}`}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all duration-300 glow-button group ${
                          isActive
                            ? `border-purple-500/50 bg-gradient-to-b ${type.color.replace('from-', 'from-').replace('to-', 'to-')}/10 shadow-[0_0_15px_rgba(139,92,246,0.15)]`
                            : 'border-white/10 bg-[#1a1a1a] hover:border-white/20 hover:bg-white/5'
                        }`}
                      >
                        <div className={`p-2 rounded-lg transition-all ${isActive ? `bg-gradient-to-r ${type.color} shadow-lg` : 'bg-white/5 group-hover:bg-white/10'}`}>
                          <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-300'}`} />
                        </div>
                        <span className={`text-xs font-semibold ${isActive ? 'text-white' : 'text-zinc-400'}`}>{type.label}</span>
                        {isActive && (
                          <div className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content Editor */}
              <div className="composer-card overflow-hidden animate-slide-up-delay-2" data-testid="content-editor-section">
                <div className="p-5 pb-0">
                  <h3 className="text-sm font-semibold text-white mb-3">Content</h3>
                </div>

                {/* File Upload Area */}
                {(contentType === 'photo' || contentType === 'video' || contentType === 'reel') && (
                  <div className="px-5 pb-3">
                    {!uploadedFile ? (
                      <label
                        data-testid="file-upload-dropzone"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl bg-white/[0.02] hover:border-purple-500/30 hover:bg-purple-500/5 transition-all cursor-pointer group"
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept={contentType === 'photo' ? 'image/*' : 'video/*'}
                          onChange={handleFileUpload}
                          disabled={uploading}
                          data-testid="file-upload-input"
                          className="hidden"
                        />
                        {uploading ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
                            <span className="text-xs text-zinc-400">Uploading & generating content...</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload className="w-6 h-6 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                            <span className="text-xs text-zinc-500 group-hover:text-zinc-400 transition-colors">
                              Click to upload {contentType === 'photo' ? 'image' : 'video'}
                            </span>
                          </div>
                        )}
                      </label>
                    ) : (
                      <div className="relative inline-block">
                        {contentType === 'photo' && imageUrl && (
                          <img src={imageUrl} alt="Upload" className="h-28 rounded-xl object-cover border border-white/10" />
                        )}
                        {(contentType === 'video' || contentType === 'reel') && videoUrl && (
                          <div className="h-28 w-48 rounded-xl bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
                            <Video className="w-8 h-8 text-zinc-500" />
                          </div>
                        )}
                        <button
                          onClick={removeMedia}
                          data-testid="remove-media-button"
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-400 transition-colors"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                        <p className="text-xs text-emerald-400 mt-2">
                          {uploadedFile.file_info.original_filename}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Textarea */}
                <div className="mx-5 mb-0 rounded-xl border border-white/10 bg-[#0f0f13] focus-within:border-purple-500/40 focus-within:shadow-[0_0_20px_rgba(139,92,246,0.1)] transition-all duration-300">
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Write your post content here... or upload a file to auto-generate"
                    data-testid="post-message-textarea"
                    className="w-full min-h-[180px] bg-transparent p-5 text-white placeholder:text-zinc-600 resize-none outline-none text-base leading-relaxed"
                    maxLength={CHAR_LIMIT}
                  />

                  {/* Toolbar */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/5 bg-[#1a1a1a]/30">
                    <div className="flex items-center gap-1">
                      <div className="relative" ref={emojiRef}>
                        <button
                          onClick={() => setShowEmoji(!showEmoji)}
                          data-testid="emoji-picker-button"
                          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-300"
                          title="Add emoji"
                        >
                          <Smile className="w-4 h-4" />
                        </button>
                        {showEmoji && (
                          <div className="absolute bottom-12 left-0 z-50" data-testid="emoji-picker-popup">
                            <EmojiPicker
                              onEmojiClick={onEmojiClick}
                              theme="dark"
                              width={320}
                              height={380}
                              searchPlaceholder="Search emoji..."
                              previewConfig={{ showPreview: false }}
                            />
                          </div>
                        )}
                      </div>
                      {(contentType === 'photo' || contentType === 'video' || contentType === 'reel') && !uploadedFile && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 rounded-lg hover:bg-white/5 transition-colors text-zinc-500 hover:text-zinc-300"
                          title="Attach media"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono ${charCount > CHAR_WARN ? 'text-amber-400' : 'text-zinc-600'}`} data-testid="char-count">
                        {charCount.toLocaleString()}/{CHAR_LIMIT.toLocaleString()}
                      </span>
                      <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${charCount > CHAR_WARN ? 'bg-amber-400' : 'bg-purple-500/50'}`}
                          style={{ width: `${charPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI Section */}
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Content Mode</h4>
                  </div>
                  <div className="flex gap-2 mb-4">
                    {aiModes.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setAiMode(mode.value)}
                        data-testid={`ai-mode-${mode.value}`}
                        className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                          aiMode === mode.value
                            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-300 border border-white/5'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleGenerateTitle}
                      disabled={loading}
                      data-testid="generate-title-button"
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm font-medium text-zinc-300 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all disabled:opacity-40"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Type className="w-4 h-4" />}
                      Generate Title
                    </button>
                    <button
                      onClick={handleGenerateHashtags}
                      disabled={loading}
                      data-testid="generate-hashtags-button"
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm font-medium text-zinc-300 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all disabled:opacity-40"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Hash className="w-4 h-4" />}
                      Generate Hashtags
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 animate-slide-up-delay-3" data-testid="action-buttons">
                <button
                  onClick={saveDraft}
                  data-testid="save-draft-button"
                  className="flex items-center gap-2 px-5 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm font-medium text-zinc-300 hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  {draftSaved ? 'Saved!' : 'Save Draft'}
                </button>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  data-testid="preview-post-button"
                  className="flex items-center gap-2 px-5 py-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm font-medium text-zinc-300 hover:border-white/20 hover:bg-white/5 transition-all"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                <button
                  onClick={handlePost}
                  disabled={posting || selectedPages.length === 0}
                  data-testid="post-now-button"
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-semibold shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none glow-button"
                >
                  {posting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  {posting ? 'Publishing...' : scheduleData.type === 'now' ? 'Publish Now' : 'Schedule Post'}
                </button>
              </div>

              {/* Post Preview */}
              {showPreview && (
                <div className="composer-card p-5 animate-fade-in" data-testid="post-preview-section">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">Post Preview</h3>
                  </div>
                  <div className="bg-white rounded-xl p-4 max-w-md">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedPages.length > 0 ? pages.find(p => selectedPages.includes(p.page_id))?.page_name || 'Your Page' : 'Your Page'}
                        </p>
                        <p className="text-xs text-gray-500">Just now</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                      {message || 'Your post content will appear here...'}
                    </p>
                    {contentType === 'photo' && imageUrl && (
                      <img src={imageUrl} alt="Preview" className="w-full rounded-lg mt-3 object-cover max-h-48" />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="lg:col-span-4 space-y-5">

              {/* Page Selector */}
              <div className="composer-card p-5 animate-slide-up-delay-1" data-testid="page-selector-section">
                {pagesLoading ? (
                  <div className="text-center py-10">
                    <Loader2 className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-3" />
                    <p className="text-xs text-zinc-500">Loading pages...</p>
                  </div>
                ) : (
                  <PageSelector
                    pages={pages}
                    selectedPages={selectedPages}
                    onSelectionChange={setSelectedPages}
                  />
                )}
              </div>

              {/* Schedule */}
              <div className="composer-card p-5 animate-slide-up-delay-2" data-testid="schedule-section">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white">Schedule</h3>
                </div>
                <ScheduleSelector
                  onScheduleSelect={setScheduleData}
                  selectedAccount={selectedAccount}
                />
              </div>

              {/* Estimated Reach */}
              {estimatedReach && (
                <div className="composer-card p-5 animate-fade-in animate-pulse-glow" data-testid="estimated-reach-card">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estimated Reach</h3>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    {estimatedReach.toLocaleString()}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    potential impressions across {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''}
                  </p>
                </div>
              )}

              {/* Quick Stats */}
              <div className="composer-card p-5 animate-slide-up-delay-3" data-testid="quick-stats-card">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Quick Stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Connected Accounts</span>
                    <span className="text-sm font-semibold text-white">{accounts.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Total Pages</span>
                    <span className="text-sm font-semibold text-white">{pages.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Selected Pages</span>
                    <span className="text-sm font-semibold text-blue-400">{selectedPages.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Content Length</span>
                    <span className="text-sm font-semibold text-white">{charCount > 0 ? `${charCount} chars` : '--'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
