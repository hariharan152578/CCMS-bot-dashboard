import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get } from 'firebase/database';

async function getWaConfig() {
  const snap = await get(ref(db, 'settings/whatsapp'));
  return snap.exists() ? snap.val() : null;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const config = await getWaConfig();

    if (!config || !config.accessToken) {
      return new NextResponse('WhatsApp Configuration Missing', { status: 500 });
    }

    const url = `https://graph.facebook.com/v20.0/${id}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    });

    const data = await res.json();

    if (!res.ok || !data.url) {
      console.error('Meta Media API Error:', data);
      return new NextResponse('Failed to fetch media URL', { status: res.status });
    }

    // Redirect to the actual media file (Meta's temporary URL)
    return NextResponse.redirect(data.url);
  } catch (error: any) {
    console.error('Media Proxy Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
