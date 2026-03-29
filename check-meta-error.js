const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, query, limitToLast } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://whatsapp-bot-11a19-default-rtdb.firebaseio.com/"
};

async function checkErrorDetail() {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    
    console.log("Checking for detailed Meta error logs...");
    const logsRef = ref(db, 'systemLogs');
    const snap = await get(query(logsRef, limitToLast(50)));
    const logs = snap.val();
    if (logs) {
        Object.values(logs).forEach(log => {
            if (log.type === 'ERROR' && log.message.includes('Meta API Rejected')) {
                console.log(`[${new Date(log.timestamp).toISOString()}] ERROR: ${log.message}`);
                console.log(`Detail: ${log.detail}`);
            }
        });
    } else {
        console.log("No logs found.");
    }
    
    process.exit(0);
}

checkErrorDetail();
