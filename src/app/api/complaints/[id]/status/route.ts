import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, update } from 'firebase/database';

async function getWaConfig() {
  const snap = await get(ref(db, 'settings/whatsapp'));
  return snap.exists() ? snap.val() : null;
}

async function sendWhatsAppMessage(to: string, body: string, config: any) {
  if (!config || !config.accessToken || !config.phoneNumberId) {
    console.warn(`[API Missing Config] Msg to ${to}: ${body}`);
    return;
  }
  try {
    const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
    const cleanTo = to.replace(/[^0-9]/g, ''); // Ensure numeric string only
    
    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanTo,
        type: 'text',
        text: { body: body }
      })
    });
  } catch (error) {
    console.error('Fetch Error sending message:', error);
  }
}
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, reason, priority } = body;

    if (status && !['Pending', 'In Progress', 'Resolved', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const complaintRef = ref(db, `complaints/${id}`);
    const complaintSnap = await get(complaintRef);
    
    if (!complaintSnap.exists()) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
    }

    const complaint = complaintSnap.val();
    
    const timestamp = Date.now();
    const updatePayload: any = {};
    
    if (status) updatePayload.status = status;
    if (priority) updatePayload.priority = priority;
    
    // Add to history tree using timestamp as key for concurrency safety
    updatePayload[`history/${timestamp}`] = {
      status: status || complaint.status,
      message: reason || `Admin updated complaint`,
      updatedAt: timestamp
    };

    if (status === 'Resolved') updatePayload.resolvedAt = timestamp;

    await update(complaintRef, updatePayload);

    // Notify user via WhatsApp
    const userId = complaint.userId; 
    if (userId && reason) { 
      const userSnap = await get(ref(db, `users/${userId}`));
      if (userSnap.exists()) {
        const user = userSnap.val();
        const config = await getWaConfig();
        const notificationStatus = status || complaint.status;
        const messageBody = `Hello ${user.name || ''},\n\nYour complaint update 📢\nID: ${complaint.complaintId || id}\nStatus: *${notificationStatus.toUpperCase()}*\nMessage: ${reason}`;
        
        await sendWhatsAppMessage(user.phone, messageBody, config);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
