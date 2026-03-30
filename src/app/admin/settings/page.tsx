'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, set, remove } from 'firebase/database';
import { Settings as SettingsIcon, Shield, Server, Users, PlusCircle, X, Check, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('Users');
  
  // Add User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'Senior Admin', dept: 'Operations' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fake Account Feedback
  const [savedAcc, setSavedAcc] = useState(false);

  // WhatsApp Config State
  const [waConfig, setWaConfig] = useState({
    accessToken: '',
    phoneNumberId: '',
    businessAccountId: '',
    verifyToken: '',
    webhookUrl: ''
  });
  const [savedWa, setSavedWa] = useState(false);

  useEffect(() => {
    const unsubAdmins = onValue(ref(db, 'admins'), (snap) => {
       const adminList: any[] = [];
       if (snap.exists()) {
          snap.forEach(child => {
             adminList.push({ id: child.key, ...child.val() });
          });
       }
       setAdmins(adminList);
    });
    
    const unsubWa = onValue(ref(db, 'settings/whatsapp'), (snap) => {
       if (snap.exists()) setWaConfig(snap.val());
    });

    return () => {
      unsubAdmins();
      unsubWa();
    };
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Create a safe Firebase key from the email
      const safeId = newUser.email.replace(/[.#$\[\]]/g, '_');
      await set(ref(db, `admins/${safeId}`), {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        dept: newUser.dept,
        createdAt: Date.now()
      });
      setIsAddUserOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'Senior Admin', dept: 'Operations' });
    } catch (err) {
      alert("Failed to add user.");
    }
    setIsSubmitting(false);
  };

  const handleRevoke = async (id: string, name: string) => {
    if (confirm(`Are you absolutely sure you want to revoke access for ${name}?`)) {
       try {
         await remove(ref(db, `admins/${id}`));
       } catch (err) {
         alert("Failed to revoke user.");
       }
    }
  };

  const mockSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedAcc(true);
    setTimeout(() => setSavedAcc(false), 3000);
  };

  const handleSaveWaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await set(ref(db, 'settings/whatsapp'), waConfig);
      setSavedWa(true);
      setTimeout(() => setSavedWa(false), 3000);
    } catch (err) {
      alert("Failed to save WhatsApp config.");
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-8 flex flex-col min-h-[600px]">
        
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
           <SettingsIcon className="w-5 h-5 text-gray-500"/>
           Admin Console & Platform Configuration
        </h2>

         {/* Top Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 select-none">
           <div 
             onClick={() => setActiveTab('Account')}
             className={`border rounded-2xl p-5 transition-all cursor-pointer group ${activeTab === 'Account' ? 'border-red-500 bg-red-50/20 shadow-sm ring-1 ring-red-500' : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-md'}`}
           >
              <div className={`w-12 h-12 bg-white border rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${activeTab === 'Account' ? 'border-red-200' : 'border-gray-200'}`}>
                 <Shield className={`w-6 h-6 ${activeTab === 'Account' ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <h3 className={`font-bold text-sm mb-1 uppercase tracking-tight ${activeTab === 'Account' ? 'text-red-900' : 'text-gray-900'}`}>Account Access</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                 Manage personal credentials, authentication, and diagnostic security preferences.
              </p>
           </div>
           
           <div 
             onClick={() => setActiveTab('Integration')}
             className={`border rounded-2xl p-5 transition-all cursor-pointer group ${activeTab === 'Integration' ? 'border-red-500 bg-red-50/20 shadow-sm ring-1 ring-red-500' : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-md'}`}
           >
              <div className={`w-12 h-12 bg-white border rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${activeTab === 'Integration' ? 'border-red-200' : 'border-gray-200'}`}>
                 <Server className={`w-6 h-6 ${activeTab === 'Integration' ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <h3 className={`font-bold text-sm mb-1 uppercase tracking-tight ${activeTab === 'Integration' ? 'text-red-900' : 'text-gray-900'}`}>Cloud Integration</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                 Configure WhatsApp Cloud API keys, Webhooks, and Firebase streaming endpoints.
              </p>
           </div>

           <div 
             onClick={() => setActiveTab('Users')}
             className={`border rounded-2xl p-5 transition-all cursor-pointer group ${activeTab === 'Users' ? 'border-red-500 bg-red-50/20 shadow-sm ring-1 ring-red-500' : 'border-gray-200 bg-gray-50/50 hover:bg-white hover:shadow-md'}`}
           >
              <div className={`w-12 h-12 bg-white border rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${activeTab === 'Users' ? 'border-red-200' : 'border-gray-200'}`}>
                 <Users className={`w-6 h-6 ${activeTab === 'Users' ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
              <h3 className={`font-bold text-sm mb-1 uppercase tracking-tight ${activeTab === 'Users' ? 'text-red-900' : 'text-gray-900'}`}>User Management</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                 Provision administrators, municipal operators, and assign strict role-based access.
              </p>
           </div>
        </div>

        <div className="flex-1 flex flex-col relative border-t border-gray-100 pt-6">

           {/* === 1. ACCOUNT SETTINGS VIEW === */}
           {activeTab === 'Account' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 max-w-5xl animate-in fade-in duration-300">
                <form onSubmit={mockSaveAccount} className="space-y-6">
                  <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <Shield className="w-4 h-4 text-red-600" /> Administrative Profile
                  </h3>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Official Name</label>
                    <input type="text" defaultValue="Admin User" required className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Security Email</label>
                    <input type="email" defaultValue="admin@example.com" required className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-100 text-gray-400 font-bold cursor-not-allowed" readOnly />
                    <p className="text-[10px] text-gray-400 mt-2 italic font-medium">Root email cannot be modified from the console.</p>
                  </div>
                  <button className="w-full sm:w-auto bg-black hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-xl shadow-lg transition-all">
                    Update Profile
                  </button>
                </form>

                <form onSubmit={mockSaveAccount} className="space-y-6">
                  <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center gap-2 uppercase text-xs tracking-widest">
                    <Shield className="w-4 h-4 text-red-600" /> Security Credentials
                  </h3>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Existing Password</label>
                    <input type="password" required className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">New Password</label>
                      <input type="password" required className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Verify Pass</label>
                      <input type="password" required className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold" />
                    </div>
                  </div>
                  <button className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest px-8 py-3 rounded-xl shadow-lg transition-all">
                    Update Access
                  </button>
                </form>

               {savedAcc && (
                 <div className="absolute top-0 right-0 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-4">
                   <Check className="w-4 h-4" /> Attributes Saved Securely!
                 </div>
               )}
            </div>
          )}


          {/* === 2. SYSTEM INTEGRATION VIEW === */}
          {activeTab === 'Integration' && (
            <div className="max-w-4xl space-y-8 animate-in fade-in duration-300 relative">
               
               {savedWa && (
                 <div className="absolute top-0 right-0 bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 text-sm font-bold flex items-center gap-2 animate-in slide-in-from-top-4 z-10">
                   <Check className="w-4 h-4" /> Cloud API Config Saved!
                 </div>
               )}

               <form onSubmit={handleSaveWaConfig} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                      <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                         <Server className="w-5 h-5 text-green-600" /> WhatsApp Cloud API Settings
                      </h3>
                      {waConfig.accessToken && waConfig.phoneNumberId && waConfig.businessAccountId && waConfig.verifyToken && waConfig.webhookUrl ? (
                         <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded ring-1 ring-green-200 flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Configured
                         </span>
                      ) : (
                         <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded ring-1 ring-amber-200 flex items-center gap-1.5">
                           <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Missing Config
                         </span>
                      )}
                    </div>
                    <button type="submit" className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-5 py-2.5 rounded shadow-sm transition-colors">
                      Save API Config
                    </button>
                 </div>
                 
                 <div className="space-y-5">
                   {/* Meta Dashboard Sync Fields */}
                   <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Meta Developer App Credentials</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1.5">WhatsApp Access Token (Temporary or Permanent)</label>
                          <input 
                            type="text" 
                            required
                            value={waConfig.accessToken}
                            onChange={(e) => setWaConfig({...waConfig, accessToken: e.target.value})}
                            placeholder="EAA..." 
                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 focus:border-green-500 outline-none" 
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="block text-xs font-bold text-gray-700 mb-1.5">Phone Number ID</label>
                             <input 
                               type="text" 
                               required
                               value={waConfig.phoneNumberId}
                               onChange={(e) => setWaConfig({...waConfig, phoneNumberId: e.target.value})}
                               placeholder="e.g. 1129692740217022" 
                               className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 focus:border-green-500 outline-none" 
                             />
                           </div>
                           <div>
                             <label className="block text-xs font-bold text-gray-700 mb-1.5">WhatsApp Business Account ID</label>
                             <input 
                               type="text" 
                               required
                               value={waConfig.businessAccountId}
                               onChange={(e) => setWaConfig({...waConfig, businessAccountId: e.target.value})}
                               placeholder="e.g. 977861061481307" 
                               className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 focus:border-green-500 outline-none" 
                             />
                           </div>
                        </div>
                      </div>
                   </div>

                   {/* Webhook Configuration fields */}
                   <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg">
                      <h4 className="text-sm font-bold text-blue-900 mb-4 border-b border-blue-200 pb-2">Webhook Configuration</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-bold text-blue-800 mb-1.5">Callback URL</label>
                          <div className="flex">
                            <input 
                              type="text" 
                              required
                              value={waConfig.webhookUrl || ''}
                              onChange={(e) => setWaConfig({...waConfig, webhookUrl: e.target.value})}
                              placeholder="https://<YOUR_DOMAIN>/api/webhook" 
                              className="flex-1 bg-white border border-gray-300 rounded-l-lg px-3 py-2 text-sm font-mono text-gray-800 focus:border-blue-500 outline-none" 
                            />
                            <button type="button" className="bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold px-4 py-2 rounded-r-lg transition-colors border-y border-r border-gray-300" onClick={() => navigator.clipboard.writeText(waConfig.webhookUrl || '')}>Copy</button>
                          </div>
                          <p className="text-[10px] text-blue-600 mt-1">Define the Webhook callback URL mapped to this environment.</p>
                        </div>
                        
                        <div>
                           <label className="block text-xs font-bold text-blue-800 mb-1.5">Verify Token (Custom)</label>
                           <input 
                             type="text" 
                             required
                             value={waConfig.verifyToken}
                             onChange={(e) => setWaConfig({...waConfig, verifyToken: e.target.value})}
                             placeholder="e.g. MySecretToken123" 
                             className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 focus:border-blue-500 outline-none" 
                           />
                           <p className="text-[10px] text-blue-600 mt-1">Must precisely match the Verify Token you set in the Meta dashboard when validating the callback URL.</p>
                        </div>
                      </div>
                   </div>
                 </div>
               </form>
            </div>
          )}


          {/* === 3. USER MANAGEMENT VIEW === */}
          {activeTab === 'Users' && (
            <div className="flex-1 flex flex-col border border-gray-200 rounded-2xl overflow-hidden animate-in fade-in duration-300 shadow-sm bg-white">
               <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-sm text-gray-900 uppercase tracking-tight">Municipal Admin Registry</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Global Permissions Cluster</p>
                  </div>
                  <button 
                    onClick={() => setIsAddUserOpen(true)}
                    className="w-full sm:w-auto bg-black hover:bg-red-700 text-white text-[11px] font-black px-6 py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                  >
                     <PlusCircle className="w-4 h-4" /> Provision Admin
                  </button>
               </div>
               
               <div className="overflow-x-auto bg-white flex-1 min-h-[300px] custom-scrollbar">
                 <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead>
                     <tr className="text-[10px] font-black text-gray-400 border-b border-gray-100 uppercase tracking-widest bg-gray-50/30">
                       <th className="p-4 pl-6">Operator Identity</th>
                       <th className="p-4">Authorization</th>
                       <th className="p-4">Jurisdiction</th>
                       <th className="p-4 text-right pr-6">Access Control</th>
                     </tr>
                   </thead>
                   <tbody>
                     {admins.length === 0 ? (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">No active administrators found in the current cluster.</td></tr>
                     ) : (
                       admins.map((a, i) => (
                         <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                            <td className="p-4 pl-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden ring-2 ring-white shadow-sm shrink-0">
                                  <img 
                                    src={`https://ui-avatars.com/api/?name=${a.name || a.email || 'Admin'}&background=random`} 
                                    alt="avatar" 
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-gray-900 group-hover:text-red-700 transition-colors tracking-tight">{a.name || a.email.split('@')[0]}</span>
                                  <span className="text-[10px] text-gray-400 font-bold font-mono tracking-tighter uppercase">{a.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                               <span className="px-3 py-1 bg-red-50 text-red-700 text-[10px] tracking-widest font-black rounded uppercase ring-1 ring-red-100">
                                  {a.role || 'Senior Admin'}
                               </span>
                            </td>
                            <td className="p-4 text-[11px] font-bold text-gray-600 uppercase tracking-tight">
                               {a.dept || 'Global Console'}
                            </td>
                            <td className="p-4 text-right pr-6 space-x-4">
                               <button className="text-[10px] text-gray-400 hover:text-black font-black uppercase tracking-widest transition-colors">Modify</button>
                               <button 
                                 onClick={() => handleRevoke(a.id, a.name || a.email)}
                                 className="text-[10px] text-red-600/50 hover:text-red-700 font-black uppercase tracking-widest transition-colors"
                               >
                                 Revoke
                               </button>
                            </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          )}

        </div>
      </div>

      {/* Add User Modal */}
      {isAddUserOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in transition-all duration-300" onClick={() => setIsAddUserOpen(false)}></div>
           <div className="bg-white rounded-3xl shadow-2xl z-10 w-[95%] max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                 <div>
                    <h2 className="font-black text-gray-900 flex items-center gap-3 text-lg uppercase tracking-tight"><Shield className="w-6 h-6 text-red-600"/> Provision Operator</h2>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Assign strict role-based credentials</p>
                 </div>
                 <button onClick={() => setIsAddUserOpen(false)} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-600 transition-all"><X className="w-5 h-5"/></button>
              </div>
              <form onSubmit={handleAddUser} className="p-8 space-y-6">
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="sm:col-span-2">
                     <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Operator Full Name</label>
                     <input type="text" required value={newUser.name} onChange={(e) => setNewUser({...newUser, name: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold transition-all" placeholder="e.g. Jane Cooper" />
                   </div>
                   <div className="sm:col-span-2">
                     <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Security Email Access</label>
                     <input type="email" required value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold transition-all" placeholder="jane@ccms-portal.gov.in" />
                   </div>
                   <div className="sm:col-span-2">
                     <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Temporary Provisioning Pass</label>
                     <input type="text" required value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none font-bold transition-all" placeholder="Generate secure token..." />
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Authority Level</label>
                     <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white font-bold transition-all">
                        <option value="Senior Admin">Senior Admin</option>
                        <option value="Operator">Operator</option>
                        <option value="Read-Only">Read-Only</option>
                     </select>
                   </div>
                   <div>
                     <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Assigned Warden</label>
                     <select value={newUser.dept} onChange={(e) => setNewUser({...newUser, dept: e.target.value})} className="w-full bg-gray-50/50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none bg-white font-bold transition-all">
                        <option value="Operations">Operations HQ</option>
                        <option value="Water Board">Water Board</option>
                        <option value="Highways">Highways</option>
                        <option value="Electricity">Electricity</option>
                     </select>
                   </div>
                 </div>
                 
                 <div className="pt-6 mt-2 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3">
                    <button type="button" onClick={() => setIsAddUserOpen(false)} className="px-6 py-3 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">Discard</button>
                    <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-black hover:bg-red-700 disabled:bg-gray-400 text-white text-[11px] font-black px-8 py-3 rounded-xl shadow-xl transition-all tracking-widest uppercase">
                      Confirm & Provision Access
                    </button>
                 </div>
              </form>
           </div>
         </div>
      )}

    </div>
  );
}
