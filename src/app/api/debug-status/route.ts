import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';

export async function GET() {
  const report: any = {
    timestamp: new Date().toISOString(),
    firebase: { status: 'Checking...', url: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'Missing' },
    whatsapp: { status: 'Checking...' }
  };

  try {
    // 1. Test Firebase Connectivity (Read)
    const snap = await get(ref(db, 'settings/whatsapp'));
    report.firebase.status = '✅ Connected';
    
    if (snap.exists()) {
      const config = snap.val();
      report.whatsapp.hasAccessToken = !!config.accessToken;
      report.whatsapp.hasPhoneId = !!config.phoneNumberId;
      report.whatsapp.verifyTokenMatch = config.verifyToken === 'mytoken123';
      
      if (config.accessToken && config.phoneNumberId) {
        report.whatsapp.status = '✅ Configured';
      } else {
        report.whatsapp.status = '❌ Incomplete Credentials';
      }
    } else {
      report.whatsapp.status = '❌ Missing settings/whatsapp in Database';
    }

    // 2. Test Firebase Write (Heartbeat)
    await set(ref(db, 'system/heartbeat'), Date.now());
    report.firebase.writeAccess = '✅ Success';

  } catch (error: any) {
    console.error('Diagnostic error:', error);
    report.error = error.message;
    report.firebase.status = '❌ Failed';
  }

  return NextResponse.json(report);
}
