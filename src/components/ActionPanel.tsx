'use client';

import { useState } from 'react';

export default function ActionPanel({ complaintId, currentStatus, currentPriority }: { complaintId: string, currentStatus: string, currentPriority: string }) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState(currentStatus || 'Pending');
  const [priority, setPriority] = useState(currentPriority || 'Medium');
  const [assignee, setAssignee] = useState('Unassigned');

  const handleSubmit = async () => {
    if (!confirm(`Are you sure you want to update this complaint? A WhatsApp notification will be sent.`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/complaints/${complaintId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason, priority })
      });
      if (res.ok) {
        setReason('');
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
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value)} 
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-red-500"
        >
          <option value="Pending">PENDING</option>
          <option value="In Progress">IN PROGRESS</option>
          <option value="Resolved">RESOLVED</option>
          <option value="Rejected">REJECTED</option>
        </select>
      </div>
      
      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Assignee</label>
        <select 
          value={assignee} 
          onChange={(e) => setAssignee(e.target.value)} 
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-red-500"
        >
          <option value="Unassigned">Assignee</option>
          <option value="Admin Team">Admin Team</option>
          <option value="Field Ops">Field Ops</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
        <select 
          value={priority} 
          onChange={(e) => setPriority(e.target.value)} 
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-red-500"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700 mb-1">WhatsApp Reply</label>
        <textarea 
          placeholder="Write your reply message texts here"
          className="w-full text-sm text-gray-800 border border-gray-300 rounded p-3 outline-none focus:border-red-500 resize-none"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      <button 
        disabled={loading}
        onClick={handleSubmit}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-sm py-2.5 rounded transition-colors disabled:opacity-50 tracking-wide mt-2">
        Update Status & Send WhatsApp
      </button>
    </div>
  );
}
