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
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">System Logs</h1>
          <p className="text-slate-500 mt-2">Real-time troubleshooting and API monitoring</p>
        </div>
        
        <div className="flex gap-2 bg-white p-1 rounded-lg border border-slate-200">
          {['ALL', 'INFO', 'SUCCESS', 'WARN', 'ERROR'].map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-md transition-all text-sm font-medium ${
                filter === type 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Message</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500 font-mono whitespace-nowrap">
                    {format(log.timestamp, 'HH:mm:ss')}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.type === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                      log.type === 'ERROR' ? 'bg-red-100 text-red-700' :
                      log.type === 'WARN' ? 'bg-amber-100 text-amber-700' :
                      'bg-sky-100 text-sky-700'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800 font-medium">
                    {log.message}
                  </td>
                  <td className="px-6 py-4">
                    {log.detail && (
                      <pre className="text-[11px] bg-slate-900 text-slate-300 p-2 rounded-lg max-w-xs overflow-x-auto font-mono leading-relaxed">
                        {log.detail}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No logs found matching this filter.
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
