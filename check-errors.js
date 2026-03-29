const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, query, limitToLast, orderByChild, equalTo } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://whatsapp-bot-11a19-default-rtdb.firebaseio.com/"
};

async function checkErrors() {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    
    console.log("Checking for 'ERROR' logs...");
    const logsRef = ref(db, 'systemLogs');
    const snap = await get(query(logsRef, limitToLast(20)));
    const logs = snap.val();
    if (logs) {
        Object.values(logs).forEach(log => {
            if (log.type === 'ERROR') {
                console.log(`[${new Date(log.timestamp).toISOString()}] ERROR: ${log.message}`);
                if (log.detail) console.log(`Detail: ${log.detail}`);
            }
        });
    } else {
        console.log("No logs found.");
    }
    
    process.exit(0);
}

checkErrors();
