const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://whatsapp-bot-11a19-default-rtdb.firebaseio.com/"
};

async function checkLatestState() {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    
    console.log("Checking for latest botState (including 91 prefix)...");
    const stateSnap = await get(ref(db, 'botState'));
    console.log("botState:", JSON.stringify(stateSnap.val(), null, 2));
    
    process.exit(0);
}

checkLatestState();
