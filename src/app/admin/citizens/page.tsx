'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { Users, Search, MoreHorizontal, X, MapPin, Mail, Phone } from 'lucide-react';

export default function CitizensPage() {
  const [citizens, setCitizens] = useState<any[]>([]);
  const [complaintsByUser, setComplaintsByUser] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCitizen, setSelectedCitizen] = useState<any | null>(null);

  useEffect(() => {
    // We aggregate unique citizens from users node and count their complaints
    const fetchCitizens = async () => {
      onValue(ref(db, 'users'), async (usersSnap) => {
        let userList: any[] = [];
        if (usersSnap.exists()) {
           usersSnap.forEach(snap => {
             userList.push({ phone: snap.key, ...snap.val() });
           });
        }
        
        // Also get complaints to map to users
        const compsSnap = await get(ref(db, 'complaints'));
        let cpMap: Record<string, any[]> = {};
        
        if (compsSnap.exists()) {
           compsSnap.forEach(child => {
              const c = { id: child.key, ...child.val() };
              if (c.userId) {
                 if (!cpMap[c.userId]) cpMap[c.userId] = [];
                 cpMap[c.userId].push(c);
              }
           });
        }
        
        setComplaintsByUser(cpMap);
        setCitizens(userList);
        setLoading(false);
      });
    };
    fetchCitizens();
  }, []);

  return (
    <div className="flex flex-col h-full space-y-4 relative">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
           <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-500" /> Citizen Directory <span className="text-gray-400 font-normal">(Public Grievance Profiles)</span>
           </h2>
           <button className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm">
             Create Report
           </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex">
           <div className="relative w-96">
             <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input type="text" placeholder="Search citizens by name or ID..." className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm outline-none focus:border-red-500 bg-white" />
           </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 bg-gray-50 shadow-sm z-10">
              <tr className="text-xs font-bold text-gray-500 border-b border-gray-200">
                <th className="p-4 pl-6 uppercase tracking-wider">Records</th>
                <th className="p-4 uppercase tracking-wider">Phone</th>
                <th className="p-4 uppercase tracking-wider">Total Complaints</th>
                <th className="p-4 uppercase tracking-wider">Address Summary</th>
                <th className="p-4 text-right pr-6 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading directory...</td></tr>
              ) : citizens.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">No citizens found.</td></tr>
              ) : (
                citizens.map((cz) => {
                  const comps = complaintsByUser[cz.phone] || [];
                  // Find the most recent address
                  const recentAddress = comps.length > 0 && comps[0].location?.address 
                      ? comps[0].location.address 
                      : 'Unknown Location';

                  return (
                    <tr 
                      key={cz.phone} 
                      className="border-b border-gray-100 hover:bg-red-50/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedCitizen({ ...cz, address: recentAddress, complaints: comps })}
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <img 
                            src={`https://ui-avatars.com/api/?name=${cz.name || 'Citizen'}&background=random`} 
                            alt="avatar" 
                            className="w-10 h-10 rounded-full bg-gray-200 border border-gray-100" 
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900">{cz.name || 'Citizen Name'}</span>
                            <span className="text-xs text-gray-500 font-mono">{cz.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-mono text-gray-600">{cz.phone}</td>
                      <td className="p-4 text-sm font-bold text-gray-800">
                         {comps.length} {comps.length === 1 ? 'Report' : 'Reports'}
                      </td>
                      <td className="p-4 text-sm text-gray-600 truncate max-w-[250px]">{recentAddress}</td>
                      <td className="p-4 text-right pr-6 text-gray-400">
                         <MoreHorizontal className="w-5 h-5 inline-block cursor-pointer hover:text-gray-800" />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Citizen Profile Modal (matching mockup) */}
      {selectedCitizen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedCitizen(null)}></div>
          <div className="bg-white rounded-xl shadow-2xl z-10 w-[600px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             
             {/* Modal Header */}
             <div className="p-6 border-b border-gray-100 relative">
               <button onClick={() => setSelectedCitizen(null)} className="absolute top-4 right-4 p-2 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-full transition-colors">
                 <X className="w-5 h-5" />
               </button>
               <div className="flex items-center gap-5">
                 <img src={`https://ui-avatars.com/api/?name=${selectedCitizen.name || 'C'}&size=128&background=random`} className="w-20 h-20 rounded-full border-4 border-white shadow-md" alt="profile"/>
                 <div>
                   <h2 className="text-2xl font-bold text-gray-900">{selectedCitizen.name || 'Citizen Profile'}</h2>
                   <div className="text-gray-500 font-mono flex items-center gap-2 text-sm mt-1">
                     <Mail className="w-4 h-4"/> citizen@chennai.gov.in
                   </div>
                 </div>
               </div>
             </div>

             {/* Modal Body */}
             <div className="p-6 bg-gray-50/50 flex flex-col gap-6">
                
                <div className="grid grid-cols-2 gap-8">
                  {/* Complaint History */}
                  <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-3">Complaint History</h3>
                    <div className="space-y-3">
                      {selectedCitizen.complaints?.slice(0, 3).map((cp: any, i: number) => (
                        <div key={i} className="bg-white p-3 rounded border border-gray-200 shadow-sm border-l-2 border-l-red-500">
                          <p className="text-xs font-bold text-gray-800">{cp.complaintId || cp.id.substring(1,8)}</p>
                          <p className="text-[10px] text-gray-500 truncate">{cp.location?.address}</p>
                        </div>
                      ))}
                      {(!selectedCitizen.complaints || selectedCitizen.complaints.length === 0) && (
                         <div className="text-sm text-gray-400 italic">No historical records</div>
                      )}
                    </div>
                  </div>

                  {/* Address & Contact */}
                  <div className="space-y-6">
                     <div>
                       <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-1"><MapPin className="w-3.5 h-3.5"/> Primary Address</h3>
                       <p className="text-sm text-gray-800 font-medium">{selectedCitizen.address}</p>
                       <p className="text-xs text-gray-500 mt-1">Address: Velachery, Chennai</p>
                     </div>
                     <div>
                       <h3 className="text-xs font-bold uppercase text-gray-500 mb-3 flex items-center gap-1"><Phone className="w-3.5 h-3.5"/> Contact</h3>
                       <p className="text-sm text-gray-800 font-mono">{selectedCitizen.phone}</p>
                       <p className="text-sm text-gray-500 font-mono mt-1">+91 XXXXX XXXX</p>
                     </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2.5 rounded shadow text-sm transition-colors uppercase tracking-wide">
                    Create Report
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
