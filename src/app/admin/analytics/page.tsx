'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import { Clock, AlertTriangle, TrendingUp, PieChart as PieIcon, Activity } from 'lucide-react';

export default function AnalyticsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'complaints'), (snap) => {
      let comps: any[] = [];
      if (snap.exists()) {
        snap.forEach((childSnap) => {
          comps.push({ id: childSnap.key, ...childSnap.val() });
        });
      }
      setComplaints(comps);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // ✅ REAL-TIME ANALYTICS COMPUTATION
  const stats = useMemo(() => {
    if (!complaints.length) return { areaData: [], pieData: [], barData: [], avgResTime: 0, slaBreach: 0 };

    // 1. Area Data (Last 7 days for better density, can scale to 30)
    const last7Days: any[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
      const count = complaints.filter(c => {
        const cDate = new Date(c.createdAt);
        return cDate.toDateString() === d.toDateString();
      }).length;
      last7Days.push({ name: label, volume: count });
    }

    // 2. Pie Data (Category Breakdown)
    const catMap: Record<string, number> = {};
    complaints.forEach(c => {
      const cat = c.category || 'Other';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const colors = ['#dc2626', '#1d4ed8', '#1e3a8a', '#fca5a5', '#4b5563'];
    const pieData = Object.entries(catMap).map(([name, value], i) => ({
      name, 
      value, 
      color: colors[i % colors.length]
    }));

    // 3. Avg Resolution Time & SLA
    let totalTime = 0;
    let resolvedCount = 0;
    let breaches = 0;
    const slaThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days

    complaints.forEach(c => {
      if (c.status === 'Resolved' && c.resolvedAt && c.createdAt) {
        const duration = c.resolvedAt - c.createdAt;
        totalTime += duration;
        resolvedCount++;
        if (duration > slaThreshold) breaches++;
      }
    });

    const avgResTime = resolvedCount > 0 ? (totalTime / resolvedCount / (24 * 60 * 60 * 1000)).toFixed(1) : '0';
    const slaPercent = complaints.length > 0 ? (breaches / complaints.length * 100).toFixed(0) : '0';

    // 4. Bar Data (Status Distribution)
    const statusMap: Record<string, number> = { 'Pending': 0, 'In Progress': 0, 'Resolved': 0, 'Rejected': 0 };
    complaints.forEach(c => {
      if (statusMap[c.status] !== undefined) statusMap[c.status]++;
    });
    const barData = Object.entries(statusMap).map(([name, val]) => ({ name, actual: val, baseline: 5 })); // Mock baseline

    return { areaData: last7Days, pieData, barData, avgResTime, slaBreach: slaPercent };
  }, [complaints]);

  if (loading) return (
    <div className="h-full flex items-center justify-center bg-white rounded-lg border border-gray-200">
       <div className="flex flex-col items-center gap-4">
          <Activity className="w-10 h-10 text-red-600 animate-spin" />
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Compiling City Metrics...</p>
       </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 overflow-hidden flex-1 flex flex-col">
        
        <header className="mb-8 flex justify-between items-end">
           <div>
             <h2 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
                <PieIcon className="w-6 h-6 text-red-600"/>
                Citizen Engagement Portal <span className="text-gray-400 font-normal">Analytics</span>
             </h2>
             <p className="text-gray-400 text-xs font-bold mt-1 uppercase tracking-wider">Live Database Sync active as of {new Date().toLocaleTimeString()}</p>
           </div>
           <div className="flex gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-green-600 uppercase">Live Metrics</span>
           </div>
        </header>
        
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              Avg Resolution <Clock className="w-4 h-4 text-red-500"/>
            </h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{stats.avgResTime}</span>
              <span className="text-sm font-bold text-gray-400 uppercase">Days</span>
            </div>
          </div>
          
          <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              SLA Breach <AlertTriangle className="w-4 h-4 text-orange-500"/>
            </h3>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{stats.slaBreach}%</span>
            </div>
          </div>

          <div className="bg-red-50/50 rounded-2xl p-6 border border-red-100 shadow-sm relative overflow-hidden">
            <h3 className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center justify-between">
              Total Volume <Activity className="w-4 h-4 text-red-600"/>
            </h3>
            <div className="mt-3 flex items-baseline gap-2 relative z-10">
              <span className="text-3xl font-bold text-gray-900">{complaints.length}</span>
              <span className="text-xs font-bold text-red-600 uppercase tracking-tighter">Active reports</span>
            </div>
          </div>

          <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 shadow-sm relative group overflow-hidden">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between mb-2">
              Departments
            </h3>
            <div className="mt-3">
               <span className="text-3xl font-bold text-gray-900">{stats.pieData.length}</span>
               <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Active Categories</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 overflow-hidden">
           
           {/* Area Chart */}
           <div className="col-span-1 border border-gray-100 rounded-3xl p-8 bg-white shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-6 border-b border-gray-50 pb-3">Incident Velocity (Past 7 Days)</h3>
              <div className="flex-1 min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.areaData}>
                      <defs>
                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af', fontWeight: 'bold'}} />
                      <YAxis hide />
                      <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: 12, fontWeight: 'bold' }}/>
                      <Area type="monotone" dataKey="volume" stroke="#000" strokeWidth={4} fillOpacity={1} fill="url(#colorVol)" animationDuration={1000} />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Bar Chart */}
           <div className="col-span-1 border border-gray-100 rounded-3xl p-8 bg-white shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-8 border-b border-gray-50 pb-4">Incident Breakdown by Status</h3>
              <div className="flex-1 min-h-[250px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.barData} margin={{ top: 0, right: 0, left: -40, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#9ca3af', fontWeight: 'bold'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="actual" fill="#dc2626" radius={[4, 4, 0, 0]} barSize={24} />
                      <Bar dataKey="baseline" fill="#000" radius={[4, 4, 0, 0]} barSize={6} opacity={0.1} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Dynamic Category List (Replacing SLA Table) */}
           <div className="col-span-1 border border-gray-100 rounded-3xl p-8 bg-white shadow-sm flex flex-col">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-8 border-b border-gray-50 pb-4">Categorical Distribution</h3>
              <div className="flex-1 overflow-auto pr-2 custom-scrollbar">
                 <div className="space-y-4">
                    {stats.pieData.sort((a,b) => b.value - a.value).map((cat, i) => (
                       <div key={i} className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-xs">
                             <span className="font-bold text-gray-600 uppercase tracking-tighter">{cat.name}</span>
                             <span className="font-bold text-gray-900">{cat.value} Cases</span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                             <div 
                               className="h-full transition-all duration-1000" 
                               style={{ width: `${(cat.value / complaints.length * 100)}%`, backgroundColor: cat.color }}
                             />
                          </div>
                       </div>
                    ))}
                    {stats.pieData.length === 0 && (
                       <p className="text-center text-gray-400 text-sm mt-10">No categorical data available yet.</p>
                    )}
                 </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
