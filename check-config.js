const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://whatsapp-bot-11a19-default-rtdb.firebaseio.com/"
};

async function checkConfig() {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    
    console.log("Checking WhatsApp config...");
    const snap = await get(ref(db, 'settings/whatsapp'));
    const config = snap.val();
    if (config) {
        console.log("phoneNumberId:", config.phoneNumberId);
        console.log("accessToken:", config.accessToken ? "PRESENT (hidden for safety)" : "MISSING");
        console.log("verifyToken:", config.verifyToken);
    } else {
        console.log("No config found at settings/whatsapp");
    }
    
    process.exit(0);
}

checkConfig();
