const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, query, limitToLast } = require('firebase/database');

const firebaseConfig = {
    databaseURL: "https://whatsapp-bot-11a19-default-rtdb.firebaseio.com/"
};

async function replayLatestLog() {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    
    console.log("🔍 Fetching latest incoming message from systemLogs...");
    const logsRef = ref(db, 'systemLogs');
    const snap = await get(query(logsRef, limitToLast(50)));
    const logs = snap.val();
    
    if (!logs) {
        console.log("❌ No logs found.");
        process.exit(1);
    }

    // Find the most recent "Incoming" message
    const sortedLogs = Object.values(logs).sort((a,b) => b.timestamp - a.timestamp);
    const latestIncoming = sortedLogs.find(log => log.type === 'INFO' && log.message.startsWith('Incoming'));

    if (!latestIncoming) {
        console.log("❌ No recent incoming messages found in logs.");
        process.exit(1);
    }

    const detail = latestIncoming.detail ? JSON.parse(latestIncoming.detail) : {};
    const phone = latestIncoming.message.split('from ')[1];
    const bodyText = detail.bodyText || 'hi';
    const type = detail.type || 'text';

    console.log(`🚀 Replaying: "${bodyText}" from ${phone}`);

    const payload = {
        object: "whatsapp_business_account",
        entry: [{
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    messages: [{
                        from: phone,
                        type: type,
                        text: type === 'text' ? { body: bodyText } : undefined,
                        timestamp: Math.floor(Date.now() / 1000)
                    }]
                },
                field: "messages"
            }]
        }]
    };

    try {
        const res = await fetch('http://localhost:3000/api/webhook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const respText = await res.text();
        console.log(`✅ Webhook Response: [${res.status}] ${respText}`);
    } catch (err) {
        console.error(`❌ Webhook Failed: ${err.message}`);
    }
    
    process.exit(0);
}

replayLatestLog();
