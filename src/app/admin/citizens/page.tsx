'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, get } from 'firebase/database';
import { Users, Search, MoreHorizontal, X, MapPin, Mail, Phone, Calendar, Send, MessageCircle } from 'lucide-react';

export default function CitizensPage() {
  const [citizens, setCitizens] = useState<any[]>([]);
  const [complaintsByUser, setComplaintsByUser] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedCitizen, setSelectedCitizen] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [sending, setSending] = useState(false);

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
              const userId = c.userId;
              if (userId) {
                 // ✅ Standardize to 10-digit normalization for mapping
                 const normUserId = userId.length >= 10 ? userId.slice(-10) : userId;
                 if (!cpMap[normUserId]) cpMap[normUserId] = [];
                 cpMap[normUserId].push(c);
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

  // ✅ REAL-TIME CHAT LISTENER
  useEffect(() => {
    if (!isChatOpen || !selectedCitizen) return;
    
    // Normalize phone to 10 digits for consistent lookup
    const phoneKey = selectedCitizen.phone.length >= 10 ? selectedCitizen.phone.slice(-10) : selectedCitizen.phone;
    const chatRef = ref(db, `chats/${phoneKey}/messages`);
    
    const unsubscribe = onValue(chatRef, (snap) => {
      const msgs: any[] = [];
      if (snap.exists()) {
        snap.forEach(child => {
          msgs.push({ id: child.key, ...child.val() });
        });
      }
      msgs.sort((a,b) => (a.timestamp || 0) - (b.timestamp || 0));
      setChatHistory(msgs);
    });
    return () => unsubscribe();
  }, [isChatOpen, selectedCitizen]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !selectedCitizen || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selectedCitizen.phone, message: chatMessage })
      });
      if (res.ok) setChatMessage('');
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const filteredCitizens = citizens.filter(cz => {
    const searchString = searchTerm.toLowerCase();
    return (
      (cz.name || 'Citizen').toLowerCase().includes(searchString) ||
      cz.phone.includes(searchString)
    );
  });

  return (
    <div className="flex flex-col h-full space-y-4 relative">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col flex-1 overflow-hidden">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
           <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2 tracking-tight">
                 <Users className="w-5 h-5 text-gray-800" /> Citizen Directory
              </h2>
              <p className="text-[10px] font-normal text-gray-500 uppercase tracking-widest mt-1">
                 {citizens.length} Registered Profiles • Public Grievance Registry
              </p>
           </div>
           <button className="w-full md:w-auto bg-gray-900 hover:bg-red-600 text-white text-xs font-bold px-5 py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2">
             Export Registry
           </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b border-gray-100 bg-white">
           <div className="relative w-full md:w-96">
             <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input 
               type="text" 
               placeholder="Search registry by name or ID..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pl-9 pr-4 py-2 w-full border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white transition-all" 
             />
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="text-[10px] font-bold text-gray-400 border-b border-gray-100 uppercase tracking-widest bg-gray-50/30">
                <th className="p-4 pl-6">Operator Identity</th>
                <th className="p-4">Contact Link</th>
                <th className="p-4">Interaction Load</th>
                <th className="p-4">Primary Jurisdiction</th>
                <th className="p-4 text-right pr-6">Access Control</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-400 font-bold uppercase text-[10px]">Synchronizing Cloud Data...</td></tr>
              ) : filteredCitizens.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-gray-500">No matching search results in the current cluster.</td></tr>
              ) : (
                filteredCitizens.map((cz) => {
                  const comps = complaintsByUser[cz.phone] || [];
                  return (
                    <tr 
                      key={cz.phone} 
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                      onClick={() => setSelectedCitizen({ ...cz, complaints: comps })}
                    >
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          <img 
                            src={`https://ui-avatars.com/api/?name=${cz.name || 'Citizen'}&background=random&color=fff`} 
                            className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-100" 
                            alt="avatar" 
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-900 group-hover:text-red-700 transition-colors tracking-tight">{cz.name || 'Citizen Profile'}</span>
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-tighter">WARD ID: {cz.ward || 'GLOBAL'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="text-sm font-mono text-gray-600 font-medium">+{cz.phone}</span>
                      </td>
                      <td className="p-4">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${comps.length > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-100 text-gray-500'}`}>
                            {comps.length} INCIDENTS
                         </span>
                      </td>
                      <td className="p-4 text-xs text-gray-500 truncate max-w-[200px]">{cz.address || 'Unknown'}</td>
                      <td className="p-4 text-right pr-6 space-x-3">
                         <button className="text-[10px] font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">Details</button>
                         <button className="text-[10px] font-bold text-red-600/50 hover:text-red-700 uppercase tracking-widest transition-colors">Alert</button>
                      </td>
                    </tr>
                   )
                 })
              )}
            </tbody>
          </table>
          </div>

          {/* Mobile Card View */}
          <div className="sm:hidden p-4 space-y-3">
            {loading ? (
              <div className="py-12 text-center text-gray-400 text-xs font-bold uppercase">Syncing...</div>
            ) : filteredCitizens.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-sm">No results found.</div>
            ) : (
              filteredCitizens.map((cz) => {
                const comps = complaintsByUser[cz.phone] || [];
                return (
                  <div 
                    key={cz.phone}
                    onClick={() => setSelectedCitizen({ ...cz, complaints: comps })}
                    className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm active:bg-gray-50"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <img src={`https://ui-avatars.com/api/?name=${cz.name || 'Citizen'}&background=random`} className="w-10 h-10 rounded-lg" alt="cz"/>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-gray-900 tracking-tight">{cz.name || 'Citizen'}</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">+{cz.phone}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${comps.length > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-100 text-gray-500'}`}>
                        {comps.length} REPORTS
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mb-3 border-t border-gray-50 pt-3">{cz.address || 'No address provided'}</p>
                    <button className="w-full bg-gray-50 hover:bg-gray-100 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-gray-500 transition-colors">Review Full Profile</button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Citizen Profile Modal */}
      {selectedCitizen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSelectedCitizen(null)}></div>
          <div className="bg-white rounded-2xl shadow-2xl z-10 w-[95%] max-w-2xl sm:w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             
             {/* Modal Header */}
             <div className="p-6 sm:p-8 border-b border-gray-100 relative bg-gray-50/50">
               <button onClick={() => setSelectedCitizen(null)} className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all">
                 <X className="w-5 h-5" />
               </button>
               <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 text-center sm:text-left">
                 <img src={`https://ui-avatars.com/api/?name=${selectedCitizen.name || 'C'}&size=128&background=random&color=fff`} className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white shadow-xl shadow-gray-200" alt="profile"/>
                 <div>
                   <h2 className="text-xl font-bold text-gray-900 tracking-tight">{selectedCitizen.name || 'Citizen Profile'}</h2>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Verified Platform Identity • Access Clear</p>
                   <div className="text-gray-500 font-mono flex items-center justify-center sm:justify-start gap-2 text-xs mt-3">
                     <Phone className="w-4 h-4 text-gray-400"/> +{selectedCitizen.phone}
                   </div>
                 </div>
               </div>
             </div>

             {/* Modal Body */}
             <div className="p-6 sm:p-8 flex flex-col gap-6 overflow-y-auto max-h-[60vh] custom-scrollbar">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-10">
                   {/* Left: Interaction Stats */}
                   <div className="space-y-6 text-left">
                      <div>
                        <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-3 flex items-center gap-2">Jurisdiction & Location</h3>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                           <p className="text-sm text-gray-900 font-bold leading-relaxed">{selectedCitizen.address || 'Unknown'}</p>
                           <p className="text-[10px] font-bold text-red-600 mt-2 uppercase tracking-tighter">PRIMARY WARD: {selectedCitizen.ward || 'GLOBAL'}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-white p-4 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Reports</span>
                            <span className="text-lg font-bold text-gray-900">{selectedCitizen.complaints?.length || 0}</span>
                         </div>
                         <div className="bg-white p-4 rounded-xl border border-gray-100">
                            <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Zip Code</span>
                            <span className="text-lg font-bold text-gray-900">{selectedCitizen.pincode || 'N/A'}</span>
                         </div>
                      </div>
                   </div>

                   {/* Right: History Feed */}
                   <div className="text-left">
                     <h3 className="text-[10px] font-bold uppercase text-gray-400 tracking-widest mb-3 flex items-center gap-2">Engagement History</h3>
                     <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                       {selectedCitizen.complaints?.length > 0 ? (
                         selectedCitizen.complaints.map((cp: any, i: number) => (
                           <div key={i} className="bg-white p-3 rounded-lg border border-gray-100 hover:border-red-100 transition-colors">
                              <div className="flex justify-between items-start mb-1">
                                 <p className="text-[10px] font-bold text-gray-900 uppercase tracking-tight">{cp.complaintId || cp.id.substring(1,8)}</p>
                                 <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${cp.status === 'Resolved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{cp.status.toUpperCase()}</span>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{cp.category}: {cp.description}</p>
                           </div>
                         ))
                       ) : (
                          <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">No Incident Data</p>
                          </div>
                       )}
                     </div>
                   </div>
                </div>

                 <div className="flex flex-col sm:flex-row justify-end pt-6 border-t border-gray-100 gap-3">
                   <button onClick={() => setSelectedCitizen(null)} className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">Discard</button>
                   <button 
                     onClick={() => setIsChatOpen(true)}
                     className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white font-bold px-8 py-2.5 rounded-lg text-xs transition-all uppercase tracking-widest"
                   >
                     Interrogate & Contact
                   </button>
                 </div>
              </div>
          </div>
        </div>
       )}

       {/* Contact Side Drawer */}
       <div 
         className={`fixed inset-y-0 right-0 z-[100] w-full sm:w-[420px] bg-white shadow-2xl transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col border-l border-gray-100 ${
           isChatOpen ? 'translate-x-0' : 'translate-x-full'
         }`}
       >
          <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
             <div>
               <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-6 h-6 text-red-600" /> WhatsApp Chat
               </h2>
                <p className="text-[9px] font-bold text-red-600 mt-1 uppercase tracking-widest">
                  Active Direct Link • +{selectedCitizen?.phone}
                </p>
             </div>
             <button 
               onClick={() => setIsChatOpen(false)}
               className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"
             >
                <X className="w-5 h-5" />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 custom-scrollbar flex flex-col">
             {chatHistory.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center opacity-30 py-20 text-center">
                  <MessageCircle className="w-12 h-12 mb-4 text-gray-300" />
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400">No active conversation history</p>
               </div>
             ) : (
               chatHistory.map((m, i) => (
                 <div key={m.id || i} className={`flex ${m.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm border ${
                      m.sender === 'admin' 
                        ? 'bg-black text-white border-black rounded-tr-none' 
                        : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'
                    }`}>
                       <p className="text-sm leading-relaxed">{m.text}</p>
                       <p className={`text-[9px] mt-2 font-bold uppercase tracking-tighter text-gray-400`}>
                         {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                    </div>
                 </div>
               ))
             )}
          </div>

          <div className="p-6 border-t border-gray-100 bg-white">
             <div className="relative">
                <textarea 
                  rows={3}
                  placeholder="Compose WhatsApp message..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  className="w-full p-4 pr-12 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-500 bg-gray-50/50 transition-all resize-none font-medium"
                />
                <button 
                  disabled={sending || !chatMessage.trim()}
                  onClick={handleSendMessage}
                  className={`absolute bottom-4 right-4 p-2 rounded-xl transition-all shadow-md ${
                    chatMessage.trim() ? 'bg-red-600 text-white hover:scale-105 active:scale-95' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Send className={`w-5 h-5 ${sending ? 'animate-pulse' : ''}`} />
                </button>
             </div>
             <p className="text-[9px] font-bold text-gray-400 mt-3 text-center uppercase tracking-widest">
               Service powered by Meta Cloud Messaging API
             </p>
          </div>
       </div>

       {/* Drawer Backdrop Overlay */}
       {isChatOpen && (
         <div 
           className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] z-[55]"
           onClick={() => setIsChatOpen(false)}
         />
       )}
    </div>
  );
}
