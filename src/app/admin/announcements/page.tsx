'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { Send, Bell, History, CheckCircle, AlertCircle, Loader2, Users, Paperclip, Image as ImageIcon, FileText, Music, X, Play, FileJson, Volume2 } from 'lucide-react';

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Media Upload State
  const [attachments, setAttachments] = useState<{url: string, type: string, name: string}[]>([]);
  const [optionalAudio, setOptionalAudio] = useState<{url: string, type: string, name: string} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

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

  const uploadFile = async (file: File, isAudio: boolean = false) => {
    if (isAudio) setIsUploadingAudio(true);
    else setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        const fileData = {
          url: data.url,
          type: data.type || file.type,
          name: file.name
        };
        
        if (isAudio) {
          setOptionalAudio(fileData);
        } else {
          setAttachments(prev => [...prev, fileData]);
        }
      } else {
        setError(data.error || 'Failed to upload file.');
      }
    } catch (err) {
      setError('An error occurred during file upload.');
    } finally {
      if (isAudio) setIsUploadingAudio(false);
      else setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => uploadFile(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file, true);
    if (audioInputRef.current) audioInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const removeAudio = () => {
    setOptionalAudio(null);
  };

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
        body: JSON.stringify({ 
          title, 
          message,
          attachments,
          audio: optionalAudio
        })
      });

      if (res.ok) {
        setSuccess(`Successfully broadcasted to ${userCount} citizens!`);
        setTitle('');
        setMessage('');
        setAttachments([]);
        setOptionalAudio(null);
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-1">
        <div>
           <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
             <Bell className="w-6 h-6 text-red-600" /> Broadcast Center
           </h1>
           <p className="text-[11px] sm:text-sm text-gray-500 mt-1 uppercase font-bold tracking-tight">
             Directly reach every citizen in your database via WhatsApp.
           </p>
        </div>
        
        <div className="bg-white px-5 py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-all">
           <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
           </div>
           <div>
              <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-widest leading-none mb-1">Total Recipients</span>
              <span className="text-xl font-bold text-gray-900 tracking-tight">{userCount} <span className="font-normal text-gray-500">Registered</span></span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Compose Message */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                 <h2 className="text-xs font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest">
                   <Send className="w-4 h-4 text-red-600" /> Compose New Announcement
                 </h2>
                 <div className="flex items-center gap-3">
                    {/* General Attachments Input */}
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      className="hidden"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx"
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-2 text-[10px] font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-widest disabled:opacity-30"
                    >
                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                      Add Attachments
                    </button>

                    {/* Dedicated Audio Input */}
                    <input 
                      type="file" 
                      ref={audioInputRef}
                      onChange={handleAudioSelect}
                      className="hidden"
                      accept="audio/*"
                    />
                    <button 
                      onClick={() => audioInputRef.current?.click()}
                      disabled={isUploadingAudio || !!optionalAudio}
                      className="flex items-center gap-2 text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-widest disabled:opacity-30 border-l border-gray-200 pl-3"
                    >
                      {isUploadingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Music className="w-3 h-3" />}
                      {optionalAudio ? 'Audio Added' : 'Optional Audio'}
                    </button>
                 </div>
              </div>
              
              <div className="p-6 space-y-5 flex-1">
                 {/* Subject Field */}
                 <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Subject / Title (Optional)</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Water Supply Interruption / Weather Alert"
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold"
                    />
                 </div>

                 {/* Previews Area */}
                 {(attachments.length > 0 || optionalAudio || isUploading || isUploadingAudio) && (
                   <div className="space-y-4">
                     {/* General Attachments Previews */}
                     {attachments.length > 0 && (
                       <div className="space-y-2">
                         <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">General Attachments ({attachments.length})</label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                            {attachments.map((file, idx) => (
                              <div key={idx} className="relative group bg-gray-50 border border-gray-200 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                                <button 
                                  onClick={() => removeAttachment(idx)}
                                  className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                    {file.type.startsWith('image') ? (
                                      <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : file.type.startsWith('video') ? (
                                      <Play className="w-5 h-5 text-purple-500" />
                                    ) : (
                                      <FileText className="w-5 h-5 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <p className="text-[10px] font-bold text-gray-900 truncate">{file.name}</p>
                                     <span className="text-[8px] bg-gray-200 text-gray-600 px-1 py-0.5 rounded font-bold uppercase tracking-tight truncate">
                                        {file.type.split('/')[1] || 'FILE'}
                                     </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                         </div>
                       </div>
                     )}

                     {/* Uploading State for General Attachments */}
                     {isUploading && (
                       <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center space-y-2">
                          <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Uploading Media...</span>
                       </div>
                     )}

                     {/* Dedicated Audio Preview */}
                     {(optionalAudio || isUploadingAudio) && (
                       <div className="space-y-2">
                         <label className="block text-[10px] font-bold text-red-600 uppercase tracking-widest px-1">Optional Audio Message</label>
                         {isUploadingAudio ? (
                           <div className="bg-red-50/30 border-2 border-dashed border-red-100 rounded-xl p-4 flex flex-col items-center justify-center space-y-2">
                              <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                              <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest animate-pulse">Uploading Audio...</span>
                           </div>
                         ) : optionalAudio && (
                           <div className="relative group bg-red-50/50 border border-red-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                             <button 
                               onClick={removeAudio}
                               className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                             >
                               <X className="w-3 h-3" />
                             </button>
                             <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-red-50">
                                   <Volume2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest leading-none mb-1">Attached Voice Note</p>
                                   <p className="text-xs font-bold text-gray-900 truncate">{optionalAudio.name}</p>
                                   <div className="mt-2">
                                      <audio controls className="w-full h-8 scale-90 -ml-[5%]">
                                        <source src={optionalAudio.url} type={optionalAudio.type} />
                                      </audio>
                                   </div>
                                </div>
                             </div>
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 )}

                 {/* Message Field */}
                 <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Announcement Message</label>
                      <div className="flex items-center gap-2 sm:hidden">
                        <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-gray-600 flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attach</button>
                        <button onClick={() => audioInputRef.current?.click()} className="text-[10px] font-bold text-red-600 flex items-center gap-1 border-l pl-2"><Music className="w-3 h-3" /> Audio</button>
                      </div>
                    </div>
                    <textarea 
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type the message you want to send to everyone via WhatsApp..."
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all leading-relaxed resize-none font-medium h-[160px]"
                    />
                 </div>

                 {/* Status Alerts */}
                 {error && (
                   <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                   </div>
                 )}

                 {success && (
                   <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95">
                      <CheckCircle className="w-4 h-4 shrink-0" /> {success}
                   </div>
                 )}

                 {/* Submit Button */}
                 <button 
                   disabled={loading || !message || isUploading || isUploadingAudio}
                   onClick={handleBroadcast}
                   className="w-full bg-black hover:bg-red-700 disabled:opacity-30 text-white font-black py-4 rounded-xl transition-all shadow-xl flex items-center justify-center gap-3 group uppercase tracking-widest text-xs"
                 >
                   {loading ? (
                     <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        DISPATCHING BROADCAST...
                     </>
                   ) : (
                     <>
                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        SEND TO ALL REGISTERED CITIZENS
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
              
              <div className="flex-1 overflow-y-auto max-h-[600px] p-2 space-y-2">
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
                        
                        <div className="mt-2 flex flex-wrap gap-1">
                           {ann.attachments?.map((at: any, idx: number) => (
                             <div key={idx} className="p-1 bg-gray-50 rounded border border-gray-100">
                                {at.type.startsWith('image') ? <ImageIcon className="w-2.5 h-2.5 text-blue-500" /> : <FileText className="w-2.5 h-2.5 text-gray-400" />}
                             </div>
                           ))}
                           {ann.audio && (
                             <div className="p-1 bg-red-50 rounded border border-red-100">
                                <Music className="w-2.5 h-2.5 text-red-500" />
                             </div>
                           )}
                        </div>

                        <div className="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-[9px] font-bold text-gray-400">
                           <span>RECIPIENTS: {ann.recipientCount}</span>
                           <span className="text-green-500 uppercase tracking-tighter flex items-center gap-1">
                             <CheckCircle className="w-2.5 h-2.5" /> Delivered
                           </span>
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
