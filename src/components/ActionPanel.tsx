'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';

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
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Status Protocol</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white shadow-sm transition-all cursor-pointer"
          >
            <option value="Pending">PENDING</option>
            <option value="In Progress">IN PROGRESS</option>
            <option value="Resolved">RESOLVED</option>
            <option value="Rejected">REJECTED</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1">Risk Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white shadow-sm transition-all cursor-pointer"
          >
            <option value="Low">LOW</option>
            <option value="Medium">MEDIUM</option>
            <option value="High">HIGH</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-1 flex justify-between items-center">
          WhatsApp Response Message
          {reason.length > 0 && <span className="text-[9px] text-red-600 font-bold">{reason.length} / 1000</span>}
        </label>
        <textarea
          placeholder="Enter the official response here..."
          className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 bg-white shadow-sm transition-all resize-none min-h-[100px]"
          rows={4}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <div className="pt-2 relative">
        {success && (
          <div className="mb-2 text-green-600 text-xs font-bold flex items-center gap-1">
            <Check className="w-4 h-4" /> Attributes Updated Successfully!
          </div>
        )}
        <button
          disabled={loading}
          onClick={handleSubmit}
          className={`w-full text-white font-bold text-xs py-3 rounded-lg transition-all shadow-sm active:scale-[0.98] uppercase flex items-center justify-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-gray-900'}`}>
          {loading ? 'Processing...' : 'Update & Notify Citizen'}
        </button>
      </div>
    </div>
  );
}
