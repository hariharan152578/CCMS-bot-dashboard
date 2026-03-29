'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { Droplet, Route, Trash2, Calendar, ChevronDown, List as ListIcon } from 'lucide-react';

export default function ComplaintQueuePage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
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
    });

    return () => unsubscribe();
  }, []);

  const filteredComplaints = complaints.filter(c => {
    if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (typeFilter !== 'All' && (c.type || 'Complaint') !== typeFilter) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        
        {/* Header & Filters */}
        <div className="px-6 py-5 border-b border-gray-200 bg-white sticky top-0 z-20">
           <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
              <ListIcon className="w-5 h-5 text-gray-500" /> The Live Complaint Queue <span className="text-gray-400 font-normal">(Full List)</span>
           </h2>
           
           {/* Filters Row */}
           <div className="flex items-end gap-6 flex-wrap">
             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1.5">Category</label>
               <div className="relative">
                 <select 
                   value={categoryFilter}
                   onChange={(e) => setCategoryFilter(e.target.value)}
                   className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-red-500 focus:border-red-500 block w-48 p-2 pr-8 outline-none"
                 >
                   <option value="All">All Categories</option>
                   <option value="Water">Water</option>
                   <option value="Road">Road</option>
                   <option value="Electricity">Electricity</option>
                   <option value="Garbage">Garbage</option>
                 </select>
                 <ChevronDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>
             </div>

             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1.5">Status</label>
               <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
                 {['All', 'Pending', 'In Progress', 'Resolved'].map(s => (
                   <button 
                     key={s}
                     onClick={() => setStatusFilter(s)}
                     className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${statusFilter === s ? 'bg-white shadow-sm text-red-600' : 'text-gray-600 hover:text-gray-900'}`}
                   >
                     {s}
                   </button>
                 ))}
               </div>
             </div>

             <div>
               <label className="block text-xs font-bold text-gray-700 mb-1.5">Date Range</label>
               <div className="relative">
                 <div className="flex items-center bg-white border border-gray-300 text-gray-700 text-sm rounded-lg p-2 w-56 cursor-pointer">
                   <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                   <span>Date - Range</span>
                   <ChevronDown className="w-4 h-4 text-gray-500 ml-auto" />
                 </div>
               </div>
             </div>
           </div>
        </div>
        
        {/* Table Body */}
        <div className="flex-1 overflow-auto bg-gray-50/30">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-50 shadow-sm z-10">
              <tr className="text-xs font-bold text-gray-500 border-b border-gray-200 uppercase tracking-widest bg-gray-50/50">
                <th className="p-4 pl-6 font-bold">Citizen</th>
                <th className="p-4 font-bold">Type</th>
                <th className="p-4 font-bold">Ref ID</th>
                <th className="p-4 font-bold">Category</th>
                <th className="p-4 font-bold">Priority</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right pr-6">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                 <tr>
                   <td colSpan={7} className="p-8 text-center text-gray-500">Loading live data...</td>
                 </tr>
              ) : filteredComplaints.length === 0 ? (
                 <tr>
                   <td colSpan={7} className="p-8 text-center text-gray-500">No complaints found.</td>
                 </tr>
              ) : (
                filteredComplaints.map((c) => {
                  return (
                    <tr 
                      key={c.id} 
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors group relative"
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3 relative">
                          <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border-2 border-white shadow-sm ring-1 ring-gray-100">
                            <img src={`https://ui-avatars.com/api/?name=${c.user?.name || 'Citizen'}&background=random`} alt="avatar" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-red-700 transition-colors tracking-tight">{c.user?.name || 'Citizen'}</span>
                            <span className="text-[10px] text-gray-400 font-mono">+{c.userId}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${c.type === 'Query' ? 'bg-amber-100 text-amber-700 font-black' : 'bg-blue-100 text-blue-700 font-black'}`}>
                            {c.type === 'Query' ? 'QUERY' : 'CASE'}
                         </span>
                      </td>
                      <td className="p-4 text-xs text-gray-600 font-mono font-bold tracking-tighter">#{c.complaintId || c.id.substring(0,8)}</td>
                      <td className="p-4 text-sm text-gray-700">
                        <div className="flex items-center gap-1.5 font-medium">
                           {c.type === 'Query' ? (
                             <span className="text-gray-400 italic">N/A (General)</span>
                           ) : (
                             <>
                               {c.category === 'Water' && <Droplet className="w-4 h-4 text-blue-500" />}
                               {c.category === 'Road' && <Route className="w-4 h-4 text-gray-500" />}
                               {c.category === 'Garbage' && <Trash2 className="w-4 h-4 text-amber-500" />}
                               <span>{c.category === 'Other' ? c.customCategory : c.category}</span>
                             </>
                           )}
                        </div>
                      </td>
                      <td className="p-4 text-sm">
                        <span className="flex items-center font-bold gap-1.5 text-gray-700">
                           <span className={`text-lg leading-none ${c.priority === 'High' ? 'text-red-600' : c.priority === 'Medium' ? 'text-amber-500' : 'text-blue-500'}`}>⚑</span> 
                           {c.priority || 'Medium'}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-gray-700 truncate max-w-[150px]">
                        {c.location?.address ? c.location.address.split(',')[0] : 'Velachery'}
                      </td>
                      <td className="p-4">
                         <span className={`px-2.5 py-1 text-[10px] font-black rounded flex items-center gap-1.5 w-max 
                           ${c.status === 'Pending' ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 
                             c.status === 'In Progress' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' : 
                             'bg-green-50 text-green-700 ring-1 ring-green-200'}`}
                         >
                           <span className={`w-1.5 h-1.5 rounded-full 
                             ${c.status === 'Pending' ? 'bg-red-600' : 
                               c.status === 'In Progress' ? 'bg-amber-500' : 
                               'bg-green-600'}`}>
                           </span>
                           {c.status.toUpperCase()}
                         </span>
                      </td>
                      <td className="p-4 text-right pr-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                         {new Date(c.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination mock */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center text-sm text-gray-500">
             <span>Showing {filteredComplaints.length} records</span>
             <div className="flex gap-2">
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Previous</button>
                <button className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50">Next</button>
             </div>
        </div>

      </div>
    </div>
  );
}
