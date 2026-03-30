'use client';

import { useState, useEffect } from 'react';

export default function ActionPanel({ complaintId, currentStatus, currentPriority }: { complaintId: string, currentStatus: string, currentPriority: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState(currentStatus || 'Pending');
  const [priority, setPriority] = useState(currentPriority || 'Medium');

  // ✅ CRITICAL FIX: Sync local state with incoming props when the selected complaint changes
  useEffect(() => {
    setStatus(currentStatus || 'Pending');
    setPriority(currentPriority || 'Medium');
    setReason('');
    setSuccess(false);
  }, [complaintId, currentStatus, currentPriority]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
        if (!confirm(`No message text provided. Citizen will only get a generic status update message. Proceed?`)) return;
    } else {
        if (!confirm(`Are you sure you want to update this complaint? A WhatsApp notification will be sent.`)) return;
    }
    
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason, priority })
      });
      if (res.ok) {
        setReason('');
        setSuccess(true);
        // Hide success after a few seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert('Failed to update status');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating status');
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Management Panel Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value)} 
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white shadow-sm transition-all"
          >
            <option value="Pending">PENDING</option>
            <option value="In Progress">IN PROGRESS</option>
            <option value="Resolved">RESOLVED</option>
            <option value="Rejected">REJECTED</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
          <select 
            value={priority} 
            onChange={(e) => setPriority(e.target.value)} 
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white shadow-sm transition-all"
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex justify-between">
          WhatsApp Notification Reply
          {reason.length > 0 && <span className="text-[10px] text-red-600 font-bold">{reason.length} chars</span>}
        </label>
        <textarea 
          placeholder="Write your reply or feedback here... The citizen will receive this on WhatsApp."
          className="w-full text-sm text-gray-800 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white shadow-sm transition-all resize-none min-h-[100px]"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="pt-2 relative">
        {success && (
          <div className="absolute -top-6 left-0 text-xs text-green-600 font-bold animate-in fade-in slide-in-from-bottom-2">
            ✅ Updated & Sent Successfully!
          </div>
        )}
        <button 
          disabled={loading}
          onClick={handleSubmit}
          className={`w-full text-white font-bold text-sm py-3 rounded-lg transition-all shadow-md active:scale-[0.98] ${loading ? 'bg-gray-400 opacity-50' : 'bg-red-600 hover:bg-black hover:shadow-lg hover:shadow-red-500/20'}`}>
          {loading ? 'Processing Incident...' : 'Update Status & Notify Citizen'}
        </button>
      </div>
    </div>
  );
}
