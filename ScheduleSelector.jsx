import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Zap, Clock, CalendarDays, ChevronRight } from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ScheduleSelector = ({ onScheduleSelect, selectedAccount }) => {
  const [scheduleMode, setScheduleMode] = useState('now');
  const [customTime, setCustomTime] = useState(new Date(Date.now() + 3600000));
  const [timeSlots, setTimeSlots] = useState([]);
  const [timezoneLabel, setTimezoneLabel] = useState('US Eastern Time');
  
  useEffect(() => {
    fetchTimeSlots();
  }, []);
  
  const fetchTimeSlots = async () => {
    try {
      const response = await axios.get(`${API}/schedule/time-slots`);
      setTimeSlots(response.data.time_slots?.slice(0, 5) || []);
      setTimezoneLabel(response.data.label || 'US Eastern Time');
    } catch (err) {
      console.error('Failed to fetch time slots', err);
    }
  };
  
  const modes = [
    { id: 'now', label: 'Post Now', icon: Zap, desc: 'Publish immediately' },
    { id: 'auto', label: 'Auto Schedule', icon: Clock, desc: 'Best time slot' },
    { id: 'manual', label: 'Custom Time', icon: CalendarDays, desc: 'Pick date & time' },
  ];

  const handleModeChange = (mode) => {
    setScheduleMode(mode);
    if (mode === 'now') {
      onScheduleSelect({ type: 'now' });
    } else if (mode === 'auto') {
      onScheduleSelect({ type: 'auto' });
    }
  };
  
  const handleCustomTimeSelect = (date) => {
    setCustomTime(date);
    onScheduleSelect({
      type: 'manual',
      scheduledTime: date.toISOString()
    });
  };
  
  return (
    <div className="space-y-4" data-testid="schedule-selector">
      <div className="rounded-2xl border border-blue-500/15 bg-blue-500/10 px-4 py-3 text-xs font-medium text-blue-200">
        Default timezone: <span className="font-semibold text-white">{timezoneLabel}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = scheduleMode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode.id)}
              data-testid={`schedule-mode-${mode.id}`}
              className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 glow-button ${
                isActive
                  ? 'border-purple-500/50 bg-gradient-to-b from-purple-500/15 to-blue-500/10 shadow-[0_0_15px_rgba(139,92,246,0.15)] text-white'
                  : 'border-white/10 bg-[#1a1a1a] hover:border-white/20 hover:bg-white/5 text-zinc-400'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : ''}`} />
              <span className="text-xs font-semibold">{mode.label}</span>
            </button>
          );
        })}
      </div>
      
      {scheduleMode === 'auto' && (
        <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl animate-fade-in">
          <p className="text-sm text-white font-medium">AI will pick the next best USA slot</p>
          <p className="text-xs text-zinc-400 mt-1">Based on your audience engagement windows in US Eastern Time</p>
        </div>
      )}
      
      {scheduleMode === 'manual' && (
        <div className="space-y-3 animate-fade-in">
          <div className="p-4 bg-[#0f0f13] border border-white/10 rounded-xl">
            <p className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-3">Pick Date & Time</p>
            <DatePicker
              selected={customTime}
              onChange={handleCustomTimeSelect}
              showTimeSelect
              timeFormat="HH:mm"
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              minDate={new Date()}
              data-testid="custom-datetime-picker"
              className="w-full p-3 bg-[#1a1a1a] border border-white/10 rounded-xl text-sm text-white focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 outline-none transition-all"
              calendarClassName="dark-calendar"
            />
          </div>
        </div>
      )}
      
      {timeSlots.length > 0 && (
        <div className="pt-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-2">Upcoming Slots</p>
          <div className="space-y-1">
            {timeSlots.map((slot, index) => (
              <div 
                key={index}
                className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs text-zinc-400 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${slot.available ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                  <span>{slot.label}</span>
                </div>
                <ChevronRight className="w-3 h-3 text-zinc-600" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleSelector;
