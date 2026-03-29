// import { NextResponse } from 'next/server';
// import { db } from '@/lib/firebase';
// import { ref, get, set, serverTimestamp } from 'firebase/database';
// import { getMessage, Language } from '@/lib/translations';

// async function getWaConfig() {
//   const snap = await get(ref(db, 'settings/whatsapp'));
//   return snap.exists() ? snap.val() : null;
// }

// async function saveSystemLog(type: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN', message: string, detail?: any) {
//   try {
//     const logRef = ref(db, `systemLogs/${Date.now()}`);
//     await set(logRef, {
//       timestamp: Date.now(),
//       type,
//       message,
//       detail: detail ? JSON.stringify(detail, null, 2) : null
//     });
//   } catch (err) {
//     console.error('Failed to save system log:', err);
//   }
// }

// async function sendWhatsAppMessage(to: string, body: string, config: any) {
//   if (!config || !config.accessToken || !config.phoneNumberId) {
//     const msg = `WhatsApp API credentials missing in Firebase Settings!`;
//     console.warn(`⚠️  REPLY FAILED: ${msg}`);
//     await saveSystemLog('ERROR', msg, { to, body });
//     return;
//   }
  
//   if (!body || body.trim() === '') {
//     console.warn(`⚠️  REPLY FAILED: Body is empty for ${to}`);
//     return;
//   }
  
//   try {
//     const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
//     // Meta requires the phone number without any '+' prefix
//     const cleanTo = to.replace(/\+/g, '').trim();
    
//     console.log(`📡 Sending Meta Reply to ${cleanTo}...`);
//     console.log(`💬 Body: ${body.substring(0, 50)}${body.length > 50 ? '...' : ''}`);
    
//     const res = await fetch(url, {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${config.accessToken}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({
//         messaging_product: 'whatsapp',
//         to: cleanTo,
//         type: 'text',
//         text: { body: body }
//       })
//     });
    
//     if (res.ok) {
//         console.log(`✅ SUCCESS: Message delivered to Meta for ${cleanTo}`);
//         await saveSystemLog('SUCCESS', `Message sent to ${cleanTo}`, { body });
//     } else {
//         const errorJson = await res.json();
//         console.error('❌ META API REJECTED MESSAGE:');
//         console.error(JSON.stringify(errorJson, null, 2));
//         await saveSystemLog('ERROR', `Meta API Rejected message to ${cleanTo}`, errorJson);
        
//         // Specific hints for common mistakes
//         if (errorJson.error?.code === 190) {
//           console.error("👉 HINT: Your Access Token has expired! Get a new one from Meta Portal.");
//         } else if (errorJson.error?.code === 100) {
//           console.error("👉 HINT: Phone Number ID is likely incorrect OR the recipient is not in your allowlist.");
//         } else if (errorJson.error?.message?.includes('Support Window')) {
//           console.error("👉 HINT: The 24-hour Support Window is closed. The citizen must message you first.");
//         }
//     }
//   } catch (error: any) {
//     console.error('❌ Network Error while sending message:', error);
//     await saveSystemLog('ERROR', 'Network Error sending message', { error: error.message });
//   }
// }

// // Meta Webhook Verification (GET Request)
// export async function GET(req: Request) {
//   const url = new URL(req.url);
//   const mode = url.searchParams.get('hub.mode');
//   const token = url.searchParams.get('hub.verify_token');
//   const challenge = url.searchParams.get('hub.challenge');

//   const config = await getWaConfig();

//   if (mode === 'subscribe' && token === config?.verifyToken) {
//     console.log('✅ Webhook verified by Meta Successfully!');
//     // Meta requires the raw challenge phrase back
//     return new NextResponse(challenge, { status: 200 });
//   } else {
//     console.error('❌ Webhook Verification Failed', { mode, token, expectedToken: config?.verifyToken });
//     return new NextResponse('Forbidden', { status: 403 });
//   }
// }

// // Meta Webhook Event Handler (POST Request)
// export async function POST(req: Request) {
//   try {
//     const payload = await req.json();
//     console.log('📩 Incoming Meta Webhook Payload:', JSON.stringify(payload, null, 2));

//     // Ensure it's a WhatsApp API payload
//     if (payload.object !== 'whatsapp_business_account') {
//        return new NextResponse('Not a WhatsApp Event', { status: 404 });
//     }

