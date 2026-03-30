import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, push, serverTimestamp } from 'firebase/database';

async function getWaConfig() {
  const snap = await get(ref(db, 'settings/whatsapp'));
  return snap.exists() ? snap.val() : null;
}

export async function POST(req: Request) {
  try {
    const { phone, message } = await req.json();
    if (!phone || !message) {
      return NextResponse.json({ error: 'Phone and message are required' }, { status: 400 });
    }

    const config = await getWaConfig();
    if (!config || !config.accessToken || !config.phoneNumberId) {
      return NextResponse.json({ error: 'WhatsApp configuration is incomplete' }, { status: 400 });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const phoneKey = cleanPhone.length === 12 ? cleanPhone.substring(2) : cleanPhone;

    // 1. Send WhatsApp message via Meta
    const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message }
      })
    });

    const resData = await response.json();
    if (!response.ok) {
      console.error('Meta API Error:', resData);
      return NextResponse.json({ error: 'Failed to send WhatsApp message', details: resData }, { status: 500 });
    }

    // 2. Log to Firebase Chat History
    const chatRef = ref(db, `chats/${phoneKey}/messages`);
    await push(chatRef, {
      text: message,
      sender: 'admin',
      timestamp: serverTimestamp(),
      waMessageId: resData.messages?.[0]?.id
    });

    return NextResponse.json({ success: true, messageId: resData.messages?.[0]?.id });

  } catch (error) {
    console.error('Internal Contact API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
