import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, push, serverTimestamp } from 'firebase/database';

async function getWaConfig() {
  const snap = await get(ref(db, 'settings/whatsapp'));
  return snap.exists() ? snap.val() : null;
}

async function sendWhatsAppMessage(
  to: string, 
  body: string, 
  config: any, 
  mediaFiles: { url: string, type: string }[],
  audio?: { url: string, type: string }
) {
  if (!config || !config.accessToken || !config.phoneNumberId) return;
  const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
  const cleanTo = to.replace(/[^0-9]/g, '');

  try {
    // 1. Send each General Attachment
    for (const media of mediaFiles) {
      if (media.url) {
        let type = 'document';
        if (media.type.startsWith('image/')) type = 'image';
        else if (media.type.startsWith('audio/')) type = 'audio';
        else if (media.type.startsWith('video/')) type = 'video';

        const payload: any = {
          messaging_product: 'whatsapp',
          to: cleanTo,
          type: type,
          [type]: { link: media.url }
        };

        if (type === 'document') {
          payload.document.filename = media.url.split('/').pop() || 'attachment';
        }

        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
      }
    }

    // 2. Send Optional Audio Message
    if (audio && audio.url) {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanTo,
          type: 'audio',
          audio: { link: audio.url }
        })
      });
    }

    // 3. Send Text Body
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
    const { title, message, attachments, audio } = await req.json();
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
       attachments: attachments || [],
       audio: audio || null,
       recipientCount: phoneNumbers.length,
       createdAt: serverTimestamp()
    });

    // Send messages (async loop)
    const promises = phoneNumbers.map(phone => 
      sendWhatsAppMessage(
        phone, 
        `📢 *${title || 'Announcement'}*\n\n${message}`, 
        config,
        attachments || [],
        audio || undefined
      )
    );
    
    await Promise.all(promises);

    return NextResponse.json({ success: true, count: phoneNumbers.length });
  } catch (error) {
    console.error('Broadcast error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