//     // Attempt to extract the first message
//     const entry = payload.entry?.[0];
//     const changes = entry?.changes?.[0]?.value;
    
//     // It might be a status update (read/delivered), ignore those
//     if (!changes || !changes.messages || !changes.messages[0]) {
//       return new NextResponse('Missing Message Object / Ignored Event', { status: 200 });
//     }

//     const message = changes.messages[0];
//     const phone = message.from; // e.g. "919876543210"
//     console.log(`📞 Raw phone from Meta: ${phone}`);
//     const type = message.type;
    
//     // Normalize phone key to last 10 digits for Indian users (+91)
//     // This ensures consistency if the phone comes as "91987..." or just "987..."
//     const phoneKey = phone.length >= 10 ? phone.slice(-10) : phone.replace(/[^0-9]/g, ''); 
    
//     await saveSystemLog('INFO', `Incoming ${type} from ${phone}`, { phoneKey });

//     let bodyText = '';
//     let lat = '';
//     let lng = '';
//     let address = '';
//     let mediaId = '';

//     if (type === 'text') {
//       bodyText = message.text?.body || '';
//     } else if (type === 'location') {
//       lat = message.location?.latitude?.toString() || '';
//       lng = message.location?.longitude?.toString() || '';
//       address = message.location?.address || 'Shared Meta Location';
//     } else if (['image', 'video', 'document'].includes(type) && message[type]) {
//       mediaId = message[type].id;
//     }

//     console.log(`[TRACE 1] Fetching WhatsApp Config from Firebase...`);
//     const config = await getWaConfig();
//     console.log(`[TRACE 2] Config fetched: ${config ? 'YES (keys: ' + Object.keys(config).join(', ') + ')' : 'NO'}`);

//     console.log(`🤖 Processing message from ${phone}: "${bodyText || type}"`);

//     // Find bot state
//     console.log(`[TRACE 3] Fetching Bot State from Firebase...`);
//     const stateRef = ref(db, `botState/${phoneKey}`);
//     const stateSnap = await get(stateRef);
//     let state = stateSnap.val() || { phone: phoneKey, currentStep: 'GREETING', tempData: {} };
//     console.log(`[TRACE 4] Bot state fetched: ${JSON.stringify(state)}`);
    
//     // Update live state tracking
//     state.lastMessage = bodyText || `[${type}]`;
//     state.lastInteraction = Date.now();
    
//     console.log(`📍 Current Bot Step for ${phone}: ${state.currentStep}`);

//     // Reset loop
//     if (bodyText.toLowerCase() === 'reset' || (bodyText.toLowerCase() === 'hi' && (state.currentStep !== 'GREETING' && state.currentStep !== 'LANGUAGE_SELECTION'))) {
//       state.currentStep = 'GREETING';
//       state.tempData = {};
//       console.log(`🔄 Session Reset requested by ${phone}`);
//     }

//     let nextStep = state.currentStep;

//     switch (state.currentStep) {
//       case 'GREETING':
//         console.log(`[TRACE 5] Stage: GREETING. Calling getMessage('welcome')...`);
//         try {
//           const welcomeMsg = getMessage('welcome');
//           console.log(`[TRACE 6] Message resolved: "${welcomeMsg.substring(0, 20)}..."`);
//           await sendWhatsAppMessage(phone, welcomeMsg, config);
//           console.log(`[TRACE 7] Message sent successfully.`);
//         } catch (e: any) {
//           console.error(`[CRASH] Failed in GREETING:`, e.message);
//           await saveSystemLog('ERROR', `Crash in GREETING: ${e.message}`);
//         }
//         nextStep = 'LANGUAGE_SELECTION';
//         break;

//       case 'LANGUAGE_SELECTION':
//         console.log(`[TRACE 5] Stage: LANGUAGE_SELECTION. Input: ${bodyText}`);
//         state.tempData.language = bodyText === '2' ? 'ta' : 'en';
//         const lang = state.tempData.language as Language;
//         console.log(`[TRACE 6] Language set to: ${lang}`);
        
