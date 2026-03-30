'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, List, Users, BarChart2, Settings, Landmark, Search, Bell, User, X, Terminal, Clock, MessageSquare } from 'lucide-react';
import { ReactNode, useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, query, limitToLast, orderByChild } from 'firebase/database';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(Date.now());
  const [mounted, setMounted] = useState(false);

  // ✅ REAL-TIME NOTIFICATION LISTENER
  useEffect(() => {
    setMounted(true);
    // Persist last read from local storage if exists
    const saved = localStorage.getItem('ccms_last_read_notif');
    if (saved) setLastReadTimestamp(parseInt(saved, 10));

    const complaintsRef = ref(db, 'complaints');
    // Fetch the 10 most recent complaints/queries
    const q = query(complaintsRef, limitToLast(10));
    
    const unsubscribe = onValue(q, (snap) => {
      let items: any[] = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          items.push({ id: child.key, ...child.val() });
        });
      }
      // Sort by newest first
      items.sort((a,b) => (b.createdAt || 0) - (a.createdAt || 0));
      setNotifications(items);
    });

    return () => unsubscribe();
  }, []);

  const unreadCount = useMemo(() => {
     return notifications.filter(n => (n.createdAt || 0) > lastReadTimestamp).length;
  }, [notifications, lastReadTimestamp]);

  const markAllAsRead = () => {
     const now = Date.now();
     setLastReadTimestamp(now);
     localStorage.setItem('ccms_last_read_notif', now.toString());
     setIsNotifOpen(false);
  };

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: Home, exact: true },
    { name: 'Complaint Queue', href: '/admin/queue', icon: List },
    { name: 'Citizen Records', href: '/admin/citizens', icon: Users },
    { name: 'Analytics & SLA', href: '/admin/analytics', icon: BarChart2 },
    { name: 'Broadcast Messages', href: '/admin/announcements', icon: Bell },
    { name: 'System Logs', href: '/admin/logs', icon: Terminal },
    { name: 'System Settings', href: '/admin/settings', icon: Settings }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 text-gray-900 font-sans relative overflow-hidden">
      
      {/* Top Global Header */}
      <header className="h-[72px] bg-white border-b border-gray-200 flex items-center px-6 shrink-0 z-10 w-full relative">
        <div className="w-64 shrink-0 flex items-center text-gray-800">
          <Landmark className="w-6 h-6 text-red-600 mr-2" />
          <span className="font-bold text-lg tracking-tight">CCMS<span className="font-normal text-gray-500 ml-1">| Citizen Command</span></span>
        </div>
        <div className="flex-1 flex justify-center">
          <div className="bg-red-50 text-red-800 text-[10px] font-bold tracking-widest px-4 py-1.5 rounded-full flex items-center shadow-sm border border-red-100 uppercase">
            <span className="w-2 h-2 rounded-full bg-red-600 mr-2 animate-pulse"></span>
            Real-Time Engine Active
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input type="text" placeholder="Omni Search" className="pl-9 pr-4 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all w-64" />
          </div>
          
          {/* Notification Bell */}
          <div className="relative cursor-pointer group" onClick={() => setIsNotifOpen(true)}>
            <Bell className={`w-5 h-5 transition-colors ${unreadCount > 0 ? 'text-red-600 animate-bounce' : 'text-gray-400 hover:text-gray-900'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-black text-[9px] font-bold text-white ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-3 cursor-pointer border-l pl-6 border-gray-100">
            <div className="flex flex-col items-end mr-1">
               <span className="text-xs font-bold text-gray-900">ADMIN</span>
               <span className="text-[9px] font-bold text-green-600 uppercase tracking-tighter">System Overseer</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center text-white shadow-lg border-2 border-white">
              <User className="w-4 h-4" />
            </div>
          </div>
        </div>
      </header>

      {/* Below Header container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
          <nav className="py-8">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <Link 
                      href={item.href} 
                      className={`flex items-center gap-3 px-6 py-3.5 border-l-4 transition-all font-bold text-sm ${
                        isActive 
                          ? 'bg-red-50 text-red-700 border-red-600' 
                          : 'border-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'opacity-40'}`} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#F9FAFC] p-8 lg:p-10 relative">
          {children}
        </main>
      </div>

      {/* Notification Overlay Backdrop */}
      {isNotifOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-[2px] z-40 transition-opacity"
          onClick={() => setIsNotifOpen(false)}
        />
      )}

      {/* Notification Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-[420px] bg-white shadow-2xl transform transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) flex flex-col border-l border-gray-100 ${
          isNotifOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
         <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                 <Bell className="w-6 h-6 text-red-600" /> Notifications
              </h2>
              <p className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">Real-time Citizen Alerts</p>
            </div>
            <button 
              onClick={() => setIsNotifOpen(false)}
              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-all"
            >
               <X className="w-5 h-5" />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                 <MessageSquare className="w-12 h-12 mb-4" />
                 <p className="font-bold uppercase text-xs">No active alerts detected</p>
              </div>
            ) : (
              notifications.map((n, i) => {
                const isNew = (n.createdAt || 0) > lastReadTimestamp;
                const timeStr = new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                
                return (
                  <div key={n.id} className={`p-5 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                    isNew ? 'bg-red-50 border-red-100 shadow-sm ring-1 ring-red-200/50' : 'bg-white border-gray-100 opacity-60 hover:opacity-100'
                  }`}>
                    {isNew && <span className="absolute top-0 right-0 w-3 h-3 bg-red-600 rounded-bl-xl"></span>}
                    <div className="flex justify-between items-start mb-2">
                       <span className={`text-[10px] font-bold px-2 py-0.5 rounded tracking-tighter ${
                          n.type === 'Query' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700 uppercase'
                       }`}>
                          {n.type || 'Complaint'}
                       </span>
                       <div className="flex items-center gap-1.5 text-gray-400 text-[10px] font-bold">
                          <Clock className="w-3 h-3" />
                          {timeStr}
                       </div>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">Incident Detected: {n.category || 'New Query'}</h4>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed line-clamp-2">"{n.description}"</p>
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                       <span className="text-[10px] font-mono text-gray-400 uppercase tracking-tighter">ID: {n.complaintId || n.id.substring(0,8)}</span>
                       <Link 
                         href="/admin" 
                         onClick={() => setIsNotifOpen(false)}
                         className="text-[10px] font-bold text-red-600 uppercase hover:underline decoration-2"
                       >
                         Dispatch Response &rarr;
                       </Link>
                    </div>
                  </div>
                )
              })
            )}
         </div>

         <div className="p-6 border-t border-gray-100 bg-gray-50/50">
           <button 
             onClick={markAllAsRead}
             className="w-full py-3.5 text-xs font-bold text-white bg-black rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-gray-200 tracking-widest uppercase"
           >
              Clear Feed & Mark Read
           </button>
         </div>
      </div>

    </div>
  );
}
