'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { Droplet, Zap, Route, Trash2, X, CheckCircle, ExternalLink, List, ChevronLeft, ChevronRight, Bell, Music, Calendar, ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import ActionPanel from '@/components/ActionPanel';
import Image from 'next/image';

const MapViewer = dynamic(() => import('@/components/MapViewer'), { ssr: false });

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  
  // Filters
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

    return () => unsubscribe();
  }, []);

  // Sync pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter, categoryFilter, startDate, endDate]);

  const categories = ['All', ...Array.from(new Set(complaints.filter(c => c.category).map(c => c.category)))].sort();

  const filteredComplaints = complaints.filter(c => {
    const typeMatch = typeFilter === 'All' || (c.type || 'Complaint') === typeFilter;
    const categoryMatch = categoryFilter === 'All' || c.category === categoryFilter;
    
    let rangeMatch = true;
    if (startDate || endDate) {
      const createdTime = c.createdAt || 0;
      if (startDate && createdTime < new Date(startDate).setHours(0,0,0,0)) rangeMatch = false;
      if (endDate && createdTime > new Date(endDate).setHours(23,59,59,999)) rangeMatch = false;
    }

    return typeMatch && categoryMatch && rangeMatch;
  });

  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'Pending').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  const totalPages = Math.ceil(filteredComplaints.length / ITEMS_PER_PAGE);
  const pagedComplaints = filteredComplaints.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const selectedComplaint = filteredComplaints.find(c => c.id === selectedComplaintId) || null;

  const resetFilters = () => {
    setTypeFilter('All');
    setCategoryFilter('All');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="flex flex-col h-full space-y-6">

      {/* Welcome & KPIs */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
           <span className="w-1.5 h-6 bg-red-600 rounded-full"></span>
           Dashboard Overview 
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] bg-gray-100 px-3 py-1 rounded-full">
             {total} Active Incidents
           </span>
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 group hover:border-red-100 transition-all">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-tight">Total Incidents</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 group-hover:text-red-600 transition-colors">{total}</span>
              <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-all">
                <Droplet className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 group hover:border-red-500/20 transition-all">
            <h3 className="text-xs font-bold text-red-500 uppercase mb-2 tracking-tight">Pending Review</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-red-600 group-hover:scale-105 transition-transform">{pending}</span>
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center shadow-inner">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 group hover:border-amber-500/20 transition-all">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-tight">In Progress</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 group-hover:text-amber-600 transition-colors">{inProgress}</span>
              <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-all">
                <Route className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 group hover:border-green-500/20 transition-all">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-tight">Resolution Efficiency</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">
                {total > 0 ? ((resolved / total) * 100).toFixed(0) : 0}%
              </span>
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-lg flex items-center justify-center shadow-inner">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-0 lg:min-h-[600px] mb-6">
        
        {/* Left: Matrix (Table List) */}
        <div className="w-full lg:w-3/5 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[400px] lg:min-h-0 relative">
          
          {/* Advanced Filter Header */}
          <div className="px-5 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3 text-gray-900">
                <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shadow-lg">
                  <List className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-black uppercase tracking-tighter">Incident Queue</h2>
              </div>

              <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                {['All', 'Complaint', 'Query'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-4 py-1.5 text-[10px] font-black rounded transition-all uppercase tracking-widest ${typeFilter === t ? 'bg-red-600 text-white shadow-md z-10' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
               <div className="w-full sm:w-40">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block px-1">Category</label>
                  <div className="relative">
                    <select 
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="appearance-none bg-white border border-gray-200 text-gray-900 text-[11px] font-bold rounded-xl block w-full p-2.5 pr-8 outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 transition-all shadow-sm"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat === 'All' ? 'All' : cat.toUpperCase()}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
               </div>

               <div className="flex-1 min-w-[200px] flex gap-2">
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block px-1">From</label>
                    <div className="relative">
                       <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                       <input 
                         type="date"
                         value={startDate}
                         onChange={(e) => setStartDate(e.target.value)}
                         className="bg-white border border-gray-200 text-gray-900 text-[11px] font-bold rounded-xl block w-full pl-9 p-2.5 outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 transition-all shadow-sm"
                       />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block px-1">To</label>
                    <div className="relative">
                       <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                       <input 
                         type="date"
                         value={endDate}
                         onChange={(e) => setEndDate(e.target.value)}
                         className="bg-white border border-gray-200 text-gray-900 text-[11px] font-bold rounded-xl block w-full pl-9 p-2.5 outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 transition-all shadow-sm"
                       />
                    </div>
                  </div>
               </div>

               {(categoryFilter !== 'All' || startDate || endDate) && (
                 <button 
                   onClick={resetFilters}
                   className="mb-1 text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline transition-all flex items-center gap-1"
                 >
                   <X className="w-3 h-3" /> Clear
                 </button>
               )}
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
                {pagedComplaints.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-20 text-center">
                       <div className="flex flex-col items-center gap-4 opacity-30 grayscale">
                          <List className="w-16 h-16" />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">No incidents in range</span>
                       </div>
                    </td>
                  </tr>
                ) : (
                  pagedComplaints.map((c) => {
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
                              <span className="text-[9px] text-gray-400 font-mono">+{c.userId}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 uppercase text-[9px] font-black tracking-widest text-gray-400">
                          <span className={`px-2 py-0.5 rounded ${c.type === 'Query' ? 'bg-amber-50 text-amber-600 font-black' : 'bg-blue-50 text-blue-600 font-black'}`}>
                            {c.type === 'Query' ? 'QUERY' : 'CASE'}
                          </span>
                        </td>
                        <td className="p-4 text-[10px] text-gray-500 font-mono font-bold tracking-tighter">#{c.complaintId || c.id.substring(0, 8)}</td>
                        <td className="p-4 text-xs text-gray-600 truncate max-w-[150px]">
                          {c.type === 'Query' ? c.description : `${c.category === 'Other' ? (c.customCategory || 'Other') : c.category}: ${c.description}`}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-[9px] font-black rounded mx-auto flex items-center justify-center w-max min-w-[70px] uppercase tracking-widest transition-all ${c.status === 'Pending' ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-100' : 'bg-gray-100 text-gray-500 font-bold'}`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="p-4 text-[10px] text-gray-400 font-bold whitespace-nowrap">{timeDisplay}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between mt-auto">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Showing {Math.min(filteredComplaints.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredComplaints.length)} of {filteredComplaints.length}
              </span>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                   <button
                     disabled={currentPage === 1}
                     onClick={() => setCurrentPage(prev => prev - 1)}
                     className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-black hover:border-black disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                   >
                     <ChevronLeft className="w-4 h-4" />
                   </button>
                   
                   <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => {
                        // Simple sliding window for pagination if many pages
                        if (totalPages > 5 && Math.abs(currentPage - (i + 1)) > 2) return null;
                        return (
                          <button
                            key={i}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`w-8 h-8 text-[11px] font-black rounded-xl transition-all shadow-sm ${currentPage === i + 1 ? 'bg-black text-white scale-105' : 'bg-white text-gray-400 hover:bg-gray-100 border border-gray-100'}`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                   </div>

                   <button
                     disabled={currentPage === totalPages}
                     onClick={() => setCurrentPage(prev => prev + 1)}
                     className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-black hover:border-black disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm"
                   >
                     <ChevronRight className="w-4 h-4" />
                   </button>
                </div>
              )}
          </div>
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
