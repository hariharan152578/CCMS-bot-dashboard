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
    // Meta requires the phone number without any '+' prefix or special characters
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
    
    if (res.ok) {
        console.log(`✅ SUCCESS: Message delivered to Meta for ${cleanTo}`);
        await saveSystemLog('SUCCESS', `Message sent to ${cleanTo}`, { body });
    } else {
        const errorJson = await res.json();
        console.error('❌ META API REJECTED MESSAGE:', JSON.stringify(errorJson, null, 2));
        
        // Specific user-friendly error for token expiration
        let errorMsg = `Meta API Rejected message to ${cleanTo}`;
        if (errorJson.error?.code === 190) {
            errorMsg = "ACTION REQUIRED: WhatsApp Access Token has expired. Please update it in System Settings.";
        }
        await saveSystemLog('ERROR', errorMsg, errorJson);
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
    
    // Safety check for Meta's structure
    if (payload.object !== 'whatsapp_business_account') {
       return new NextResponse('Not a WhatsApp Event', { status: 200 });
    }

    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    
    // Ignore status updates (read/delivered icons)
    if (!changes || !changes.messages || !changes.messages[0]) {
      return new NextResponse('OK', { status: 200 });
    }

    const message = changes.messages[0];
    const phone = message.from; // e.g., "918870295336"
    const type = message.type;
    
    // ✅ Standardization: Use last 10 digits as the unique key for Indian numbers
    const phoneKey = phone.length >= 10 ? phone.slice(-10) : phone; 
    
    await saveSystemLog('INFO', `Incoming ${type} from ${phone}`, { phoneKey });

    let bodyText = '';
    if (type === 'text') bodyText = message.text?.body || '';

    const config = await getWaConfig();

    // Fetch or Initialize Bot State
    const stateRef = ref(db, `botState/${phoneKey}`);
    const stateSnap = await get(stateRef);
    let state = stateSnap.val() || { phone: phoneKey, currentStep: 'GREETING', tempData: {} };
    
    console.log(`📍 Current Step for ${phoneKey}: ${state.currentStep} -> Input: "${bodyText}"`);

    // GREETING/RESET triggers
    if (bodyText.toLowerCase() === 'reset' || bodyText.toLowerCase() === 'hi') {
      state.currentStep = 'GREETING';
      state.tempData = {};
    }

    let nextStep = state.currentStep;
    let responseBody = '';

    // --- FSM SWITCH ---
    switch (state.currentStep) {
      case 'GREETING':
        responseBody = getMessage('welcome');
        nextStep = 'LANGUAGE_SELECTION';
        break;

      case 'LANGUAGE_SELECTION':
        const lang: Language = bodyText === '2' ? 'ta' : 'en';
        state.tempData.language = lang;
        
        // Re-check registration to populate profile data
        const userSnap = await get(ref(db, `users/${phoneKey}`));
        if (!userSnap.exists()) {
          responseBody = getMessage('registration_name', lang);
          nextStep = 'REGISTRATION_NAME';
        } else {
          const registeredUser = userSnap.val();
          state.tempData.ward = registeredUser.ward || 'N/A';
          state.tempData.name = registeredUser.name || 'Citizen';
          responseBody = getMessage('main_menu', lang);
          nextStep = 'BOT_MODE_SELECTION';
        }
        break;

      case 'BOT_MODE_SELECTION':
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
        state.tempData.name = bodyText;
        responseBody = getMessage('registration_ward', (state.tempData.language || 'en') as Language);
        nextStep = 'REGISTRATION_WARD';
        break;

      case 'REGISTRATION_WARD':
        state.tempData.ward = bodyText;
        responseBody = getMessage('registration_address', (state.tempData.language || 'en') as Language);
        nextStep = 'REGISTRATION_ADDRESS';
        break;

      case 'REGISTRATION_ADDRESS':
        state.tempData.address = bodyText;
        responseBody = getMessage('registration_pincode', (state.tempData.language || 'en') as Language);
        nextStep = 'REGISTRATION_PINCODE';
        break;

      case 'REGISTRATION_PINCODE':
        const rLang = (state.tempData.language || 'en') as Language;
        state.tempData.pincode = bodyText;
        
        // Persist new user profile
        await set(ref(db, `users/${phoneKey}`), {
          phone: phone,
          ...state.tempData,
          createdAt: serverTimestamp()
        });
        
        responseBody = getMessage('registration_complete', rLang) + '\n\n' + getMessage('main_menu', rLang);
        nextStep = 'BOT_MODE_SELECTION';
        break;

      case 'CATEGORY_SELECTION':
        const catLang = (state.tempData.language || 'en') as Language;
        const categories = ['Water Issue', 'Electricity', 'Road Damage', 'Garbage', 'Other'];
        const idx = parseInt(bodyText, 10) - 1;
        state.tempData.category = (idx >= 0 && idx < categories.length) ? categories[idx] : 'Other';
        
        responseBody = getMessage('describe_issue', catLang);
        nextStep = 'COMPLAINT_DESCRIPTION';
        break;

      case 'COMPLAINT_DESCRIPTION':
        state.tempData.description = bodyText;
        responseBody = getMessage('share_location', (state.tempData.language || 'en') as Language);
        nextStep = 'LOCATION_CAPTURE';
        break;

      case 'LOCATION_CAPTURE':
        // Simplified for text-only debugging, but handles 'skip'
        const lLang = (state.tempData.language || 'en') as Language;
        responseBody = getMessage('upload_media', lLang);
        nextStep = 'FILE_UPLOAD';
        break;

      default:
        responseBody = 'Sorry, the session was interrupted. Type "hi" to start again.';
        nextStep = 'GREETING';
        break;
    }

    // ✅ ROBUST PROGRESSION: Save state FIRST to ensure we don't get stuck in loops
    state.currentStep = nextStep;
    state.lastInteraction = Date.now();
    await set(stateRef, state);

    // Send the response message via Meta API
    if (responseBody) {
        await sendWhatsAppMessage(phone, responseBody, config);
    }

    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Webhook payload error:', error);
    // Always return 200 to Meta so they stop retrying failed events
    return new NextResponse('OK', { status: 200 });
  }
}