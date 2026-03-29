import { db } from './src/lib/firebase.js';
import { ref, get, query, limitToLast } from 'firebase/database';

async function checkLogs() {
  try {
    const logsRef = ref(db, 'systemLogs');
    const q = query(logsRef, limitToLast(10));
    const snap = await get(q);
    if (snap.exists()) {
      console.log(JSON.stringify(snap.val(), null, 2));
    } else {
      console.log("No logs found.");
    }
  } catch (err) {
    console.error(err);
  }
}

checkLogs();
