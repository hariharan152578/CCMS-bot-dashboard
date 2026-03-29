const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, query, limitToLast } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://whatsapp-bot-11a19-default-rtdb.firebaseio.com/"
};

async function checkDB() {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    
    console.log("Checking botState...");
    const stateSnap = await get(ref(db, 'botState'));
    console.log("botState:", JSON.stringify(stateSnap.val(), null, 2));

    console.log("\nChecking last 5 systemLogs...");
    const logsRef = ref(db, 'systemLogs');
    const logsSnap = await get(query(logsRef, limitToLast(5)));
    console.log("systemLogs:", JSON.stringify(logsSnap.val(), null, 2));
    
    process.exit(0);
}

checkDB();
