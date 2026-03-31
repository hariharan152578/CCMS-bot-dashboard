'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { Droplet, Zap, Route, Trash2, X, CheckCircle, ExternalLink, List, ChevronLeft, ChevronRight, Bell, Music } from 'lucide-react';
import dynamic from 'next/dynamic';
import ActionPanel from '@/components/ActionPanel';
import Image from 'next/image';

const MapViewer = dynamic(() => import('@/components/MapViewer'), { ssr: false });

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  useEffect(() => {
    const complaintsRef = ref(db, 'complaints');
    const unsubscribe = onValue(complaintsRef, async (snap) => {
      let comps: any[] = [];
      if (snap.exists()) {
        snap.forEach((childSnap) => {
          comps.push({ id: childSnap.key, ...childSnap.val() });
        });
      }

      await Promise.all(comps.map(async (c) => {
        if (c.userId) {
          const userSnap = await get(ref(db, `users/${c.userId}`));
          if (userSnap.exists()) {
            c.user = userSnap.val();
          }
        }
      }));

      comps.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setComplaints(comps);
      setLoading(false);

      // Auto-select first if none selected
      if (comps.length > 0) {
        setSelectedComplaintId(curr => curr || comps[0].id);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Reset page when switching filters
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter]);

  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'Pending').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  const filteredComplaints = complaints.filter(c => {
    if (typeFilter === 'All') return true;
    return (c.type || 'Complaint') === typeFilter;
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredComplaints.length / ITEMS_PER_PAGE);
  const pagedComplaints = filteredComplaints.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const selectedComplaint = filteredComplaints.find(c => c.id === selectedComplaintId) || null;

  return (
    <div className="flex flex-col h-full space-y-6">

      {/* Welcome & KPIs */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          Dashboard Overview <span className="text-xs font-normal text-gray-500 uppercase tracking-widest">— {total} Active Incidents</span>
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-tight">Total Incidents</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900">{total}</span>
              <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center">
                <Droplet className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-red-500 uppercase mb-2 tracking-tight">Pending Review</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-red-600">{pending}</span>
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-tight">In Progress</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900">{inProgress}</span>
              <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center">
                <Route className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-tight">Resolution SLA</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900">
                {total > 0 ? ((resolved / total) * 100).toFixed(0) : 0}%
              </span>
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-0 lg:min-h-[600px] mb-6">
        
        {/* Left: Matrix (Table List) */}
        <div className="w-full lg:w-3/5 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[400px] lg:min-h-0 relative">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center sm:flex-row flex-col gap-2">
            <div className="flex items-center gap-3 text-gray-900">
              <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center">
                <List className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-bold tracking-tight">Incident Queue</h2>
            </div>

            <div className="flex bg-white border border-gray-200 rounded-lg p-1">
              {['All', 'Complaint', 'Query'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-3 py-1 text-[10px] font-bold rounded transition-colors ${typeFilter === t ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                  {t.toUpperCase()}S
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-xs font-bold text-gray-500 border-b border-gray-200 whitespace-nowrap">
                  <th className="p-4">CITIZEN</th>
                  <th className="p-4">TYPE</th>
                  <th className="p-4">ID</th>
                  <th className="p-4">SUMMARY</th>
                  <th className="p-4 text-center">STATUS</th>
                  <th className="p-4">DATE</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {pagedComplaints.map((c) => {
                  const isSelected = selectedComplaintId === c.id;
                  const minsAgo = Math.max(1, Math.floor((Date.now() - (c.createdAt || Date.now())) / 60000));
                  const timeDisplay = minsAgo < 60 ? `${minsAgo}m` : minsAgo < 1440 ? `${Math.floor(minsAgo / 60)}h` : `${Math.floor(minsAgo / 1440)}d`;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedComplaintId(c.id)}
                      className={`cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-red-50/50 border-l-4 border-l-red-600' : 'border-l-4 border-l-transparent'}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={`https://ui-avatars.com/api/?name=${c.user?.name || 'C'}&background=random`} alt="av" className="w-8 h-8 rounded-lg" />
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-gray-900 font-bold truncate">{c.user?.name || 'Citizen'}</span>
                            <span className="text-[9px] text-gray-400">+{c.userId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 uppercase text-[9px] font-black tracking-widest text-gray-400">
                        <span className={`px-2 py-0.5 rounded ${c.type === 'Query' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                          {c.type || 'COMPLAINT'}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-gray-500 font-mono">{c.complaintId || c.id.substring(0, 8)}</td>
                      <td className="p-4 text-xs text-gray-600 truncate max-w-[150px]">
                        {c.type === 'Query' ? c.description : `${c.category === 'Other' ? (c.customCategory || 'Other') : c.category}: ${c.description}`}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[9px] font-black rounded mx-auto flex items-center justify-center w-max min-w-[70px] uppercase tracking-widest transition-all ${c.status === 'Pending' ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-gray-400 font-bold whitespace-nowrap">{timeDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between mt-auto">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredComplaints.length)} of {filteredComplaints.length}
                </span>

                <div className="flex items-center gap-2">
                   <button
                     disabled={currentPage === 1}
                     onClick={() => setCurrentPage(prev => prev - 1)}
                     className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-black hover:border-black disabled:opacity-30 disabled:pointer-events-none transition-all"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   
                   <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`w-8 h-8 text-[10px] font-black rounded-lg transition-all ${currentPage === i + 1 ? 'bg-black text-white' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                   </div>

                   <button
                     disabled={currentPage === totalPages}
                     onClick={() => setCurrentPage(prev => prev + 1)}
                     className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-black hover:border-black disabled:opacity-30 disabled:pointer-events-none transition-all"
                   >
                     <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
            </div>
          )}
        </div>

        {/* Right: Detailed Panel */}
        {selectedComplaint ? (
          <div className="w-full lg:w-2/5 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0 animate-in slide-in-from-right-4 duration-300">
            <div className="px-6 py-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${selectedComplaint.type === 'Query' ? 'bg-amber-500' : 'bg-red-600 shadow-sm'}`}></div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight">
                    Incident {selectedComplaint.complaintId || selectedComplaint.id.substring(0, 8)}
                  </h2>
               </div>
               <X className="w-5 h-5 text-gray-400 cursor-pointer hover:text-black transition-all p-1 hover:bg-gray-200 rounded-full" onClick={() => setSelectedComplaintId(null)} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                      {/* Identity */}
                      <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100/80 group">
                        <span className="text-gray-400 block font-bold text-[8px] uppercase tracking-widest mb-1.5 leading-none">Citizen Identity</span>
                        <p className="text-sm font-bold text-gray-900">{selectedComplaint.user?.name || 'Citizen'}</p>
                      </div>
                      
                      {/* Link */}
                      <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100/80 group">
                        <span className="text-gray-400 block font-bold text-[8px] uppercase tracking-widest mb-1.5 leading-none">Contact Link</span>
                        <p className="text-sm font-bold text-red-600">+{selectedComplaint.userId}</p>
                      </div>

                      {/* Information (Category) */}
                      {selectedComplaint.type !== 'Query' && (
                        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] relative overflow-hidden">
                          <span className="text-gray-400 block font-bold text-[8px] uppercase tracking-widest mb-2 leading-none">Information</span>
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold text-gray-900">{selectedComplaint.category === 'Other' ? (selectedComplaint.customCategory || 'Other') : selectedComplaint.category}</p>
                            <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{selectedComplaint.priority} PRIORITY</p>
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                {selectedComplaint.location && (
                  <div className="w-full sm:w-1/2 lg:w-48 h-48 overflow-hidden rounded-2xl border border-gray-200 shadow-sm relative shrink-0">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedComplaint.location.lat},${selectedComplaint.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full h-full group"
                      title="Open in Google Maps"
                    >
                      <MapViewer
                        lat={parseFloat(selectedComplaint.location?.lat || '0')}
                        lng={parseFloat(selectedComplaint.location?.lng || '0')}
                        address={selectedComplaint.location?.address || ''}
                        showPopup={false}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    </a>
                  </div>
                )}
              </div>

              {/* Narrative */}
              <div className="space-y-4">
                <strong className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block px-1">Narrative</strong>
                {selectedComplaint.description?.startsWith('AUDIO_MEDIA_ID:') ? (
                  <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-5">
                      <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg">
                        <Music className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">Voice Description</span>
                        <p className="text-[8px] font-bold text-red-600 uppercase tracking-tighter mt-1.5">Transcription Awaiting Approval</p>
                      </div>
                    </div>
                    <audio 
                      controls 
                      src={`/api/media/${selectedComplaint.description.replace('AUDIO_MEDIA_ID:', '')}`} 
                      className="w-full h-10 accent-red-600 opacity-90"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 leading-relaxed font-medium text-sm text-gray-800">
                    {selectedComplaint.description || "Nothing"}
                  </div>
                )}
              </div>

              {/* Evidence */}
              <div className="space-y-4">
                <strong className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block px-1">Visual Evidence</strong>
                <div className="grid grid-cols-4 gap-4">
                  {selectedComplaint.media && selectedComplaint.media.length > 0 ? (
                    selectedComplaint.media.map((url: string, idx: number) => {
                      const finalUrl = /^\d+$/.test(url) ? `/api/media/${url}` : url;
                      return (
                        <div key={idx} className="aspect-square relative overflow-hidden rounded-2xl border border-gray-100 shadow-sm group bg-white">
                          <a href={finalUrl} target="_blank" rel="noreferrer" className="block w-full h-full">
                             <img 
                               src={finalUrl} 
                               alt="evidence" 
                               className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                               onError={(e) => {
                                 const target = e.target as HTMLImageElement;
                                 target.onerror = null;
                                 target.src = "https://cdn-icons-png.flaticon.com/512/5948/5948503.png"; 
                               }}
                             />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <ExternalLink className="w-5 h-5 text-white" />
                             </div>
                          </a>
                        </div>
                      );
                    })
                  ) : (
                    <div className="aspect-square bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-[9px] font-bold text-gray-400 uppercase text-center p-4">
                       <Trash2 className="w-5 h-5 mb-1.5 opacity-20" />
                       No Media
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-8 border-t border-gray-100">
                <strong className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-5 px-1">Actions</strong>
                <ActionPanel
                  complaintId={selectedComplaint.id}
                  currentStatus={selectedComplaint.status}
                  currentPriority={selectedComplaint.priority}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full lg:w-2/5 bg-gray-50/50 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-gray-400 min-h-[300px] lg:min-h-0 p-12 text-center space-y-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
               <Bell className="w-8 h-8 opacity-20" />
            </div>
            <div>
               <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Select an active incident</p>
               <p className="text-[10px] font-bold uppercase tracking-tighter text-gray-300 mt-1">Awaiting command assessment...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