//         // Check if user is registered
//         const userSnap = await get(ref(db, `users/${phoneKey}`));
//         if (!userSnap.exists()) {
//           console.log(`[TRACE 7] User not registered. Sending reg_name...`);
//           await sendWhatsAppMessage(phone, getMessage('registration_name', lang), config);
//           nextStep = 'REGISTRATION_NAME';
//         } else {
//           console.log(`[TRACE 7] User exists. Sending main_menu...`);
//           const registeredUser = userSnap.val();
//           state.tempData.ward = registeredUser.ward || 'N/A';
//           await sendWhatsAppMessage(phone, getMessage('main_menu', lang), config);
//           nextStep = 'BOT_MODE_SELECTION';
//         }
//         console.log(`[TRACE 8] LANGUAGE_SELECTION logic complete.`);
//         break;

//       case 'BOT_MODE_SELECTION':
//         const modeLang = (state.tempData.language || 'en') as Language;
//         if (bodyText === '1') {
//           console.log(`➡️  BOT_MODE_SELECTION: User chose COMPLAINT.`);
//           await saveSystemLog('INFO', `FSM: User chose COMPLAINT`, { phone });
//           await sendWhatsAppMessage(phone, getMessage('select_category', modeLang), config);
//           state.tempData.mode = 'COMPLAINT';
//           nextStep = 'CATEGORY_SELECTION';
//         } else if (bodyText === '2') {
//           console.log(`➡️  BOT_MODE_SELECTION: User chose QUERY.`);
//           await saveSystemLog('INFO', `FSM: User chose QUERY`, { phone });
//           await sendWhatsAppMessage(phone, getMessage('describe_issue', modeLang), config);
//           state.tempData.mode = 'QUERY';
//           nextStep = 'QUERY_CAPTURE';
//         } else {
//           await saveSystemLog('WARN', `FSM: Invalid Selection in BOT_MODE_SELECTION from ${phone}`, { bodyText });
//           await sendWhatsAppMessage(phone, getMessage('invalid_selection', modeLang), config);
//         }
//         break;

//       case 'QUERY_CAPTURE':
//         state.tempData.description = bodyText;
//         const qLang = (state.tempData.language || 'en') as Language;
//         // Generate Query ID
//         const qYear = new Date().getFullYear();
//         const qCounterRef = ref(db, `counters/queries-${qYear}`);
//         const qCounterSnap = await get(qCounterRef);
//         let qCount = qCounterSnap.exists() ? qCounterSnap.val() : 0;
//         qCount += 1;
//         await set(qCounterRef, qCount);

//         const queryId = `QRY-${qYear}-${qCount.toString().padStart(6, '0')}`;
//         await set(ref(db, `complaints/${queryId}`), {
//           complaintId: queryId,
//           userId: phoneKey,
//           type: 'Query',
//           language: qLang,
//           description: bodyText,
//           status: 'Pending',
//           priority: 'Medium',
//           createdAt: Date.now(),
//           history: { [Date.now()]: { status: 'Received', message: 'General Query submitted', updatedAt: Date.now() } }
//         });

//         await sendWhatsAppMessage(phone, getMessage('query_received', qLang, { id: queryId }), config);
//         nextStep = 'GREETING';
//         state.tempData = {};
//         break;

//       case 'REGISTRATION_NAME':
//         state.tempData.name = bodyText;
//         await sendWhatsAppMessage(phone, getMessage('registration_ward', (state.tempData.language || 'en') as Language), config);
//         nextStep = 'REGISTRATION_WARD';
//         break;

//       case 'REGISTRATION_WARD':
//         state.tempData.ward = bodyText;
//         await sendWhatsAppMessage(phone, getMessage('registration_address', (state.tempData.language || 'en') as Language), config);
//         nextStep = 'REGISTRATION_ADDRESS';
//         break;

//       case 'REGISTRATION_ADDRESS':
//         state.tempData.address = bodyText;
//         await sendWhatsAppMessage(phone, getMessage('registration_pincode', (state.tempData.language || 'en') as Language), config);
//         nextStep = 'REGISTRATION_PINCODE';
//         break;

//       case 'REGISTRATION_PINCODE':
//         state.tempData.pincode = bodyText;
//         const regLang = (state.tempData.language || 'en') as Language;
        
