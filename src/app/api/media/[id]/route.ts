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

    // Step 1: Get media URL from Meta
    const metaUrl = `https://graph.facebook.com/v20.0/${id}`;
    const metaRes = await fetch(metaUrl, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    });

    const metaData = await metaRes.json();

    if (!metaRes.ok || !metaData.url) {
      console.error('Meta Media Meta-Data Error:', metaData);
      return new NextResponse('Failed to fetch media metadata', { status: metaRes.status });
    }

    // Step 2: Fetch the actual binary content from Meta (with Auth header)
    const mediaRes = await fetch(metaData.url, {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`
      }
    });

    if (!mediaRes.ok) {
      console.error('Meta Binary Download Error:', mediaRes.status);
      return new NextResponse('Failed to stream media content', { status: mediaRes.status });
    }

    // Step 3: Stream the content back to the browser
    const headers = new Headers();
    if (metaData.mime_type) headers.set('Content-Type', metaData.mime_type);
    if (metaData.file_size) headers.set('Content-Length', metaData.file_size.toString());
    
    // Safety check for cache
    headers.set('Cache-Control', 'public, max-age=3600');

    return new Response(mediaRes.body, {
      status: 200,
      headers
    });

  } catch (error: any) {
    console.error('Media Proxy Streaming Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
