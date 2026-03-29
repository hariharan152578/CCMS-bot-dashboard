import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const firebaseConfig = {
  databaseURL: process.env.FIREBASE_DATABASE_URL,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function insertAdmin() {
  try {
    const adminRef = ref(db, 'admins/admin1');
    await set(adminRef, {
      email: 'admin@example.com',
      password: 'password123', // IN PRODUCTION, use standard auth or hashing
      role: 'superadmin'
    });
    console.log('✅ Admin credentials inserted to Firebase DB.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to insert admin:', error);
    process.exit(1);
  }
}

insertAdmin();