//         // Save user
//         await set(ref(db, `users/${phoneKey}`), {
//           phone: phone,
//           name: state.tempData.name,
//           ward: state.tempData.ward,
//           address: state.tempData.address,
//           pincode: state.tempData.pincode,
//           language: regLang,
//           createdAt: serverTimestamp()
//         });
        
//         await sendWhatsAppMessage(phone, `${getMessage('registration_complete', regLang)}\n\n${getMessage('main_menu', regLang)}`, config);
//         nextStep = 'BOT_MODE_SELECTION';
//         break;

//       case 'CATEGORY_SELECTION':
//         const catLang = (state.tempData.language || 'en') as Language;
//         const categories = ['Water Issue', 'Electricity', 'Road Damage', 'Garbage', 'Other'];
//         const selectionIndex = parseInt(bodyText, 10) - 1;
        
//         if (selectionIndex >= 0 && selectionIndex <= 3) {
//           state.tempData.category = categories[selectionIndex];
//           await sendWhatsAppMessage(phone, getMessage('describe_issue', catLang), config);
//           nextStep = 'COMPLAINT_DESCRIPTION';
//         } else if (bodyText === '5') {
//           state.tempData.category = 'Other';
//           await sendWhatsAppMessage(phone, getMessage('custom_category', catLang), config);
//           nextStep = 'CUSTOM_CATEGORY';
//         } else {
//           await sendWhatsAppMessage(phone, getMessage('invalid_selection', catLang), config);
//         }
//         break;
        
//       case 'CUSTOM_CATEGORY':
//         state.tempData.customCategory = bodyText;
//         await sendWhatsAppMessage(phone, getMessage('describe_issue', (state.tempData.language || 'en') as Language), config);
//         nextStep = 'COMPLAINT_DESCRIPTION';
//         break;

//       case 'COMPLAINT_DESCRIPTION':
//         state.tempData.description = bodyText;
//         await sendWhatsAppMessage(phone, getMessage('share_location', (state.tempData.language || 'en') as Language), config);
//         nextStep = 'LOCATION_CAPTURE';
//         break;

//       case 'LOCATION_CAPTURE':
//         const locLang = (state.tempData.language || 'en') as Language;
//         if (lat && lng) {
//           state.tempData.location = { lat, lng, address: address || 'Shared Location' };
//           await sendWhatsAppMessage(phone, getMessage('upload_media', locLang), config);
//           nextStep = 'FILE_UPLOAD';
//         } else if (bodyText.toLowerCase() === 'skip') {
//           state.tempData.location = { lat: '0', lng: '0', address: 'Not provided' };
//           await sendWhatsAppMessage(phone, getMessage('upload_media', locLang), config);
//           nextStep = 'FILE_UPLOAD';
//         } else {
//           await sendWhatsAppMessage(phone, getMessage('location_missing', locLang), config);
//         }
//         break;

//       case 'FILE_UPLOAD':
//         const fileLang = (state.tempData.language || 'en') as Language;
//         if (!state.tempData.media) state.tempData.media = [];
        
//         if (mediaId) {
//           state.tempData.media.push(mediaId);
//           await sendWhatsAppMessage(phone, getMessage('media_received', fileLang), config);
//           // Don't early return here, we want to save the state!
//           nextStep = 'FILE_UPLOAD'; 
//         } else if (bodyText.toLowerCase() === 'done' || bodyText.toLowerCase() === 'skip') {
//           // Show Summary
//           const summaryStr = getMessage('complaint_summary', fileLang, {
//             category: state.tempData.category,
//             description: state.tempData.description,
//             address: state.tempData.location?.address || 'N/A',
//             ward: state.tempData.ward || 'N/A'
//           });
//           await sendWhatsAppMessage(phone, summaryStr, config);
//           nextStep = 'SUMMARY_CONFIRMATION';
//         } else {
//            await sendWhatsAppMessage(phone, getMessage('upload_media', fileLang), config);
//         }
//         break;

//       case 'SUMMARY_CONFIRMATION':
//         const confirmLang = (state.tempData.language || 'en') as Language;
//         if (bodyText === '1') {
//           // Finalize and Save
//           const currentYear = new Date().getFullYear();
//           const counterRef = ref(db, `counters/complaints-${currentYear}`);
//           const counterSnap = await get(counterRef);
//           let currentCount = counterSnap.exists() ? counterSnap.val() : 0;
//           currentCount += 1;
//           await set(counterRef, currentCount);
          
