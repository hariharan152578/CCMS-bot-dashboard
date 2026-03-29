import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, push, serverTimestamp } from 'firebase/database';

async function getWaConfig() {
  const snap = await get(ref(db, 'settings/whatsapp'));
  return snap.exists() ? snap.val() : null;
}

async function sendWhatsAppMessage(to: string, body: string, config: any) {
  if (!config || !config.accessToken || !config.phoneNumberId) return;
  try {
    const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
    const cleanTo = to.replace(/[^0-9]/g, '');
    
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
    console.error('Broadcast individual send error:', error);
  }
}

export async function POST(req: Request) {
  try {
    const { title, message } = await req.json();
    if (!message) return NextResponse.json({ error: 'Message is required' }, { status: 400 });

    const config = await getWaConfig();
    if (!config) return NextResponse.json({ error: 'WhatsApp Config missing' }, { status: 400 });

    const usersSnap = await get(ref(db, 'users'));
    if (!usersSnap.exists()) return NextResponse.json({ error: 'No users found' }, { status: 404 });

    const users = usersSnap.val();
    const phoneNumbers = Object.values(users).map((u: any) => u.phone);

    // Track the announcement in Firebase
    await push(ref(db, 'announcements'), {
       title,
       message,
       recipientCount: phoneNumbers.length,
       createdAt: serverTimestamp()
    });

    // Send messages (async)
    // For small number of users, this is ok. For thousands, push to a queue.
    const promises = phoneNumbers.map(phone => sendWhatsAppMessage(phone, `📢 *${title || 'Announcement'}*\n\n${message}`, config));
    
    // We don't necessarily need to wait for all if it's very large, 
    // but for now we'll wait 
    await Promise.all(promises);

    return NextResponse.json({ success: true, count: phoneNumbers.length });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
