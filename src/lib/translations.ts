export type Language = 'en' | 'ta';

export const translations = {
  en: {
    welcome: "Hello! Welcome to Local Citizen Support System 🙏\nPlease select your language:\n1. English\n2. Tamil",
    language_confirmed: "Language set to English.",
    registration_name: "Please provide your Full Name to register:",
    registration_ward: "Please provide your Ward Number:",
    registration_address: "Please provide your Area/Address:",
    registration_pincode: "Please provide your PIN Code:",
    registration_complete: "Registration complete ✅",
    main_menu: "How can we help you today?\n1. Raise a Complaint 📢\n2. General Query / Question ❓",
    invalid_selection: "Invalid selection. Please reply with the correct number.",
    select_category: "Please select a category:\n1. Water Issue 💧\n2. Electricity ⚡\n3. Road Damage 🛣️\n4. Garbage 🗑️\n5. Other",
    custom_category: "Please type your custom category:",
    describe_issue: "Please describe your issue clearly:",
    share_location: "Please share your current location 📍 (Tap attachment -> Location -> Send)",
    location_received: "Location received.",
    location_missing: "We did not receive a location. Please share it or type 'skip'.",
    upload_media: "If you have any image, PDF or video, please upload it now, or type 'done' to finalize.",
    media_received: "File received. You can upload more or type 'done' to see the summary.",
    media_skipped: "No media attached.",
    complaint_summary: "📋 *Complaint Summary*:\nCategory: {category}\nDescription: {description}\nLocation: {address}\nWard: {ward}\n\nType '1' to *Confirm and Submit*\nType '2' to *Edit Description*",
    complaint_submitted: "Your complaint has been registered successfully ✅\nComplaint ID: {id}\nWe will notify you of any updates.",
    query_received: "Thank you! Your query has been received (ID: {id}). We will notify you once an admin replies.",
    reset_session: "Session reset. Type anything to start again.",
    error_generic: "An error occurred. Type 'hi' to restart.",
    done: "done",
    skip: "skip"
  },
  ta: {
    welcome: "வணக்கம்! உள்ளூர் குடிமக்கள் ஆதரவு அமைப்பிற்கு வரவேற்கிறோம் 🙏\nதயவுசெய்து உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்:\n1. ஆங்கிலம் (English)\n2. தமிழ்",
    language_confirmed: "மொழி தமிழாக மாற்றப்பட்டது.",
    registration_name: "பதிவு செய்ய உங்கள் முழுப் பெயரை வழங்கவும்:",
    registration_ward: "உங்கள் வார்டு எண்ணை வழங்கவும்:",
    registration_address: "உங்கள் பகுதி/முழு முகவரியை வழங்கவும்:",
    registration_pincode: "உங்கள் பின்கோடு எண்ணை வழங்கவும்:",
    registration_complete: "பதிவு முடிந்தது ✅",
    main_menu: "இன்று நாங்கள் உங்களுக்கு எப்படி உதவ முடியும்?\n1. புகார் அளிக்கவும் 📢\n2. பொதுவான கேள்வி ❓",
    invalid_selection: "தவறான தேர்வு. சரியான எண்ணுடன் பதிலளிக்கவும்.",
    select_category: "தயவுசெய்து ஒரு வகையைத் தேர்ந்தெடுக்கவும்:\n1. தண்ணீர் பிரச்சினை 💧\n2. மின்சாரம் ⚡\n3. சாலை சேதம் 🛣️\n4. குப்பை 🗑️\n5. மற்றவை",
    custom_category: "உங்கள் தனிப்பயன் வகையைத் தட்டச்சு செய்க:",
    describe_issue: "உங்கள் பிரச்சினையைத் தெளிவாக விவரிக்கவும்:",
    share_location: "உங்கள் தற்போதைய இருப்பிடத்தைப் பகிரவும் 📍 (இணைப்பைத் தட்டவும் -> இருப்பிடம் -> அனுப்பு)",
    location_received: "இருப்பிடம் பெறப்பட்டது.",
    location_missing: "இருப்பிடம் கிடைக்கவில்லை. இருப்பிடத்தைப் பகிரவும் அல்லது 'skip' எனத் தட்டச்சு செய்யவும்.",
    upload_media: "உங்களிடம் ஏதேனும் புகைப்படம், PDF அல்லது வீடியோ இருந்தால், இப்போது பதிவேற்றவும் அல்லது முடிக்க 'done' எனத் தட்டச்சு செய்யவும்.",
    media_received: "கோப்பு பெறப்பட்டது. நீங்கள் மேலும் பதிவேற்றலாம் அல்லது சுருக்கத்தைக் காண 'done' எனத் தட்டச்சு செய்யவும்.",
    media_skipped: "ஊடகம் எதுவும் இணைக்கப்படவில்லை.",
    complaint_summary: "📋 *புகார் சுருக்கம்*:\nவகை: {category}\nவிவரம்: {description}\nஇருப்பிடம்: {address}\nவார்டு: {ward}\n\n*உறுதிசெய்து சமர்ப்பிக்க* '1' எனத் தட்டச்சு செய்க\n*விளக்கத்தை மாற்ற* '2' எனத் தட்டச்சு செய்க",
    complaint_submitted: "உங்கள் புகார் வெற்றிகரமாக பதிவு செய்யப்பட்டது ✅\nபுகார் ஐடி: {id}\nஏதேனும் மாற்றங்கள் இருந்தால் உங்களுக்கு அறிவிப்போம்.",
    query_received: "நன்றி! உங்கள் கேள்வி பெறப்பட்டது (ID: {id}). நிர்வாகி பதிலளித்ததும் உங்களுக்கு அறிவிப்போம்.",
    reset_session: "அமர்வு மீட்டமைக்கப்பட்டது. மீண்டும் தொடங்க எதாவது தட்டச்சு செய்யவும்.",
    error_generic: "பிழை ஏற்பட்டது. மீண்டும் தொடங்க 'hi' எனத் தட்டச்சு செய்யவும்.",
    done: "done",
    skip: "skip"
  }
};

export function getMessage(key: keyof typeof translations.en, lang: Language = 'en', params: Record<string, string> = {}): string {
  let msg = translations[lang][key] || translations.en[key];
  Object.entries(params).forEach(([k, v]) => {
    msg = msg.replace(`{${k}}`, v);
  });
  return msg;
}
