import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, set, serverTimestamp } from 'firebase/database';
import { getMessage, Language } from '@/lib/translations';

async function getWaConfig() {
  const snap = await get(ref(db, 'settings/whatsapp'));
  return snap.exists() ? snap.val() : null;
}

/**
 * Saves a diagnostic log to Firebase for admin visibility.
 */
async function saveSystemLog(type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN', message: string, detail?: any) {
  try {
    const logRef = ref(db, `systemLogs/${Date.now()}`);
    await set(logRef, {
      timestamp: Date.now(),
      type,
      message,
      detail: detail ? JSON.stringify(detail, null, 2) : null
    });
  } catch (err) {
    console.error('Failed to save system log:', err);
  }
}

/**
 * Sends a message via Meta WhatsApp Cloud API.
 */
async function sendWhatsAppMessage(to: string, body: string, config: any) {
  if (!config || !config.accessToken || !config.phoneNumberId) {
    const msg = `WhatsApp API credentials missing in Firebase Settings!`;
    console.warn(`⚠️  REPLY FAILED: ${msg}`);
    await saveSystemLog('ERROR', msg, { to, body });
    return;
  }
  
  if (!body || body.trim() === '') {
    console.warn(`⚠️  REPLY FAILED: Body is empty for ${to}`);
    return;
  }
  
  try {
    const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
    const cleanTo = to.replace(/\D/g, '').trim();
    
    console.log(`📡 Sending Meta Reply to ${cleanTo}...`);
    
    const res = await fetch(url, {
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
    
    const resData = await res.json().catch(() => ({}));
    
    if (res.ok) {
        console.log(`✅ SUCCESS: Message delivered to Meta for ${cleanTo}`);
        await saveSystemLog('SUCCESS', `Message sent to ${cleanTo}`, { body });
    } else {
        console.error('❌ META API REJECTED MESSAGE:', JSON.stringify(resData, null, 2));
        let errorMsg = `Meta API Rejected message to ${cleanTo}`;
        if (resData.error?.code === 190) {
            errorMsg = "ACTION REQUIRED: WhatsApp Access Token has expired. Please update it in System Settings.";
        }
        await saveSystemLog('ERROR', errorMsg, resData);
    }
  } catch (error: any) {
    console.error('❌ Network Error while sending message:', error);
    await saveSystemLog('ERROR', 'Network Error sending message', { error: error.message });
  }
}

// Meta Webhook Verification (GET Request)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const config = await getWaConfig();

  if (mode === 'subscribe' && token === config?.verifyToken) {
    console.log('✅ Webhook verified by Meta Successfully!');
    return new NextResponse(challenge, { status: 200 });
  } else {
    console.error('❌ Webhook Verification Failed', { mode, token, expectedToken: config?.verifyToken });
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// Meta Webhook Event Handler (POST Request)
export async function POST(req: Request) {
  try {
    const payload = await req.json();
    
    if (payload.object !== 'whatsapp_business_account') {
       return new NextResponse('Not a WhatsApp Event', { status: 200 });
    }

    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    
    if (!changes || !changes.messages || !changes.messages[0]) {
      return new NextResponse('OK', { status: 200 });
    }

    const message = changes.messages[0];
    const phone = message.from; 
    const type = message.type;
    const phoneKey = phone.length >= 10 ? phone.slice(-10) : phone; 
    
    let bodyText = '';
    let lat = '';
    let lng = '';
    let address = '';
    let mediaId = '';

    if (type === 'text') {
      bodyText = message.text?.body || '';
    } else if (type === 'location') {
      lat = message.location?.latitude?.toString() || '';
      lng = message.location?.longitude?.toString() || '';
      address = message.location?.address || 'Shared Meta Location';
    } else if (['image', 'video', 'document', 'audio'].includes(type) && message[type]) {
      mediaId = message[type].id;
    }

    console.log(`📩 Incoming ${type} from ${phone}: "${bodyText || type}"`);
    await saveSystemLog('INFO', `Incoming ${type} from ${phone}`, { phoneKey, bodyText, type });

    const config = await getWaConfig();
    const stateRef = ref(db, `botState/${phoneKey}`);
    const stateSnap = await get(stateRef);
    let state = stateSnap.val() || { phone: phoneKey, currentStep: 'GREETING', tempData: {} };
    if (!state.tempData) state.tempData = {}; // ✅ Robustness fix for legacy state
    
    console.log(`📍 Current Step for ${phoneKey}: ${state.currentStep}`);

    if (bodyText.toLowerCase() === 'reset' || bodyText.toLowerCase() === 'hi') {
      state.currentStep = 'GREETING';
      state.tempData = {};
      console.log(`🔄 Session Reset for ${phoneKey}`);
    }

    let nextStep = state.currentStep;
    let responseBody = '';

    // --- FSM SWITCH ---
    switch (state.currentStep) {
      case 'GREETING':
        console.log(`[FSM] GREETING -> Sending welcome`);
        responseBody = getMessage('welcome');
        nextStep = 'LANGUAGE_SELECTION';
        break;

      case 'LANGUAGE_SELECTION':
        console.log(`[FSM] LANGUAGE_SELECTION -> Input: ${bodyText}`);
        const lang: Language = bodyText === '2' ? 'ta' : 'en';
        state.tempData.language = lang;
        
        console.log(`[FSM] Fetching user registration for ${phoneKey}...`);
        const userSnap = await get(ref(db, `users/${phoneKey}`));
        
        if (!userSnap.exists()) {
          console.log(`[FSM] User NOT registered. Sending registration_name`);
          responseBody = getMessage('registration_name', lang);
          nextStep = 'REGISTRATION_NAME';
        } else {
          console.log(`[FSM] User IS registered. Sending main_menu`);
          const registeredUser = userSnap.val();
          state.tempData.ward = registeredUser.ward || 'N/A';
          state.tempData.name = registeredUser.name || 'Citizen';
          responseBody = getMessage('main_menu', lang);
          nextStep = 'BOT_MODE_SELECTION';
        }
        break;

      case 'BOT_MODE_SELECTION':
        console.log(`[FSM] BOT_MODE_SELECTION -> Input: ${bodyText}`);
        const modeLang = (state.tempData.language || 'en') as Language;
        if (bodyText === '1') {
          responseBody = getMessage('select_category', modeLang);
          state.tempData.mode = 'COMPLAINT';
          nextStep = 'CATEGORY_SELECTION';
        } else if (bodyText === '2') {
          responseBody = getMessage('describe_issue', modeLang);
          state.tempData.mode = 'QUERY';
          nextStep = 'QUERY_CAPTURE';
        } else {
          responseBody = getMessage('invalid_selection', modeLang);
        }
        break;

      case 'REGISTRATION_NAME':
        console.log(`[FSM] REGISTRATION_NAME -> Input: ${bodyText}`);
        state.tempData.name = bodyText;
        responseBody = getMessage('registration_ward', (state.tempData.language || 'en') as Language);
        nextStep = 'REGISTRATION_WARD';
        break;

      case 'REGISTRATION_WARD':
        console.log(`[FSM] REGISTRATION_WARD -> Input: ${bodyText}`);
        state.tempData.ward = bodyText;
        responseBody = getMessage('registration_address', (state.tempData.language || 'en') as Language);
        nextStep = 'REGISTRATION_ADDRESS';
        break;

      case 'REGISTRATION_ADDRESS':
        console.log(`[FSM] REGISTRATION_ADDRESS -> Input: ${bodyText}`);
        state.tempData.address = bodyText;
        responseBody = getMessage('registration_pincode', (state.tempData.language || 'en') as Language);
        nextStep = 'REGISTRATION_PINCODE';
        break;

      case 'REGISTRATION_PINCODE':
        console.log(`[FSM] REGISTRATION_PINCODE -> Input: ${bodyText}`);
        const rLang = (state.tempData.language || 'en') as Language;
        state.tempData.pincode = bodyText;
        
        console.log(`[FSM] Persisting new user profile...`);
        await set(ref(db, `users/${phoneKey}`), {
          phone: phone,
          ...state.tempData,
          createdAt: serverTimestamp()
        });
        
        responseBody = getMessage('registration_complete', rLang) + '\n\n' + getMessage('main_menu', rLang);
        nextStep = 'BOT_MODE_SELECTION';
        break;

      case 'CATEGORY_SELECTION':
        console.log(`[FSM] CATEGORY_SELECTION -> Input: ${bodyText}`);
        const catLang = (state.tempData.language || 'en') as Language;
        const categories = ['Water Issue', 'Electricity', 'Road Damage', 'Garbage', 'Other'];
        const idx = parseInt(bodyText, 10) - 1;
        state.tempData.category = (idx >= 0 && idx < 4) ? categories[idx] : 'Other';
        
        if (bodyText === '5') {
            responseBody = getMessage('custom_category', catLang);
            nextStep = 'CUSTOM_CATEGORY';
        } else {
            responseBody = getMessage('describe_issue', catLang);
            nextStep = 'COMPLAINT_DESCRIPTION';
        }
        break;

      case 'CUSTOM_CATEGORY':
        console.log(`[FSM] CUSTOM_CATEGORY -> Input: ${bodyText}`);
        state.tempData.customCategory = bodyText;
        state.tempData.category = 'Other';
        responseBody = getMessage('describe_issue', (state.tempData.language || 'en') as Language);
        nextStep = 'COMPLAINT_DESCRIPTION';
        break;

      case 'COMPLAINT_DESCRIPTION':
        console.log(`[FSM] COMPLAINT_DESCRIPTION -> Input: ${bodyText || type}`);
        state.tempData.description = bodyText || (type === 'audio' ? `AUDIO_MEDIA_ID:${mediaId}` : '');
        responseBody = getMessage('share_location', (state.tempData.language || 'en') as Language);
        nextStep = 'LOCATION_CAPTURE';
        break;

      case 'LOCATION_CAPTURE':
        console.log(`[FSM] LOCATION_CAPTURE -> Type: ${type}`);
        const lLang = (state.tempData.language || 'en') as Language;
        if (lat && lng) {
          state.tempData.location = { lat, lng, address: address || 'Shared Location' };
          responseBody = getMessage('upload_media', lLang);
          nextStep = 'FILE_UPLOAD';
        } else if (bodyText.toLowerCase() === 'skip') {
          state.tempData.location = { lat: '0', lng: '0', address: 'Not provided' };
          responseBody = getMessage('upload_media', lLang);
          nextStep = 'FILE_UPLOAD';
        } else {
          responseBody = getMessage('location_missing', lLang);
        }
        break;

      case 'FILE_UPLOAD':
        console.log(`[FSM] FILE_UPLOAD -> Type: ${type}`);
        const fLang = (state.tempData.language || 'en') as Language;
        if (!state.tempData.media) state.tempData.media = [];
        
        if (mediaId) {
          state.tempData.media.push(mediaId);
          responseBody = getMessage('media_received', fLang);
          nextStep = 'FILE_UPLOAD';
        } else if (bodyText.toLowerCase() === 'done' || bodyText.toLowerCase() === 'skip') {
          responseBody = getMessage('complaint_summary', fLang, {
            category: state.tempData.category,
            description: state.tempData.description,
            address: state.tempData.location?.address || 'N/A',
            ward: state.tempData.ward || 'N/A'
          });
          nextStep = 'SUMMARY_CONFIRMATION';
        } else {
          responseBody = getMessage('upload_media', fLang);
        }
        break;

      case 'SUMMARY_CONFIRMATION':
        console.log(`[FSM] SUMMARY_CONFIRMATION -> Input: ${bodyText}`);
        const cLang = (state.tempData.language || 'en') as Language;
        if (bodyText === '1') {
          console.log(`[FSM] Finalizing complaint submission...`);
          const year = new Date().getFullYear();
          const counterRef = ref(db, `counters/complaints-${year}`);
          const cSnap = await get(counterRef);
          let count = cSnap.exists() ? cSnap.val() : 0;
          count += 1;
          await set(counterRef, count);
          
          const id = `CMP-${year}-${count.toString().padStart(6, '0')}`;
          await set(ref(db, `complaints/${id}`), {
            complaintId: id,
            userId: phoneKey,
            type: 'Complaint',
            language: cLang,
            ward: state.tempData.ward || 'N/A',
            category: state.tempData.category,
            customCategory: state.tempData.customCategory || null,
            description: state.tempData.description,
            media: state.tempData.media || [],
            location: state.tempData.location,
            status: 'Pending',
            priority: 'Medium',
            history: { [Date.now()]: { status: 'Pending', message: 'Complaint created via WhatsApp', updatedAt: Date.now() } },
            createdAt: Date.now()
          });
          
          console.log(`[FSM] Complaint ${id} saved. Sending confirmation.`);
          responseBody = getMessage('complaint_submitted', cLang, { id });
          nextStep = 'GREETING';
          state.tempData = {};
        } else if (bodyText === '2') {
          responseBody = getMessage('describe_issue', cLang);
          nextStep = 'COMPLAINT_DESCRIPTION';
        } else {
          responseBody = getMessage('invalid_selection', cLang);
        }
        break;

      case 'QUERY_CAPTURE':
        console.log(`[FSM] QUERY_CAPTURE -> Input: ${bodyText}`);
        const qLang = (state.tempData.language || 'en') as Language;
        const qYear = new Date().getFullYear();
        const qRef = ref(db, `counters/queries-${qYear}`);
        const qSnap = await get(qRef);
        let qCount = qSnap.exists() ? qSnap.val() : 0;
        qCount += 1;
        await set(qRef, qCount);
        
        const qId = `QRY-${qYear}-${qCount.toString().padStart(6, '0')}`;
        await set(ref(db, `complaints/${qId}`), {
          complaintId: qId,
          userId: phoneKey,
          type: 'Query',
          language: qLang,
          description: bodyText || (type === 'audio' ? `AUDIO_MEDIA_ID:${mediaId}` : ''),
          status: 'Pending',
          priority: 'Medium',
          createdAt: Date.now(),
          history: { [Date.now()]: { status: 'Received', message: 'Query received via WhatsApp', updatedAt: Date.now() } }
        });
        
        responseBody = getMessage('query_received', qLang, { id: qId });
        nextStep = 'GREETING';
        state.tempData = {};
        break;

      default:
        console.log(`[FSM] Unknown Step: ${state.currentStep}. Resetting.`);
        nextStep = 'GREETING';
        break;
    }

    console.log(`➡️ Next Step for ${phoneKey}: ${nextStep}`);
    state.currentStep = nextStep;
    state.lastInteraction = Date.now();
    await set(stateRef, state);

    if (responseBody) {
        console.log(`💬 Response to send: "${responseBody.substring(0, 50)}..."`);
        await sendWhatsAppMessage(phone, responseBody, config);
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error: any) {
    console.error('CRITICAL Webhook Error:', error);
    await saveSystemLog('ERROR', `Webhook CRASH: ${error.message}`, { stack: error.stack });
    return new NextResponse('OK', { status: 200 });
  }
}