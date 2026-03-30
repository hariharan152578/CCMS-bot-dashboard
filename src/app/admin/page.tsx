'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { Droplet, Zap, Route, Trash2, X, CheckCircle, ExternalLink, List } from 'lucide-react';
import dynamic from 'next/dynamic';
import ActionPanel from '@/components/ActionPanel';
import Image from 'next/image';

const MapViewer = dynamic(() => import('@/components/MapViewer'), { ssr: false });

export default function AdminDashboard() {
  const [complaints, setComplaints] = useState<any[]>([]);
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

    return () => {
      unsubscribe();
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
    <div className="flex flex-col h-full space-y-6">

      {/* Welcome & KPIs */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          Dashboard Overview <span className="text-xs font-normal text-gray-500 uppercase tracking-widest">— {total} Active Incidents</span>
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Incidents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-tight">Total Incidents</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900">{total}</span>
              <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center">
                <Droplet className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-red-500 uppercase mb-2 tracking-tight">Pending Review</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-red-600">{pending}</span>
              <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-tight">In Progress</h3>
            <div className="flex items-end justify-between">
              <span className="text-4xl font-bold text-gray-900">{inProgress}</span>
              <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center">
                <Route className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Efficiency */}
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

      {/* Main Master-Detail Area */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-0 lg:min-h-[600px] mb-6">

        {/* Left: Matrix (Table List) */}
        <div className="w-full lg:w-3/5 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[400px] lg:min-h-0">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center sm:flex-row flex-col gap-2">
            <div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center">
                <List className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900 tracking-tight">Incident Queue</h2>
              </div>
            </div>
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
                  const timeDisplay = minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo / 60)}h ago`;
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedComplaintId(c.id)}
                      className={`cursor-pointer border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-red-50/50 border-l-4 border-l-red-600' : 'border-l-4 border-l-transparent'}`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                            <img src={`https://ui-avatars.com/api/?name=${c.user?.name || 'Citizen'}&background=random`} alt="avatar" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm text-gray-900 font-bold tracking-tight">{c.user?.name || 'Citizen'}</span>
                            <span className="text-[10px] text-gray-400 font-mono">+{c.userId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${c.type === 'Query' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                          {c.type?.toUpperCase() || 'COMPLAINT'}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-gray-500 font-mono tracking-tight">{c.complaintId || c.id.substring(0, 8)}</td>
                      <td className="p-4 text-xs text-gray-600 truncate max-w-[180px]">
                        {c.type === 'Query' ? c.description : `${c.category === 'Other' ? (c.customCategory || 'Other') : c.category}: ${c.description}`}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${c.status === 'Pending' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'} flex items-center justify-center w-max min-w-[80px]`}>
                          {c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] text-gray-400 font-medium whitespace-nowrap">{timeDisplay}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Detailed Panel */}
        {selectedComplaint ? (
          <div className="w-full lg:w-2/5 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-[500px] lg:min-h-0">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <h2 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${selectedComplaint.type === 'Query' ? 'bg-amber-500' : 'bg-red-600'}`}></span>
                Incident {selectedComplaint.complaintId || selectedComplaint.id.substring(0, 8)}
              </h2>
              <div className="flex items-center gap-3">
                <X className="w-4 h-4 text-gray-400 cursor-pointer hover:text-red-600" onClick={() => setSelectedComplaintId(null)} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* Top info and Map Row */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 text-xs text-gray-700 space-y-4">
                  <div className="grid grid-cols-1 gap-2">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wider mb-0.5">Citizen Identity</span>
                        <span className="font-bold text-gray-900">{selectedComplaint.user?.name || 'Citizen'}</span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wider mb-0.5">Contact Link</span>
                        <span className="font-bold text-red-600">+{selectedComplaint.userId}</span>
                      </div>
                  </div>
                  
                  {selectedComplaint.type !== 'Query' && (
                    <div className="bg-white p-3 rounded-lg border border-gray-100">
                      <span className="text-gray-400 block font-bold text-[9px] uppercase tracking-wider mb-1">Information</span>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-gray-900">{selectedComplaint.category === 'Other' ? (selectedComplaint.customCategory || 'Other') : selectedComplaint.category}</span>
                        <span className="text-[9px] font-bold text-red-600 uppercase tracking-widest">{selectedComplaint.priority} Priority</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedComplaint.location && (
                  <div className="w-full sm:w-1/2 lg:w-40 h-40 overflow-hidden rounded-xl border border-gray-200 relative shrink-0">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${selectedComplaint.location.lat},${selectedComplaint.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full h-full"
                      title="Open in Google Maps"
                    >
                      <MapViewer
                        lat={parseFloat(selectedComplaint.location?.lat || '0')}
                        lng={parseFloat(selectedComplaint.location?.lng || '0')}
                        address={selectedComplaint.location?.address || ''}
                        showPopup={false}
                      />
                    </a>
                  </div>
                )}
              </div>

              {/* Narrative */}
              <div className="mb-6">
                <strong className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Narrative</strong>
                <p className="text-sm text-gray-800 bg-gray-50 p-4 rounded-lg border border-gray-100 leading-relaxed font-medium">
                  {selectedComplaint.description || "No specific narrative provided."}
                </p>
              </div>

              {/* Visual Evidence */}
              <div className="mb-6">
                <strong className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Visual Evidence</strong>
                <div className="grid grid-cols-4 gap-2">
                  {selectedComplaint.media && selectedComplaint.media.length > 0 ? (
                    selectedComplaint.media.map((url: string, idx: number) => (
                      <a key={idx} href={url} target="_blank" rel="noreferrer" className="aspect-square relative overflow-hidden rounded-lg border border-gray-100">
                        <img src={url} alt="evidence" className="absolute inset-0 w-full h-full object-cover" />
                      </a>
                    ))
                  ) : (
                    <div className="aspect-square bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center text-[9px] font-bold text-gray-400 uppercase">No Media</div>
                  )}
                </div>
              </div>

              {/* Management */}
              <div className="pt-4 border-t border-gray-100">
                <strong className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">Management Actions</strong>
                <ActionPanel
                  complaintId={selectedComplaint.id}
                  currentStatus={selectedComplaint.status}
                  currentPriority={selectedComplaint.priority}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full lg:w-2/5 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 min-h-[300px] lg:min-h-0 p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-widest">Select an incident to view details</p>
          </div>
        )}
      </div>
    </div>
  );
}
