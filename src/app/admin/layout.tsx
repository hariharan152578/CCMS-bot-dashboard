'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, List, Users, BarChart2, Settings, Landmark, Search, Bell, User, X, Terminal } from 'lucide-react';
import { ReactNode, useState } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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
          <div className="bg-red-50 text-red-800 text-xs font-bold tracking-wide px-4 py-1.5 rounded-full flex items-center shadow-sm border border-red-200">
            <span className="w-2 h-2 rounded-full bg-red-600 mr-2 animate-pulse"></span>
            STREAMING REAL-TIME (Firebase)
          </div>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input type="text" placeholder="Search" className="pl-9 pr-4 py-1.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all w-64" />
          </div>
          
          {/* Notification Bell */}
          <div className="relative cursor-pointer" onClick={() => setIsNotifOpen(true)}>
            <Bell className="w-5 h-5 text-gray-600 hover:text-gray-900 transition-colors" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-white">1</span>
          </div>
          
          <div className="flex items-center gap-2 cursor-pointer border-l pl-6 border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600">
              <User className="w-4 h-4" />
            </div>
            <span className="font-medium text-gray-700 text-sm">Admin <span className="text-gray-400 text-[10px] ml-1">▼</span></span>
          </div>
        </div>
      </header>

      {/* Below Header container */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto">
          <nav className="py-6">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                return (
                  <li key={item.name}>
                    <Link 
                      href={item.href} 
                      className={`flex items-center gap-3 px-6 py-3 border-l-4 transition-colors font-medium ${
                        isActive 
                          ? 'bg-red-50 text-red-700 border-red-600' 
                          : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 ${isActive ? 'text-red-600' : 'opacity-70'}`} />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-[#F9FAFC] p-6 lg:p-8 relative">
          {children}
        </main>
      </div>

      {/* Notification Overlay Backdrop */}
      {isNotifOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsNotifOpen(false)}
        />
      )}

      {/* Notification Drawer Panel */}
      <div 
        className={`fixed inset-y-0 right-0 z-50 w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isNotifOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
         <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
               <Bell className="w-5 h-5 text-red-600" /> Notifications
            </h2>
            <button 
              onClick={() => setIsNotifOpen(false)}
              className="p-1.5 bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-600 rounded-full transition-colors"
            >
               <X className="w-4 h-4" />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Notification Item 1 */}
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl relative">
              <span className="absolute top-4 right-4 text-[10px] font-bold text-gray-400">Just now</span>
              <h4 className="text-sm font-bold text-red-900">New High Priority Incident!</h4>
              <p className="text-xs text-red-700 mt-1">A new high-priority report was submitted via WhatsApp in Velachery regarding Water issues.</p>
              <button className="mt-3 text-xs font-bold text-red-600 uppercase tracking-wide hover:underline">View Complaint</button>
            </div>

            {/* Notification Item 2 */}
            <div className="p-4 bg-white border border-gray-100 rounded-xl relative shadow-sm">
              <span className="absolute top-4 right-4 text-[10px] font-bold text-gray-400">2h ago</span>
              <h4 className="text-sm font-bold text-gray-800">SLA Warning: Road Dept</h4>
              <p className="text-xs text-gray-500 mt-1">2 complaints in Road department are approaching their SLA breach threshold.</p>
            </div>

            {/* Notification Item 3 */}
            <div className="p-4 bg-white border border-gray-100 rounded-xl relative shadow-sm opacity-60">
              <span className="absolute top-4 right-4 text-[10px] font-bold text-gray-400">1d ago</span>
              <h4 className="text-sm font-bold text-gray-800">System Update</h4>
              <p className="text-xs text-gray-500 mt-1">The CCMS Dashboard was successfully synchronized with the new platform architecture.</p>
            </div>
         </div>

         <div className="p-4 border-t border-gray-200 bg-gray-50">
           <button className="w-full py-2.5 text-sm font-bold text-gray-600 bg-white border border-gray-300 rounded hover:bg-gray-100 transition-colors">
              Mark all as read
           </button>
         </div>
      </div>

    </div>
  );
}
