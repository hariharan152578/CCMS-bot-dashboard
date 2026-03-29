const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, query, limitToLast } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://whatsapp-bot-11a19-default-rtdb.firebaseio.com/"
};

async function checkDetailedLogs() {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    
    console.log("Checking detailed logs...");
    const logsRef = ref(db, 'systemLogs');
    const snap = await get(query(logsRef, limitToLast(20)));
    const logs = snap.val();
    if (logs) {
        Object.entries(logs).sort((a,b) => a[1].timestamp - b[1].timestamp).forEach(([id, log]) => {
            console.log(`[${new Date(log.timestamp).toLocaleTimeString()}] ${log.type}: ${log.message}`);
            if (log.detail) {
                try {
                    const detail = JSON.parse(log.detail);
                    console.log(`   Detail: ${JSON.stringify(detail).substring(0, 100)}...`);
                } catch (e) {
                    console.log(`   Detail: ${log.detail.substring(0, 100)}...`);
                }
            }
        });
    } else {
        console.log("No logs found.");
    }
    
    process.exit(0);
}

checkDetailedLogs();
