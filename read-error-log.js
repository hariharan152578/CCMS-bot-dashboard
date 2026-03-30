const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, query, limitToLast } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://whatsapp-bot-11a19-default-rtdb.firebaseio.com/"
};

async function readErrorLog() {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    
    console.log("🔍 Searching for latest ERROR log...");
    const logsRef = ref(db, 'systemLogs');
    const snap = await get(query(logsRef, limitToLast(10)));
    const logs = snap.val();
    
    if (!logs) {
        console.log("❌ No logs found.");
        process.exit(1);
    }

    const sortedLogs = Object.values(logs).sort((a,b) => b.timestamp - a.timestamp);
    const latestError = sortedLogs.find(log => log.type === 'ERROR');

    if (latestError) {
        console.log(`\n🚨 ERROR: ${latestError.message}`);
        console.log(`\n📜 STACK TRACE:\n${latestError.detail}`);
    } else {
        console.log("✅ No recent errors found.");
    }
    
    process.exit(0);
}

readErrorLog();