//           const complaintIdStr = `CMP-${currentYear}-${currentCount.toString().padStart(6, '0')}`;
//           const newComplaintRef = ref(db, `complaints/${complaintIdStr}`);
          
//           console.log(`🔥 SAVING COMPLAINT: ${complaintIdStr} for ${phone}`);

//           await set(newComplaintRef, {
//             complaintId: complaintIdStr,
//             userId: phoneKey,
//             type: 'Complaint',
//             language: confirmLang,
//             ward: state.tempData.ward || 'N/A',
//             category: state.tempData.category,
//             customCategory: state.tempData.customCategory || null,
//             description: state.tempData.description,
//             media: state.tempData.media || [],
//             location: state.tempData.location,
//             status: 'Pending',
//             priority: 'Medium',
//             history: { [Date.now()]: { status: 'Pending', message: 'Complaint created via WhatsApp', updatedAt: Date.now() } },
//             createdAt: Date.now()
//           });
          
//           await sendWhatsAppMessage(phone, getMessage('complaint_submitted', confirmLang, { id: complaintIdStr }), config);
//           nextStep = 'GREETING';
//           state.tempData = {};
//         } else if (bodyText === '2') {
//           await sendWhatsAppMessage(phone, getMessage('describe_issue', confirmLang), config);
//           nextStep = 'COMPLAINT_DESCRIPTION';
//         } else {
//           await sendWhatsAppMessage(phone, getMessage('invalid_selection', confirmLang), config);
//         }
//         break;

//       default:
//         await sendWhatsAppMessage(phone, 'Sorry, I am confused. Type "hi" to restart.', config);
//         nextStep = 'GREETING';
//         break;
//     }

//     state.currentStep = nextStep;
//     state.lastInteraction = serverTimestamp();
//     await set(stateRef, state);

//     // Always acknowledge Meta receipt within 200 ms!
//     return new NextResponse('EVENT_RECEIVED', { status: 200 });
//   } catch (error) {
//     console.error('Webhook payload error:', error);
//     // Even on error, it's best to 200 OK so Meta doesn't pause webhooks
//     return new NextResponse('Internal Error caught and ignored for Meta', { status: 200 });
//   }
// }
import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { ref, get, set } from 'firebase/database';
import { getMessage, Language } from '@/lib/translations';

async function getWaConfig() {
  const snap = await get(ref(db, 'settings/whatsapp'));
  return snap.exists() ? snap.val() : null;
}

async function sendWhatsAppMessage(to: string, body: string, config: any) {
  if (!config?.accessToken || !config?.phoneNumberId) return;
  if (!body || body.trim() === '') return;

  const url = `https://graph.facebook.com/v20.0/${config.phoneNumberId}/messages`;
  const cleanTo = to.replace(/\+/g, '').trim();

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: cleanTo,
      type: 'text',
      text: { body },
    }),
  });
}

