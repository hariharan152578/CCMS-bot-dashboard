'use client';

import { useState, useEffect, useRef } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, push, serverTimestamp } from 'firebase/database';
import { Send, Bell, History, CheckCircle, AlertCircle, Loader2, Users, Paperclip, Image as ImageIcon, FileText, Music, X, Play, FileJson, Volume2, Calendar, UserCheck } from 'lucide-react';

export default function AnnouncementsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedAnn, setSelectedAnn] = useState<any | null>(null);
  
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
    <div className="max-w-5xl mx-auto space-y-6 px-4 md:px-0 pb-10">
      
      {/* Header section with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:gap-6 px-1">
        <div className="space-y-1">
           <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
             <Bell className="w-6 h-6 text-red-600" /> Broadcast Center
           </h1>
           <p className="text-[10px] sm:text-sm text-gray-500 uppercase font-bold tracking-tight">
             Directly reach every citizen in your database via WhatsApp.
           </p>
        </div>
        
        <div className="bg-white px-4 py-3 sm:px-5 sm:py-3 rounded-2xl border border-gray-200 shadow-sm flex items-center gap-4 group hover:border-red-200 transition-all w-full sm:w-auto">
           <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 sm:w-6 sm:h-6" />
           </div>
           <div>
              <span className="text-[9px] sm:text-[10px] font-bold text-gray-400 block uppercase tracking-widest leading-none mb-1">Total Recipients</span>
              <span className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">{userCount} <span className="font-normal text-xs sm:text-sm text-gray-500">Registered</span></span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Compose Message */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="px-4 py-4 sm:px-6 sm:py-4 bg-gray-50 border-b border-gray-200 flex flex-wrap sm:flex-nowrap justify-between items-center gap-y-3">
                 <h2 className="text-[10px] sm:text-xs font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest shrink-0">
                   <Send className="w-3.5 h-3.5 sm:w-4 h-4 text-red-600" /> Compose New
                 </h2>
                 <div className="flex items-center gap-3 sm:gap-4">
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
                      className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-bold text-gray-500 hover:text-black transition-colors uppercase tracking-widest disabled:opacity-30"
                    >
                      {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                      <span className="hidden md:inline">Add Attachments</span>
                      <span className="md:hidden">Media</span>
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
                      className="flex items-center gap-1.5 sm:gap-2 text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-widest disabled:opacity-30 border-l border-gray-200 pl-3"
                    >
                      {isUploadingAudio ? <Loader2 className="w-3 h-3 animate-spin" /> : <Music className="w-3 h-3" />}
                      <span className="hidden md:inline">{optionalAudio ? 'Audio Added' : 'Optional Audio'}</span>
                      <span className="md:hidden">{optionalAudio ? 'Added' : 'Audio'}</span>
                    </button>
                 </div>
              </div>
              
              <div className="p-4 sm:p-6 space-y-5 flex-1">
                 {/* Subject Field */}
                 <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">Subject / Title (Optional)</label>
                    <input 
                      type="text" 
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Water Supply Interruption"
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all font-bold"
                    />
                 </div>

                 {/* Previews Area */}
                 {(attachments.length > 0 || optionalAudio || isUploading || isUploadingAudio) && (
                   <div className="space-y-4">
                     {/* General Attachments Previews */}
                     {attachments.length > 0 && (
                       <div className="space-y-2">
                         <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest px-1">General Attachments ({attachments.length})</label>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                            {attachments.map((file, idx) => (
                              <div key={idx} className="relative group bg-gray-50 border border-gray-200 rounded-xl p-3 animate-in fade-in slide-in-from-top-2">
                                <button 
                                  onClick={() => removeAttachment(idx)}
                                  className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-white rounded-lg border border-gray-100 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                                    {file.type.startsWith('image') || file.type === 'image' ? (
                                      <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                      <FileText className="w-5 h-5 text-gray-400" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <p className="text-[10px] font-bold text-gray-900 truncate">{file.name}</p>
                                     <span className="text-[8px] bg-gray-200 text-gray-600 px-1 py-0.5 rounded font-bold uppercase tracking-tight truncate">
                                        {file.type.includes('/') ? file.type.split('/')[1] : file.type || 'FILE'}
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
                         <label className="block text-[9px] font-bold text-red-600 uppercase tracking-widest px-1">Optional Audio Message</label>
                         {isUploadingAudio ? (
                           <div className="bg-red-50/30 border-2 border-dashed border-red-100 rounded-xl p-4 flex flex-col items-center justify-center space-y-2">
                              <Loader2 className="w-5 h-5 text-red-600 animate-spin" />
                              <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest animate-pulse">Uploading Audio...</span>
                           </div>
                         ) : optionalAudio && (
                           <div className="relative group bg-red-50/50 border border-red-100 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                             <button 
                               onClick={removeAudio}
                               className="absolute -top-2 -right-2 bg-black text-white p-1 rounded-full shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                             >
                               <X className="w-3 h-3" />
                             </button>
                             <div className="flex items-center gap-4">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-red-50">
                                   <Volume2 className="w-6 h-6 text-red-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                   <p className="text-[9px] sm:text-[10px] font-bold text-red-600 uppercase tracking-widest leading-none mb-1">Voice Note Attached</p>
                                   <p className="text-[10px] sm:text-xs font-bold text-gray-900 truncate">{optionalAudio.name}</p>
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
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-2 mb-2 px-1">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Announcement Message</label>
                      <div className="flex items-center gap-3">
                        <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-bold text-gray-500 hover:text-black flex items-center gap-1.5 transition-colors uppercase animate-in fade-in slide-in-from-right-2 duration-300 delay-75"><Paperclip className="w-3 h-3 text-red-500" /> Attach</button>
                        <button onClick={() => audioInputRef.current?.click()} className="text-[10px] font-bold text-gray-500 hover:text-red-600 flex items-center gap-1.5 transition-colors uppercase border-l border-gray-100 pl-3 animate-in fade-in slide-in-from-right-2 duration-300 delay-150"><Music className="w-3 h-3 text-red-500" /> Audio</button>
                      </div>
                    </div>
                    <textarea 
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type the message you want to send..."
                      className="w-full bg-gray-50/50 border border-gray-200 rounded-lg p-4 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all leading-relaxed resize-none font-medium min-h-[160px]"
                    />
                 </div>

                 {/* Status Alerts */}
                 {error && (
                   <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95">
                      <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                   </div>
                 )}

                 {success && (
                   <div className="bg-green-50 border border-green-100 text-green-700 px-4 py-3 rounded-lg flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider animate-in fade-in zoom-in-95">
                      <CheckCircle className="w-4 h-4 shrink-0" /> {success}
                   </div>
                 )}

                 {/* Submit Button */}
                 <button 
                   disabled={loading || !message || isUploading || isUploadingAudio}
                   onClick={handleBroadcast}
                   className="w-full bg-black hover:bg-red-700 disabled:opacity-30 text-white font-black py-4 rounded-xl transition-all shadow-xl flex items-center justify-center gap-3 group uppercase tracking-widest text-[10px] sm:text-xs"
                 >
                   {loading ? (
                     <>
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        DISPATCHING...
                     </>
                   ) : (
                     <>
                        <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        SEND BROADCAST TO CITIZENS
                     </>
                   )}
                 </button>
              </div>
           </div>
        </div>

        {/* Right: History */}
        <div className="lg:col-span-1 space-y-4">
           <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full overflow-hidden">
              <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                 <h2 className="text-[10px] sm:text-xs font-bold text-gray-500 flex items-center gap-2 uppercase tracking-widest">
                   <History className="w-4 h-4 text-red-600" /> RECENTLY SENT
                 </h2>
                 <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{announcements.length} Archive</span>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[600px] p-3 space-y-3">
                 {announcements.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-gray-400 space-y-2">
                       <Bell className="w-8 h-8 opacity-20" />
                       <span className="text-[10px] italic font-bold uppercase tracking-widest">No previous history</span>
                    </div>
                 ) : (
                   announcements.map((ann, i) => (
                     <div 
                        key={i} 
                        onClick={() => setSelectedAnn(ann)}
                        className="p-4 bg-white border border-gray-100 rounded-xl hover:border-red-100 hover:shadow-md transition-all group relative overflow-hidden cursor-pointer active:scale-[0.98] duration-200"
                     >
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex justify-between items-start mb-1">
                           <h4 className="text-[10px] font-bold text-red-600 uppercase tracking-tighter truncate max-w-[100px] sm:max-w-[140px]">{ann.title || 'BROADCAST'}</h4>
                           <span className="text-[8px] font-bold text-gray-400 font-mono">
                              {new Date(ann.createdAt).toLocaleDateString()}
                           </span>
                        </div>
                        <p className="text-[11px] text-gray-700 line-clamp-2 leading-snug py-1 font-medium">{ann.message}</p>
                        
                        <div className="mt-2 flex flex-wrap gap-1">
                           {ann.attachments?.map((at: any, idx: number) => (
                             <div key={idx} className="p-1.5 bg-gray-50 rounded-lg border border-gray-100">
                                {at.type?.startsWith('image') || at.type === 'image' ? (
                                   <ImageIcon className="w-2.5 h-2.5 text-blue-500" />
                                ) : (
                                   <FileText className="w-2.5 h-2.5 text-gray-400" />
                                )}
                             </div>
                           ))}
                           {ann.audio && (
                             <div className="p-1.5 bg-red-50 rounded-lg border border-red-100">
                                <Music className="w-2.5 h-2.5 text-red-500" />
                             </div>
                           )}
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between text-[9px] font-bold text-gray-400">
                           <span className="uppercase tracking-widest text-[8px]">RECIPIENTS: {ann.recipientCount}</span>
                           <span className="text-green-500 uppercase tracking-widest flex items-center gap-1 text-[8px]">
                             <CheckCircle className="w-2 h-2" /> Delivered
                           </span>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>

      </div>

      {/* Broadcast Detail Slide-over Panel */}
      {selectedAnn && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 z-2000 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
            onClick={() => setSelectedAnn(null)}
          />
          
          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white z-2010 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 cubic-bezier(0.4, 0, 0.2, 1)">
             {/* Panel Header */}
             <div className="px-6 py-6 sm:px-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                      <Bell className="w-5 h-5" />
                   </div>
                   <div>
                      <h2 className="text-sm font-bold text-gray-900 uppercase tracking-tight">Archive View</h2>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Transmission Record</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedAnn(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 transition-all active:scale-90"
                >
                   <X className="w-5 h-5" />
                </button>
             </div>

             {/* Panel Content (Scrollable) */}
             <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8">
                
                {/* Meta Stats */}
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                         <Calendar className="w-3 h-3" />
                         <span className="text-[9px] font-bold uppercase tracking-widest">Date Transmitted</span>
                      </div>
                      <p className="text-[11px] sm:text-xs font-bold text-gray-900">{new Date(selectedAnn.createdAt).toLocaleString()}</p>
                   </div>
                   <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 transition-all hover:bg-white hover:shadow-sm">
                      <div className="flex items-center gap-2 text-gray-400 mb-1">
                         <UserCheck className="w-3 h-3" />
                         <span className="text-[9px] font-bold uppercase tracking-widest">Audience</span>
                      </div>
                      <p className="text-[11px] sm:text-xs font-bold text-gray-900">{selectedAnn.recipientCount} Registered</p>
                   </div>
                </div>

                {/* Announcement Body */}
                <div className="space-y-3">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Broadcast Sequence</label>
                   <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-red-50/30 rounded-full -mr-8 -mt-8"></div>
                      {selectedAnn.title && (
                         <h3 className="text-sm font-black text-red-600 border-b border-gray-50 pb-3 uppercase tracking-tight">{selectedAnn.title}</h3>
                      )}
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">{selectedAnn.message}</p>
                   </div>
                </div>

                {/* Attachments Section */}
                {(selectedAnn.attachments?.length > 0 || selectedAnn.audio) && (
                   <div className="space-y-4 pb-4">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-1">Delivered Media Files</label>
                      <div className="space-y-3">
                        {/* Audio if present */}
                        {selectedAnn.audio && (
                           <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 group transition-all hover:shadow-md">
                              <div className="flex items-center gap-4">
                                 <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                    <Music className="w-5 h-5 text-red-600" />
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mb-1 leading-none">Voice Attachment</p>
                                    <p className="text-[10px] font-bold text-gray-900 truncate mb-2">{selectedAnn.audio.name || 'Voice Note'}</p>
                                    <audio controls className="w-full h-8 scale-90 -ml-[5%]">
                                       <source src={selectedAnn.audio.url} type={selectedAnn.audio.type} />
                                    </audio>
                                 </div>
                              </div>
                           </div>
                        )}

                        {/* Other Attachments */}
                        {selectedAnn.attachments?.map((at: any, idx: number) => (
                           <div key={idx} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center justify-between group hover:border-red-200 hover:bg-white hover:shadow-md transition-all">
                              <div className="flex items-center gap-4 min-w-0">
                                 <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                                    {at.type?.startsWith('image') || at.type === 'image' ? (
                                       <img src={at.url} alt="Attached" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                    ) : (
                                       <FileText className="w-6 h-6 text-gray-400 group-hover:text-red-500 transition-colors" />
                                    )}
                                 </div>
                                 <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{at.type?.split('/')[1] || at.type || 'FILE'}</p>
                                    <p className="text-[11px] font-bold text-gray-900 truncate">{at.name || 'Attachment Record'}</p>
                                 </div>
                              </div>
                              <a 
                                 href={at.url} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="text-[9px] font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-all uppercase tracking-widest shrink-0 border border-transparent hover:border-red-100"
                              >
                                 View
                              </a>
                           </div>
                        ))}
                      </div>
                   </div>
                )}
             </div>

             {/* Panel Footer */}
             <div className="p-6 sm:p-8 bg-gray-50/50 border-t border-gray-100 mt-auto">
                <button 
                  onClick={() => setSelectedAnn(null)}
                  className="w-full bg-black text-white font-black py-4 rounded-xl text-xs uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                   <CheckCircle className="w-4 h-4 text-green-400" />
                   Exit Archive View
                </button>
             </div>
          </div>
        </>
      )}
    </div>
  );
}
