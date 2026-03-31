import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, Video, Trash2, Search } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MediaLibrary = () => {
  const { user } = useAuth();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    fetchMedia();
  }, [filter]);
  
  const fetchMedia = async () => {
    try {
      const params = {};
      if (filter !== 'all') {
        params.file_type = filter;
      }
      
      const response = await axios.get(`${API}/media`, { params });
      setMedia(response.data.media);
    } catch (error) {
      console.error('Failed to fetch media:', error);
      toast.error('Failed to load media library');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploading(true);
    
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        
        await axios.post(`${API}/media/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      
      toast.success(`${files.length} file(s) uploaded successfully!`);
      fetchMedia();
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };
  
  const handleDelete = async (mediaId, filename) => {
    if (!window.confirm(`Delete ${filename}?`)) return;
    
    try {
      await axios.delete(`${API}/media/${mediaId}`);
      toast.success('Media deleted');
      fetchMedia();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete media');
    }
  };
  
  const filteredMedia = media.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.original_filename.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <div className="flex-1 md:ml-64 pt-20 md:pt-0 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Loading media...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      
      <div className="flex-1 md:ml-64 pt-20 md:pt-0">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Media Library</h1>
            <p className="text-gray-400">Manage your uploaded content</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-[#1a1a1a] border border-[#27272a] rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  data-testid="search-media"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-[#1a1a1a] border border-[#27272a] text-gray-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('image')}
                className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                  filter === 'image'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-[#1a1a1a] border border-[#27272a] text-gray-400 hover:text-white'
                }`}
              >
                <ImageIcon size={16} className="inline mr-1" />
                Images
              </button>
              <button
                onClick={() => setFilter('video')}
                className={`px-4 py-3 rounded-lg font-semibold text-sm transition-all ${
                  filter === 'video'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white'
                    : 'bg-[#1a1a1a] border border-[#27272a] text-gray-400 hover:text-white'
                }`}
              >
                <Video size={16} className="inline mr-1" />
                Videos
              </button>
            </div>
            
            <label className="btn-primary cursor-pointer flex items-center gap-2">
              <Upload size={18} />
              <span>{uploading ? 'Uploading...' : 'Upload Files'}</span>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                data-testid="upload-media-input"
              />
            </label>
          </div>
          
          {filteredMedia.length === 0 ? (
            <div className="stat-card text-center py-12">
              <Upload size={48} className="mx-auto text-gray-500 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No media yet</h3>
              <p className="text-sm text-gray-400">Upload your first files to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMedia.map((item) => (
                <div
                  key={item.media_id}
                  className="stat-card group relative overflow-hidden"
                  data-testid={`media-item-${item.media_id}`}
                >
                  <div className="aspect-square bg-[#0a0a0a] rounded-lg overflow-hidden mb-3">
                    {item.file_type.startsWith('image') ? (
                      <img
                        src={item.public_url}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video size={48} className="text-gray-500" />
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm font-semibold text-white truncate mb-1">{item.title}</p>
                  <p className="text-xs text-gray-500 truncate">{(item.file_size / 1024 / 1024).toFixed(2)} MB</p>
                  
                  <button
                    onClick={() => handleDelete(item.media_id, item.original_filename)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    data-testid={`delete-${item.media_id}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaLibrary;
