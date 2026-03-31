import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { toast } from 'sonner';
import { X } from 'lucide-react';

const localizer = momentLocalizer(moment);
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CalendarPage = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  useEffect(() => {
    fetchScheduledPosts();
  }, []);
  
  const fetchScheduledPosts = async () => {
    try {
      const response = await axios.get(`${API}/scheduled`);
      const posts = response.data.scheduled_posts;
      
      const calendarEvents = posts.map(post => ({
        id: post.schedule_id,
        title: post.message.substring(0, 50) + '...',
        start: new Date(post.scheduled_time),
        end: new Date(new Date(post.scheduled_time).getTime() + 60 * 60 * 1000),
        resource: post,
        status: post.status
      }));
      
      setEvents(calendarEvents);
    } catch (error) {
      console.error('Failed to fetch scheduled posts:', error);
      toast.error('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  };
  
  const eventStyleGetter = (event) => {
    let backgroundColor = '#3b82f6';
    
    if (event.status === 'success') {
      backgroundColor = '#10b981';
    } else if (event.status === 'failed') {
      backgroundColor = '#ef4444';
    } else if (event.status === 'pending') {
      backgroundColor = '#a855f7';
    }
    
    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '12px',
        fontWeight: '600'
      }
    };
  };
  
  if (loading) {
    return (
      <div className="flex min-h-screen bg-[#0a0a0a]">
        <Sidebar />
        <div className="flex-1 md:ml-64 pt-20 md:pt-0 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Loading calendar...</p>
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
            <h1 className="text-3xl font-black text-white mb-2">Content Calendar</h1>
            <p className="text-gray-400">View and manage your scheduled posts</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 calendar-container">
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: 700 }}
              eventPropGetter={eventStyleGetter}
              onSelectEvent={(event) => setSelectedEvent(event)}
            />
          </div>
        </div>
      </div>
      
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setSelectedEvent(null)}>
          <div className="bg-[#1a1a1a] rounded-xl p-6 max-w-md w-full mx-4 border border-[#27272a]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Post Details</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Scheduled Time</p>
                <p className="text-sm text-white">{moment(selectedEvent.start).format('MMMM DD, YYYY - h:mm A')}</p>
              </div>
              
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Content</p>
                <p className="text-sm text-gray-300">{selectedEvent.resource.message}</p>
              </div>
              
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Content Type</p>
                <span className="inline-block px-3 py-1 bg-[#0a0a0a] text-xs font-semibold text-white rounded uppercase">
                  {selectedEvent.resource.content_type}
                </span>
              </div>
              
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Pages</p>
                <p className="text-sm text-gray-300">{selectedEvent.resource.selected_page_ids.length} page(s) selected</p>
              </div>
              
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-1">Status</p>
                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded uppercase ${
                  selectedEvent.status === 'success' ? 'bg-green-500/20 text-green-500' :
                  selectedEvent.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                  'bg-purple-500/20 text-purple-500'
                }`}>
                  {selectedEvent.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
