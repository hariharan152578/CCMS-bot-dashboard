'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import { Clock, AlertTriangle, TrendingUp, PieChart as PieIcon, Trash2 } from 'lucide-react';

export default function AnalyticsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, 'complaints'), (snap) => {
      let comps: any[] = [];
      if (snap.exists()) {
        snap.forEach((childSnap) => {
          comps.push({ id: childSnap.key, ...childSnap.val() });
        });
      }
      setComplaints(comps);
    });
    return () => unsubscribe();
  }, []);

  // Mocked 30-day data since we don't naturally have a month of history yet
  const areaData = Array.from({ length: 30 }).map((_, i) => ({
    name: i + 1,
    volume: Math.floor(Math.random() * (200 - 50 + 1)) + 50 + (i * 2),
  }));

  const barData = [
    { name: 'Water', actual: 120, baseline: 80 },
    { name: 'Road', actual: 80, baseline: 100 },
    { name: 'Electricity', actual: 60, baseline: 70 },
    { name: 'Other', actual: 40, baseline: 40 },
  ];

  const pieData = [
    { name: 'Water', value: 45, color: '#dc2626' }, // red-600
    { name: 'Road', value: 25, color: '#1d4ed8' },  // blue-700
    { name: 'Elec', value: 20, color: '#1e3a8a' },  // blue-900
    { name: 'Other', value: 10, color: '#fca5a5' }, // red-300
  ];

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 overflow-hidden">
        
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
           <PieIcon className="w-5 h-5 text-red-600"/>
           Performance Dashboard <span className="text-gray-400 font-normal">(Real-Time Metrics)</span>
        </h2>
        
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
              Average Resolution Time <Clock className="w-4 h-4 text-red-400"/>
            </h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">2.3 Days</span>
            </div>
            <p className="text-xs text-green-600 font-bold mt-1">-5% MoM</p>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
              SLA Breach Rate <AlertTriangle className="w-4 h-4 text-red-500"/>
            </h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">8%</span>
            </div>
            <p className="text-xs text-red-600 font-bold mt-1">+2% MoM</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
              Complaint Volume (Monthly) <TrendingUp className="w-4 h-4 text-red-600"/>
            </h3>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">{complaints.length + 1198 /* mock base */}</span>
            </div>
            <p className="text-xs text-green-600 font-bold mt-1">+10% MoM</p>
          </div>

          <div className="border border-gray-200 rounded-lg p-5 relative">
            <h3 className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between mb-2">
              Category Breakdown (Chart) <Trash2 className="w-4 h-4 text-red-600"/>
            </h3>
            <div className="absolute right-4 top-10 w-16 h-16">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={18} outerRadius={28} paddingAngle={2}>
                     {pieData.map((e, index) => <Cell key={`cell-${index}`} fill={e.color} />)}
                   </Pie>
                 </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="mt-3">
               <span className="text-2xl font-bold text-gray-900">3.6%</span>
               <p className="text-xs text-blue-600 font-bold mt-1">+10% MoM</p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           
           {/* Area Chart */}
           <div className="col-span-1 border border-gray-200 rounded-lg p-5">
              <h3 className="text-xs font-bold text-gray-700 mb-4">Complaint Volume over 30 Days</h3>
              <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={areaData}>
                      <defs>
                        <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                      <Area type="monotone" dataKey="volume" stroke="#dc2626" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* Bar Chart */}
           <div className="col-span-1 border border-gray-200 rounded-lg p-5">
              <h3 className="text-xs font-bold text-gray-700 mb-4">Resolution Time by Category (Water vs Road vs Electricity)</h3>
              <div className="h-48">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#9ca3af'}} />
                      <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{ borderRadius: 8, fontSize: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="actual" fill="#1e3a8a" radius={[2, 2, 0, 0]} barSize={16} />
                      <Bar dataKey="baseline" fill="#dc2626" radius={[2, 2, 0, 0]} barSize={16} />
                    </BarChart>
                 </ResponsiveContainer>
              </div>
           </div>

           {/* SLA Compliance Table */}
           <div className="col-span-1 border border-gray-200 rounded-lg p-5 flex flex-col">
              <h3 className="text-xs font-bold text-gray-700 mb-4">SLA Compliance Table</h3>
              <div className="flex-1 overflow-auto">
                 <table className="w-full text-left border-collapse text-sm">
                   <thead>
                     <tr className="border-b border-gray-200 text-gray-500 font-bold text-xs uppercase">
                       <th className="pb-2">Department</th>
                       <th className="pb-2 text-right">Compliance</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100 text-gray-800">
                     <tr><td className="py-2.5">Water</td><td className="py-2.5 text-right font-bold text-gray-900">92%</td></tr>
                     <tr><td className="py-2.5">Road</td><td className="py-2.5 text-right font-bold text-gray-900">73%</td></tr>
                     <tr><td className="py-2.5">Electricity</td><td className="py-2.5 text-right font-bold text-gray-900">92%</td></tr>
                     <tr><td className="py-2.5">Citizen Maker</td><td className="py-2.5 text-right font-bold text-red-600">48%</td></tr>
                     <tr><td className="py-2.5">Forestry</td><td className="py-2.5 text-right font-bold text-gray-900">89%</td></tr>
                   </tbody>
                 </table>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
