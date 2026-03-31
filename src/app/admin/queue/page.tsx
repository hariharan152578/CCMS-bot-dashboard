'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { Droplet, Route, Trash2, Zap, Calendar, ChevronDown, List as ListIcon, X } from 'lucide-react';

export default function ComplaintQueuePage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  // Derive unique categories dynamically
  const categories = ['All', ...Array.from(new Set(complaints.filter(c => c.category).map(c => c.category)))].sort();

  const filteredComplaints = complaints.filter(c => {
    if (categoryFilter !== 'All' && c.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && c.status !== statusFilter) return false;
    if (typeFilter !== 'All' && (c.type || 'Complaint') !== typeFilter) return false;
    
    if (startDate || endDate) {
      const createdTime = c.createdAt || 0;
      if (startDate) {
        const start = new Date(startDate).setHours(0, 0, 0, 0);
        if (createdTime < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate).setHours(23, 59, 59, 999);
        if (createdTime > end) return false;
      }
    }
    
    return true;
  });

  const resetFilters = () => {
    setCategoryFilter('All');
    setStatusFilter('All');
    setTypeFilter('All');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        
        {/* Header & Filters */}
        <div className="px-4 sm:px-6 py-5 border-b border-gray-200 bg-white sticky top-0 z-20">
           <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                 <ListIcon className="w-5 h-5 text-gray-400" /> The Live Complaint Queue
                 <span className="text-gray-400 font-normal text-sm hidden sm:inline">(Full Municipal List)</span>
              </h2>
              
              <button 
                onClick={resetFilters}
                className="text-[10px] font-bold text-red-600 hover:text-red-700 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
              >
                <X className="w-3 h-3" /> Reset All Filters
              </button>
           </div>
           
           {/* Filters Grid */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-end gap-4 sm:gap-6">
             {/* Category Filter */}
             <div className="w-full lg:w-48">
               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
               <div className="relative">
                 <select 
                   value={categoryFilter}
                   onChange={(e) => setCategoryFilter(e.target.value)}
                   className="appearance-none bg-gray-50/50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 block w-full p-2.5 pr-8 outline-none transition-all font-bold"
                 >
                   {categories.map(cat => (
                     <option key={cat} value={cat}>{cat === 'All' ? 'All Categories' : cat}</option>
                   ))}
                 </select>
                 <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
               </div>
             </div>

             {/* Status Filter */}
             <div className="w-full lg:w-auto">
               <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Status Filter</label>
               <div className="flex bg-gray-100/80 rounded-lg p-1 border border-gray-200 overflow-x-auto custom-scrollbar no-scrollbar gap-1">
                 {['All', 'Pending', 'In Progress', 'Resolved'].map(s => (
                   <button 
                     key={s}
                     onClick={() => setStatusFilter(s)}
                     className={`px-4 py-1.5 text-[11px] font-bold rounded flex-shrink-0 transition-all uppercase tracking-tighter ${statusFilter === s ? 'bg-white shadow-sm text-red-600' : 'text-gray-400 hover:text-gray-700'}`}
                   >
                     {s}
                   </button>
                 ))}
               </div>
             </div>

             {/* Date Range Filter */}
             <div className="w-full lg:flex-1 grid grid-cols-2 gap-3">
               <div>
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">From Date</label>
                 <div className="relative">
                   <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                   <input 
                     type="date"
                     value={startDate}
                     onChange={(e) => setStartDate(e.target.value)}
                     className="bg-gray-50/50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 block w-full pl-9 p-2.5 outline-none transition-all cursor-pointer"
                   />
                 </div>
               </div>
               <div>
                 <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">To Date</label>
                 <div className="relative">
                   <Calendar className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                   <input 
                     type="date"
                     value={endDate}
                     onChange={(e) => setEndDate(e.target.value)}
                     className="bg-gray-50/50 border border-gray-200 text-gray-700 text-[11px] font-bold rounded-lg focus:ring-2 focus:ring-red-500/20 focus:border-red-500 block w-full pl-9 p-2.5 outline-none transition-all cursor-pointer"
                   />
                 </div>
               </div>
             </div>
           </div>
        </div>
        
        {/* Responsive Table Wrapper */}
        <div className="flex-1 overflow-x-auto bg-gray-50/30 custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
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
                   <td colSpan={7} className="p-12 text-center">
                     <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading live data...</span>
                     </div>
                   </td>
                 </tr>
              ) : filteredComplaints.length === 0 ? (
                 <tr>
                   <td colSpan={7} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4 text-gray-400 opacity-50">
                        <ListIcon className="w-12 h-12" />
                        <div>
                          <p className="text-sm font-bold uppercase tracking-widest leading-none">No records match criteria</p>
                          <p className="text-[10px] font-bold uppercase mt-2">Try adjusting your filters or date range</p>
                        </div>
                        <button 
                          onClick={resetFilters}
                          className="mt-2 text-[10px] font-bold text-red-600 underline uppercase tracking-widest"
                        >
                          Clear all filters
                        </button>
                      </div>
                   </td>
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
                               {c.category?.includes('Water') && <Droplet className="w-4 h-4 text-blue-500" />}
                               {c.category?.includes('Road') && <Route className="w-4 h-4 text-gray-500" />}
                               {c.category?.includes('Garbage') && <Trash2 className="w-4 h-4 text-amber-500" />}
                               {c.category?.includes('Electricity') && <Zap className="w-4 h-4 text-yellow-500" />}
                               <span className="font-bold">{c.category === 'Other' ? (c.customCategory || 'Other') : c.category}</span>
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
        
        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-white flex justify-between items-center text-sm text-gray-500">
             <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Total Records: {filteredComplaints.length}</span>
             <div className="flex gap-2">
                <button className="px-4 py-1.5 text-[10px] font-bold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-all uppercase tracking-widest">Previous</button>
                <button className="px-4 py-1.5 text-[10px] font-bold border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none transition-all uppercase tracking-widest">Next</button>
             </div>
        </div>

      </div>
    </div>
  );
}
