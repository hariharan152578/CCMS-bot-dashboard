'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { format } from 'date-fns';

interface SystemLog {
  id: string;
  timestamp: number;
  type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN';
  message: string;
  detail?: string;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    const logsRef = query(ref(db, 'systemLogs'), limitToLast(50));
    const unsubscribe = onValue(logsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const logsArray = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        })).sort((a, b) => b.timestamp - a.timestamp);
        setLogs(logsArray);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = filter === 'ALL' ? logs : logs.filter(log => log.type === filter);

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto min-h-screen bg-white md:bg-slate-50">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
             System Monitor <span className="text-slate-400 font-normal hidden sm:inline">/ Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 font-bold uppercase tracking-wider">Real-time troubleshooting & API Audit Trail</p>
        </div>
        
        <div className="flex flex-wrap gap-2 bg-white/50 p-1.5 rounded-xl border border-slate-200 shadow-sm">
          {['ALL', 'INFO', 'SUCCESS', 'WARN', 'ERROR'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-lg transition-all text-[11px] font-black uppercase tracking-widest ${
                filter === type 
                ? 'bg-black text-white shadow-xl scale-105' 
                : 'text-slate-400 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Event Timing</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Level</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Diagnostic Message</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-xs text-slate-500 font-bold font-mono whitespace-nowrap group-hover:text-black transition-colors">
                    {format(log.timestamp, 'HH:mm:ss')} <span className="opacity-30 ml-1 font-normal">{format(log.timestamp, 'MMM dd')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded text-[10px] font-black uppercase tracking-tighter ring-1 ring-inset ${
                      log.type === 'SUCCESS' ? 'bg-green-50 text-green-700 ring-green-200' :
                      log.type === 'ERROR' ? 'bg-red-50 text-red-700 ring-red-200' :
                      log.type === 'WARN' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                      'bg-sky-50 text-sky-700 ring-sky-200'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800 font-bold tracking-tight">
                    {log.message}
                  </td>
                  <td className="px-6 py-4">
                    {log.detail && (
                      <pre className="text-[10px] bg-slate-900 text-slate-300 p-3 rounded-xl max-w-xs overflow-x-auto font-mono leading-relaxed shadow-inner">
                        {log.detail}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-2 opacity-30">
                       <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Log Stream Empty</p>
                       <p className="text-xs">No active events matching the current filter.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
