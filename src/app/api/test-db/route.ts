import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';

export async function GET() {
  try {
    const phone = "919876543210";
    const phoneKey = phone.replace(/[^a-zA-Z0-9]/g, '');
    
    // Simulate a final save trigger
    const currentYear = new Date().getFullYear();
    const counterRef = ref(db, `counters/complaints-${currentYear}`);
    const counterSnap = await get(counterRef);
    let currentCount = counterSnap.exists() ? counterSnap.val() : 0;
    currentCount += 1;
    await set(counterRef, currentCount);
    
    const complaintIdStr = `CMP-${currentYear}-${currentCount.toString().padStart(6, '0')}`;
    const newComplaintRef = ref(db, `complaints/${complaintIdStr}`);
    
    console.log(`🔥 [TEST ROUTE] SAVING COMPLAINT: ${complaintIdStr} for ${phone}`);

    await set(newComplaintRef, {
      complaintId: complaintIdStr,
      userId: phoneKey,
      type: 'Complaint',
      category: 'Water Issue',
      description: 'Automated Test: Pipe burst simulated via /api/test-db',
      location: { lat: '12.9716', lng: '77.5946', address: 'Simulated Test Location' },
      status: 'Pending',
      priority: 'High',
      createdAt: Date.now(),
      history: { [Date.now()]: { status: 'Pending', message: 'Test Complaint Created', updatedAt: Date.now() } }
    });

    return NextResponse.json({ success: true, complaintId: complaintIdStr });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
