import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, set, serverTimestamp } from 'firebase/database';

async function getWaConfig() {
  const snap = await get(ref(db, 'settings/whatsapp'));
  return snap.exists() ? snap.val() : null;
}

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

async function sendWhatsAppMessage(to: string, body: string, config: any) {
  if (!config || !config.accessToken || !config.phoneNumberId) {
    const msg = `WhatsApp API credentials missing in Firebase Settings!`;
    console.warn(`⚠️  REPLY FAILED: ${msg}`);
    await saveSystemLog('ERROR', msg, { to, body });
    return;
  }
  
  try {
    const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
    // Meta requires the phone number without any '+' prefix
    const cleanTo = to.replace(/\+/g, '').trim();
    
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
        console.error('❌ META API REJECTED MESSAGE:');
        console.error(JSON.stringify(errorJson, null, 2));
        await saveSystemLog('ERROR', `Meta API Rejected message to ${cleanTo}`, errorJson);
        
        // Specific hints for common mistakes
        if (errorJson.error?.code === 190) {
          console.error("👉 HINT: Your Access Token has expired! Get a new one from Meta Portal.");
        } else if (errorJson.error?.code === 100) {
          console.error("👉 HINT: Phone Number ID is likely incorrect OR the recipient is not in your allowlist.");
        } else if (errorJson.error?.message?.includes('Support Window')) {
          console.error("👉 HINT: The 24-hour Support Window is closed. The citizen must message you first.");
        }
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
    // Meta requires the raw challenge phrase back
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
    console.log('📩 Incoming Meta Webhook Payload:', JSON.stringify(payload, null, 2));

    // Ensure it's a WhatsApp API payload
    if (payload.object !== 'whatsapp_business_account') {
       return new NextResponse('Not a WhatsApp Event', { status: 404 });
    }

    // Attempt to extract the first message
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0]?.value;
    
    // It might be a status update (read/delivered), ignore those
    if (!changes || !changes.messages || !changes.messages[0]) {
      return new NextResponse('Missing Message Object / Ignored Event', { status: 200 });
    }

    const message = changes.messages[0];
    const phone = message.from; // e.g. "919876543210"
    console.log(`📞 Raw phone from Meta: ${phone}`);
    const type = message.type;
    
    await saveSystemLog('INFO', `Incoming ${type} from ${phone}`);

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
    } else if (['image', 'video', 'document'].includes(type) && message[type]) {
      mediaId = message[type].id;
    }

    const config = await getWaConfig();

    const phoneKey = phone.replace(/[^a-zA-Z0-9]/g, ''); // Ensure safe key for RTDB

    console.log(`🤖 Processing message from ${phone}: "${bodyText || type}"`);

    // Find bot state
    const stateRef = ref(db, `botState/${phoneKey}`);
    const stateSnap = await get(stateRef);
    let state = stateSnap.val() || { phone: phoneKey, currentStep: 'GREETING', tempData: {} };
    
    // Update live state tracking
    state.lastMessage = bodyText || `[${type}]`;
    state.lastInteraction = Date.now();
    
    console.log(`📍 Current Bot Step for ${phone}: ${state.currentStep}`);

    // Reset loop
    if (bodyText.toLowerCase() === 'reset' || (bodyText.toLowerCase() === 'hi' && (state.currentStep !== 'GREETING' && state.currentStep !== 'LANGUAGE_SELECTION'))) {
      state.currentStep = 'GREETING';
      state.tempData = {};
      console.log(`🔄 Session Reset requested by ${phone}`);
    }

    let nextStep = state.currentStep;

    switch (state.currentStep) {
      case 'GREETING':
        console.log(`➡️  GREETING: Sending welcome message to ${phone}`);
        await saveSystemLog('INFO', `FSM: GREETING for ${phone}`);
        await sendWhatsAppMessage(phone, 'Hello! Welcome to Local Citizen Support System 🙏\nPlease select your language:\n1. English\n2. Tamil', config);
        nextStep = 'LANGUAGE_SELECTION';
        break;

      case 'LANGUAGE_SELECTION':
        state.tempData.language = bodyText === '2' ? 'ta' : 'en';
        console.log(`➡️  LANGUAGE_SELECTION: User chose ${state.tempData.language}.`);
        await saveSystemLog('INFO', `FSM: User chose ${state.tempData.language}`, { phone });
        
        // Check if user is registered
        const userSnap = await get(ref(db, `users/${phoneKey}`));
        if (!userSnap.exists()) {
          console.log(`➡️  LANGUAGE_SELECTION: User ${phone} not registered. Moving to REGISTRATION_NAME.`);
          await sendWhatsAppMessage(phone, 'Please provide your Full Name to register:', config);
          nextStep = 'REGISTRATION_NAME';
        } else {
          console.log(`➡️  LANGUAGE_SELECTION: User ${phone} is already registered. Moving to BOT_MODE_SELECTION.`);
          await sendWhatsAppMessage(phone, 'How can we help you today?\n1. Raise a Complaint 📢\n2. General Query / Question ❓', config);
          nextStep = 'BOT_MODE_SELECTION';
        }
        break;

      case 'BOT_MODE_SELECTION':
        if (bodyText === '1') {
          console.log(`➡️  BOT_MODE_SELECTION: User chose COMPLAINT.`);
          await saveSystemLog('INFO', `FSM: User chose COMPLAINT`, { phone });
          await sendWhatsAppMessage(phone, 'Please select a category:\n1. Water Issue 💧\n2. Electricity ⚡\n3. Road Damage 0x1f6e3\ufe0f\n4. Garbage 🗑️\n5. Other', config);
          state.tempData.mode = 'COMPLAINT';
          nextStep = 'CATEGORY_SELECTION';
        } else if (bodyText === '2') {
          console.log(`➡️  BOT_MODE_SELECTION: User chose QUERY.`);
          await saveSystemLog('INFO', `FSM: User chose QUERY`, { phone });
          await sendWhatsAppMessage(phone, 'Please type your question or query clearly below:', config);
          state.tempData.mode = 'QUERY';
          nextStep = 'QUERY_CAPTURE';
        } else {
          await saveSystemLog('WARN', `FSM: Invalid Selection in BOT_MODE_SELECTION from ${phone}`, { bodyText });
          await sendWhatsAppMessage(phone, 'Invalid selection. Please reply with 1 or 2.', config);
        }
        break;

      case 'QUERY_CAPTURE':
        state.tempData.description = bodyText;
        // Generate Query ID
        const qYear = new Date().getFullYear();
        const qCounterRef = ref(db, `counters/queries-${qYear}`);
        const qCounterSnap = await get(qCounterRef);
        let qCount = qCounterSnap.exists() ? qCounterSnap.val() : 0;
        qCount += 1;
        await set(qCounterRef, qCount);

        const queryId = `QRY-${qYear}-${qCount.toString().padStart(6, '0')}`;
        await set(ref(db, `complaints/${queryId}`), {
          complaintId: queryId,
          userId: phoneKey,
          type: 'Query',
          language: state.tempData.language || 'en',
          description: bodyText,
          status: 'Pending',
          priority: 'Medium',
          createdAt: Date.now(),
          history: { [Date.now()]: { status: 'Received', message: 'General Query submitted', updatedAt: Date.now() } }
        });

        await sendWhatsAppMessage(phone, `Thank you! Your query has been received (ID: ${queryId}). We will notify you once an admin replies.`, config);
        nextStep = 'GREETING';
        state.tempData = {};
        break;

      case 'REGISTRATION_NAME':
        state.tempData.name = bodyText;
        await sendWhatsAppMessage(phone, 'Please provide your Area/Address:', config);
        nextStep = 'REGISTRATION_ADDRESS';
        break;

      case 'REGISTRATION_ADDRESS':
        state.tempData.address = bodyText;
        await sendWhatsAppMessage(phone, 'Please provide your PIN Code:', config);
        nextStep = 'REGISTRATION_PINCODE';
        break;

      case 'REGISTRATION_PINCODE':
        state.tempData.pincode = bodyText;
        
        // Save user
        await set(ref(db, `users/${phoneKey}`), {
          phone: phone,
          name: state.tempData.name,
          address: state.tempData.address,
          pincode: state.tempData.pincode,
          language: state.tempData.language || 'en',
          createdAt: serverTimestamp()
        });
        
        await sendWhatsAppMessage(phone, 'Registration complete ✅\n\nHow can we help you today?\n1. Raise a Complaint 📢\n2. General Query / Question ❓', config);
        nextStep = 'BOT_MODE_SELECTION';
        break;

      case 'CATEGORY_SELECTION':
        const categories = ['Water Issue', 'Electricity', 'Road Damage', 'Garbage', 'Other'];
        const selectionIndex = parseInt(bodyText, 10) - 1;
        
        if (selectionIndex >= 0 && selectionIndex <= 3) {
          state.tempData.category = categories[selectionIndex];
          await sendWhatsAppMessage(phone, `You selected ${state.tempData.category}. Please describe your issue:`, config);
          nextStep = 'COMPLAINT_DESCRIPTION';
        } else if (bodyText === '5') {
          state.tempData.category = 'Other';
          await sendWhatsAppMessage(phone, 'Please type your custom category:', config);
          nextStep = 'CUSTOM_CATEGORY';
        } else {
          await sendWhatsAppMessage(phone, 'Invalid selection. Please reply with a number from 1 to 5.', config);
        }
        break;
        
      case 'CUSTOM_CATEGORY':
        state.tempData.customCategory = bodyText;
        await sendWhatsAppMessage(phone, 'Please describe your issue:', config);
        nextStep = 'COMPLAINT_DESCRIPTION';
        break;

      case 'COMPLAINT_DESCRIPTION':
        state.tempData.description = bodyText;
        await sendWhatsAppMessage(phone, 'Please share your current location 📍 (Tap attachment -> Location -> Send)', config);
        nextStep = 'LOCATION_CAPTURE';
        break;

      case 'LOCATION_CAPTURE':
        if (lat && lng) {
          state.tempData.location = { lat, lng, address: address || 'Shared Location' };
          await sendWhatsAppMessage(phone, 'Location received. If you have any image, PDF or video, please upload it now, or type "skip".', config);
          nextStep = 'FILE_UPLOAD';
        } else {
          await sendWhatsAppMessage(phone, 'We did not receive a location. Please tap attachment -> Location -> Send, or type "skip" to ignore.', config);
          if (bodyText.toLowerCase() === 'skip') {
             state.tempData.location = { lat: '0', lng: '0', address: 'Not provided' };
             await sendWhatsAppMessage(phone, 'Location skipped. If you have any image, PDF or video, please upload it now, or type "skip".', config);
             nextStep = 'FILE_UPLOAD';
          }
        }
        break;

      case 'FILE_UPLOAD':
        const mediaArray = [];
        if (mediaId) mediaArray.push(mediaId); 
        
        // Finalize complaint
        const submittingUserSnap = await get(ref(db, `users/${phoneKey}`));
        if (submittingUserSnap.exists()) {
           const currentYear = new Date().getFullYear();
           const counterRef = ref(db, `counters/complaints-${currentYear}`);
           const counterSnap = await get(counterRef);
           let currentCount = counterSnap.exists() ? counterSnap.val() : 0;
           currentCount += 1;
           await set(counterRef, currentCount);
           
           const complaintIdStr = `CMP-${currentYear}-${currentCount.toString().padStart(6, '0')}`;
           const newComplaintRef = ref(db, `complaints/${complaintIdStr}`);
           
           console.log(`🔥 SAVING COMPLAINT: ${complaintIdStr} for ${phone}`);

           await set(newComplaintRef, {
             complaintId: complaintIdStr,
             userId: phoneKey,
             type: 'Complaint',
             language: state.tempData.language || 'en',
             category: state.tempData.category,
             customCategory: state.tempData.customCategory || null,
             description: state.tempData.description,
             media: mediaArray,
             location: state.tempData.location,
             status: 'Pending',
             priority: 'Medium',
             history: { [Date.now()]: { status: 'Pending', message: 'Complaint created via WhatsApp', updatedAt: Date.now() } },
             createdAt: Date.now()
           });
           
           await sendWhatsAppMessage(phone, `Your complaint has been registered successfully ✅\nComplaint ID: ${complaintIdStr}\nWe will notify you of any updates.`, config);
        }
        
        nextStep = 'GREETING'; // Reset session
        state.tempData = {};
        break;

      default:
        await sendWhatsAppMessage(phone, 'Sorry, I am confused. Type "hi" to restart.', config);
        nextStep = 'GREETING';
        break;
    }

    state.currentStep = nextStep;
    state.lastInteraction = serverTimestamp();
    await set(stateRef, state);

    // Always acknowledge Meta receipt within 200 ms!
    return new NextResponse('EVENT_RECEIVED', { status: 200 });
  } catch (error) {
    console.error('Webhook payload error:', error);
    // Even on error, it's best to 200 OK so Meta doesn't pause webhooks
    return new NextResponse('Internal Error caught and ignored for Meta', { status: 200 });
  }
}