// VERIFY WEBHOOK
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const config = await getWaConfig();

  if (mode === 'subscribe' && token === config?.verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// MAIN WEBHOOK
export async function POST(req: Request) {
  try {
    const payload = await req.json();

    if (payload.object !== 'whatsapp_business_account') {
      return new NextResponse('OK', { status: 200 });
    }

    const change = payload.entry?.[0]?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (!message) {
      return new NextResponse('OK', { status: 200 });
    }

    const phone = message.from;
    const type = message.type;

    // ✅ FIXED: always use full phone
    const phoneKey = phone;

    let bodyText = '';
    if (type === 'text') bodyText = message.text?.body || '';

    console.log("PHONE:", phone);
    console.log("MESSAGE:", bodyText);

    const config = await getWaConfig();

    const stateRef = ref(db, `botState/${phoneKey}`);
    const snap = await get(stateRef);

    let state = snap.val() || {
      phone: phoneKey,
      currentStep: 'GREETING',
      tempData: {},
    };

    let nextStep = state.currentStep;

    console.log("CURRENT STEP:", state.currentStep);

    // RESET
    if (bodyText.toLowerCase() === 'hi' || bodyText.toLowerCase() === 'reset') {
      state.currentStep = 'GREETING';
      state.tempData = {};
    }

    switch (state.currentStep) {
      case 'GREETING': {
        let msg = '';
        try {
          msg = getMessage('welcome');
        } catch {
          msg = 'Hello! Welcome 🙏\n1. English\n2. Tamil';
        }

        await sendWhatsAppMessage(phone, msg, config);
        nextStep = 'LANGUAGE_SELECTION';
        break;
      }

      case 'LANGUAGE_SELECTION': {
        const lang: Language = bodyText === '2' ? 'ta' : 'en';
        state.tempData.language = lang;

        const userSnap = await get(ref(db, `users/${phoneKey}`));

        if (!userSnap.exists()) {
          await sendWhatsAppMessage(
            phone,
            getMessage('registration_name', lang),
            config
          );
          nextStep = 'REGISTRATION_NAME';
        } else {
          await sendWhatsAppMessage(
            phone,
            getMessage('main_menu', lang),
            config
          );
          nextStep = 'BOT_MODE_SELECTION';
        }

        break;
      }

      case 'REGISTRATION_NAME':
        state.tempData.name = bodyText;
        await sendWhatsAppMessage(
          phone,
          'Enter your ward:',
          config
        );
        nextStep = 'REGISTRATION_WARD';
        break;

      case 'REGISTRATION_WARD':
        state.tempData.ward = bodyText;
        await sendWhatsAppMessage(
          phone,
          'Enter your address:',
          config
        );
        nextStep = 'REGISTRATION_ADDRESS';
        break;

      case 'REGISTRATION_ADDRESS':
        state.tempData.address = bodyText;
        await sendWhatsAppMessage(
          phone,
          'Enter pincode:',
          config
        );
        nextStep = 'REGISTRATION_PINCODE';
        break;

      case 'REGISTRATION_PINCODE':
        state.tempData.pincode = bodyText;

        await set(ref(db, `users/${phoneKey}`), {
          phone,
          ...state.tempData,
          createdAt: Date.now(),
        });

        await sendWhatsAppMessage(
          phone,
          'Registration complete ✅\n1. Complaint\n2. Query',
          config
        );

        nextStep = 'BOT_MODE_SELECTION';
        break;

      case 'BOT_MODE_SELECTION':
        if (bodyText === '1') {
          await sendWhatsAppMessage(
            phone,
            'Select category:\n1. Water\n2. Electricity\n3. Road\n4. Garbage\n5. Other',
            config
          );
          nextStep = 'CATEGORY_SELECTION';
        } else if (bodyText === '2') {
          await sendWhatsAppMessage(
            phone,
            'Describe your query:',
            config
          );
          nextStep = 'QUERY_CAPTURE';
        }
        break;

      case 'QUERY_CAPTURE':
        await sendWhatsAppMessage(
          phone,
          'Query received ✅',
          config
        );
        nextStep = 'GREETING';
        break;

      case 'CATEGORY_SELECTION':
        state.tempData.category = bodyText;
        await sendWhatsAppMessage(
          phone,
          'Describe your issue:',
          config
        );
        nextStep = 'COMPLAINT_DESCRIPTION';
        break;

      case 'COMPLAINT_DESCRIPTION':
        state.tempData.description = bodyText;
        await sendWhatsAppMessage(
          phone,
          'Send location or type skip',
          config
        );
        nextStep = 'LOCATION_CAPTURE';
        break;

      case 'LOCATION_CAPTURE':
        await sendWhatsAppMessage(
          phone,
          'Upload file or type done',
          config
        );
        nextStep = 'FILE_UPLOAD';
        break;

      case 'FILE_UPLOAD':
        if (bodyText.toLowerCase() === 'done') {
          await sendWhatsAppMessage(
            phone,
            'Complaint submitted ✅',
            config
          );
          nextStep = 'GREETING';
          state.tempData = {};
        } else {
          await sendWhatsAppMessage(
            phone,
            'Send more files or type done',
            config
          );
          nextStep = 'FILE_UPLOAD';
        }
        break;
    }

    console.log("NEXT STEP:", nextStep);

    state.currentStep = nextStep;
    state.lastInteraction = Date.now();

    await set(stateRef, state);

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error(err);
    return new NextResponse('OK', { status: 200 });
  }
}