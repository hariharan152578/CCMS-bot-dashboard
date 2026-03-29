'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { Droplet, Zap, Route, Trash2, X } from 'lucide-react';
import dynamic from 'next/dynamic';
import ActionPanel from '@/components/ActionPanel';
import Image from 'next/image';

const MapViewer = dynamic(() => import('@/components/MapViewer'), { ssr: false });

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [botStates, setBotStates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('All');

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

    const botStateRef = ref(db, 'botState');
    const unsubBot = onValue(botStateRef, (snap) => {
      let states: any[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          states.push({ id: child.key, ...child.val() });
        });
      }
      states.sort((a, b) => (b.lastInteraction || 0) - (a.lastInteraction || 0));
      setBotStates(states.slice(0, 5)); // Just the last 5
    });

    return () => {
      unsubscribe();
      unsubBot();
    };
  }, []);

  const total = complaints.length;
  const pending = complaints.filter(c => c.status === 'Pending').length;
  const inProgress = complaints.filter(c => c.status === 'In Progress').length;
  const resolved = complaints.filter(c => c.status === 'Resolved').length;

  const filteredComplaints = complaints.filter(c => {
    if (typeFilter === 'All') return true;
    // Fallback to 'Complaint' if type is missing to ensure legacy/orphaned records show up
    return (c.type || 'Complaint') === typeFilter;
  });

  const selectedComplaint = filteredComplaints.find(c => c.id === selectedComplaintId) || null;

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Welcome & KPIs */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-gray-900 mb-4">
          Good Morning, Admin. <span className="font-normal text-gray-600">The city is currently reporting <span className="text-red-700 font-bold">[{total}]</span> active incidents.</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* ... existing KPI cards ... (Keeping them but adding a 5th element or context) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 relative overflow-hidden">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2">Total Incidents</h3>
            <div className="flex items-end justify-between">
               <span className="text-4xl font-extrabold text-gray-900">{total}</span>
               <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                  <Droplet className="w-5 h-5" />
               </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">Big White Number | <span className="text-green-600">+5%</span> vs yesterday</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 relative overflow-hidden outline outline-2 outline-gray-200">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2">Pending (Needs Review)</h3>
            <div className="flex items-end justify-between">
               <span className="text-4xl font-extrabold text-gray-900 relative">
                  <span className="absolute -inset-2 border-2 border-red-500 rounded-full opacity-30"></span>
                  <span className="absolute -inset-1 border-2 border-red-600 rounded-full"></span>
                  {pending}
               </span>
               <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5" />
               </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium"><span className="text-red-600">+3 New</span></p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 relative overflow-hidden">
            <h3 className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-2">Active (In Progress)</h3>
            <div className="flex items-end justify-between">
               <span className="text-4xl font-extrabold text-gray-900">{inProgress}</span>
               <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                  <Route className="w-5 h-5" />
               </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 font-medium">Number | -2 Resolve time vs target</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 relative overflow-hidden bg-gray-50/50">
            <h3 className="text-xs font-bold tracking-wider text-gray-800 uppercase mb-2 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span> Live Bot Feed
            </h3>
            <div className="space-y-2 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
              {botStates.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic">Waiting for interactions...</p>
              ) : (
                botStates.map((s, i) => (
                  <div key={i} className="flex flex-col gap-1 bg-white p-2 rounded border border-gray-100 shadow-sm animate-in slide-in-from-right-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-gray-500">+{s.id.substring(0,8)}...</span>
                      <span className="font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase tracking-tighter">{s.currentStep}</span>
                    </div>
                    <p className="text-[10px] text-gray-600 italic truncate border-t border-gray-50 pt-1">
                      "{s.lastMessage || '...'}"
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Master-Detail Area */}
      <div className="flex-1 flex gap-4 min-h-[600px] overflow-hidden">
        
        {/* Left: Matrix (Table List) */}
        <div className="w-3/5 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
             <div>
               <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  📋 The Live Complaint Matrix
               </h2>
               <p className="text-xs text-red-600 font-bold mt-1 uppercase flex items-center gap-1">
                 <span className="w-2 h-2 rounded-full bg-red-600"></span> ACTIVE QUEUE
               </p>
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
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="text-xs font-bold text-gray-500 border-b border-gray-200">
                  <th className="p-4 font-bold">Citizen</th>
                  <th className="p-4 font-bold">Type</th>
                  <th className="p-4 font-bold">ID</th>
                  <th className="p-4 font-bold">Summary</th>
                  <th className="p-4 font-bold">Status</th>
                  <th className="p-4 font-bold">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredComplaints.map((c) => {
                  const isSelected = selectedComplaintId === c.id;
                  // time ago approx
                  const minsAgo = Math.max(1, Math.floor((Date.now() - (c.createdAt || Date.now())) / 60000));
                  const timeDisplay = minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo/60)}h ago`;
                  
                  return (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedComplaintId(c.id)}
                      className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-red-50/50 border-l-4 border-l-red-600 font-medium' : 'border-l-4 border-l-transparent'}`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                            <img src={`https://ui-avatars.com/api/?name=${c.user?.name || 'Citizen'}&background=random`} alt="avatar" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-800 font-bold">{c.user?.name || 'Citizen'}</span>
                            <span className="text-[10px] text-gray-400 font-mono tracking-tighter">+{c.userId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                         <span className={`px-2 py-0.5 text-[9px] font-bold rounded ring-1 ${c.type === 'Query' ? 'bg-amber-50 text-amber-600 ring-amber-200' : 'bg-blue-50 text-blue-600 ring-blue-200'}`}>
                            {c.type?.toUpperCase() || 'COMPLAINT'}
                         </span>
                      </td>
                      <td className="p-3 text-xs text-gray-700 font-mono">{c.complaintId || c.id.substring(0,8)}</td>
                      <td className="p-3 text-xs text-gray-700 truncate max-w-[200px]">
                         {c.type === 'Query' ? c.description : `${c.category}: ${c.description}`}
                      </td>
                      <td className="p-3">
                         <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md bg-gray-100 ${c.status === 'Pending' ? 'text-red-600' : 'text-gray-600'} flex items-center gap-1 w-max`}>
                           <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'Pending' ? 'bg-red-600' : 'bg-gray-500'}`}></span>
                           {c.status.toUpperCase()}
                         </span>
                      </td>
                      <td className="p-3 text-[10px] text-gray-400 whitespace-nowrap">{timeDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detailed Panel */}
        {selectedComplaint ? (
          <div className="w-2/5 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center shrink-0">
               <h2 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  {selectedComplaint.type === 'Query' ? '❓ General Query' : '📢 Complaint ID'}: {selectedComplaint.complaintId || selectedComplaint.id.substring(0,8)}
               </h2>
               <div className="flex items-center gap-3">
                  <X className="w-4 h-4 text-gray-400 cursor-pointer hover:text-red-600" onClick={() => setSelectedComplaintId(null)} />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
               
               {/* Top info and Map Row */}
               <div className="flex gap-4 mb-6">
                 <div className="flex-1 text-xs text-gray-700 space-y-2">
                   <p><strong className="text-gray-900 block border-b border-gray-100 pb-1 mb-1">Citizen & Session Info</strong></p>
                   <div className="grid grid-cols-2 gap-2">
                     <div>
                        <span className="text-gray-400 block tracking-tight uppercase font-bold text-[9px]">Name</span>
                        <span className="font-bold">{selectedComplaint.user?.name || 'Citizen'}</span>
                     </div>
                     <div>
                        <span className="text-gray-400 block tracking-tight uppercase font-bold text-[9px]">Contact</span>
                        <span className="font-bold">+{selectedComplaint.userId}</span>
                     </div>
                   </div>
                   {selectedComplaint.type !== 'Query' && (
                     <div className="mt-3">
                        <span className="text-gray-400 block tracking-tight uppercase font-bold text-[9px]">Category / Priority</span>
                        <span className="font-bold text-blue-600">{selectedComplaint.category}</span> | <span className="font-bold text-red-600">{selectedComplaint.priority}</span>
                     </div>
                   )}
                 </div>
                 {selectedComplaint.location && (
                   <div className="w-40 h-28 bg-gray-100 rounded border cursor-pointer border-gray-200 relative overflow-hidden shrink-0">
                      <MapViewer 
                        lat={parseFloat(selectedComplaint.location?.lat || '0')} 
                        lng={parseFloat(selectedComplaint.location?.lng || '0')} 
                        address={selectedComplaint.location?.address || ''} 
                      />
                   </div>
                 )}
               </div>

               {/* Narrative */}
               <div className="mb-6">
                  <strong className="text-gray-900 block mb-2 text-sm">Narrative</strong>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 leading-relaxed min-h-[80px]">
                    {selectedComplaint.description || "No specific narrative provided."}
                  </p>
               </div>

               {/* Visual Evidence */}
               <div className="mb-6">
                  <strong className="text-gray-900 block mb-2 text-sm">Visual Evidence (Cloudinary)</strong>
                  <div className="flex gap-2 flex-wrap">
                    {selectedComplaint.media && selectedComplaint.media.length > 0 ? (
                      selectedComplaint.media.map((url: string, idx: number) => (
                        <a key={idx} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="evidence" className="w-20 h-20 object-cover rounded shadow-sm border border-gray-200 hover:opacity-80 transition" />
                        </a>
                      ))
                    ) : (
                       <div className="w-20 h-20 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 text-center px-2">No Media</div>
                    )}
                  </div>
               </div>

               {/* Standard Action Panel Component adapted for Master/Detail */}
               <div>
                  <strong className="text-gray-900 block mb-3 text-sm">Management Panel (Actions)</strong>
                  <ActionPanel 
                     complaintId={selectedComplaint.id} 
                     currentStatus={selectedComplaint.status} 
                     currentPriority={selectedComplaint.priority}
                  />
               </div>
            </div>
          </div>
        ) : (
          <div className="w-2/5 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
             <p>Select a complaint from the matrix to view details.</p>
          </div>
        )}
      </div>
    </div>
  );
}
