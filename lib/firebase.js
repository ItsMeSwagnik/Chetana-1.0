import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app;
let db;

// Add environment variable to disable Firestore if needed
const DISABLE_FIRESTORE = process.env.DISABLE_FIRESTORE === 'true';

if (DISABLE_FIRESTORE) {
  console.log('🔥 Firestore disabled via environment variable');
  db = null;
} else {
  try {
    // Check if all required config values are present
    const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
    const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
    
    if (missingKeys.length > 0) {
      console.error('🔥 Missing Firebase config keys:', missingKeys);
      console.log('🔥 Disabling Firestore due to missing configuration');
      db = null;
    } else {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      console.log('🔥 Firebase initialized successfully with project:', firebaseConfig.projectId);
    }
  } catch (error) {
    console.error('🔥 Firebase initialization error:', error.message);
    console.log('🔥 Disabling Firestore due to initialization error');
    db = null;
  }
}

export { db };
