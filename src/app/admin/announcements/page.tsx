'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { Send, Bell, History, CheckCircle, AlertCircle, Loader2, Users } from 'lucide-react';

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Fetch previous announcements
    const annRef = ref(db, 'announcements');
    const unsubAnn = onValue(annRef, (snap) => {
      const data: any[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          data.push({ id: child.key, ...child.val() });
        });
      }
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setAnnouncements(data);
    });

    // Fetch total registered users for the broadcast count
    const usersRef = ref(db, 'users');
    const unsubUsers = onValue(usersRef, (snap) => {
      setUserCount(snap.exists() ? Object.keys(snap.val()).length : 0);
    });

    return () => {
      unsubAnn();
      unsubUsers();
    };
  }, []);

  const handleBroadcast = async () => {
    if (!message) return setError('Message is required.');
    if (!confirm(`Are you sure? This will send a WhatsApp message to ALL ${userCount} registered citizens.`)) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message })
      });

      if (res.ok) {
        setSuccess(`Successfully broadcasted to ${userCount} citizens!`);
        setTitle('');
        setMessage('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send broadcast.');
      }
    } catch (e) {
      setError('An error occurred during broadcast.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Header section with Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
             <Bell className="w-6 h-6 text-red-600" /> WhatsApp Broadcast Center
           </h1>
           <p className="text-sm text-gray-500 mt-1 italic">
             Directly reach every citizen in your database with official alerts.
           </p>
        </div>
        
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
           <div className="w-10 h-10 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5" />
           </div>
           <div>
              <span className="text-xs font-bold text-gray-400 block uppercase tracking-wider">Total Recipients</span>
              <span className="text-lg font-bold text-gray-900 tracking-tight">{userCount} Registered Citizens</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Compose Message */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                 <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2 uppercase tracking-wide">
                   <Send className="w-4 h-4 text-red-600" /> Compose New Announcement
                 </h2>
              </div>
              
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Subject / Title (Optional)</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Water Supply Interruption / Weather Alert"
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-medium"
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Announcement Message</label>
                    <textarea 
                      rows={6}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type the message you want to send to everyone via WhatsApp..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-all leading-relaxed resize-none"
                    />
                 </div>

                 {error && (
                   <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in zoom-in-95">
                      <AlertCircle className="w-5 h-5" /> {error}
                   </div>
                 )}

                 {success && (
                   <div className="bg-green-50 border border-green-100 text-green-700 p-3 rounded-lg flex items-center gap-3 text-sm animate-in fade-in zoom-in-95">
                      <CheckCircle className="w-5 h-5 transition-transform scale-110" /> {success}
                   </div>
                 )}

                 <button 
                   disabled={loading || !message}
                   onClick={handleBroadcast}
                   className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-all shadow-md flex items-center justify-center gap-2 group"
                 >
                   {loading ? (
                     <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        SENDING BROADCAST...
                     </>
                   ) : (
                     <>
                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        SEND TO ALL CITIZENS
                     </>
                   )}
                 </button>
              </div>
           </div>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-1 space-y-4">
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                 <h2 className="text-xs font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest">
                   <History className="w-4 h-4" /> RECENTLY SENT
                 </h2>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[500px] p-2 space-y-2">
                 {announcements.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-2">
                       <Bell className="w-8 h-8 opacity-20" />
                       <span className="text-xs italic font-medium">No previous history</span>
                    </div>
                 ) : (
                   announcements.map((ann, i) => (
                     <div key={i} className="p-4 bg-white border border-gray-100 rounded-lg hover:border-red-100 hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-1">
                           <h4 className="text-[11px] font-bold text-red-600 uppercase tracking-tighter truncate max-w-[120px]">{ann.title || 'BROADCAST'}</h4>
                           <span className="text-[9px] font-medium text-gray-400 font-mono">
                              {new Date(ann.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                        <p className="text-xs text-gray-700 line-clamp-2 leading-tight py-1">{ann.message}</p>
                        <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-[9px] font-bold text-gray-400">
                           <span>RECIPIENTS: {ann.recipientCount}</span>
                           <span className="text-green-500 uppercase tracking-tighter">✔ Delivered</span>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
