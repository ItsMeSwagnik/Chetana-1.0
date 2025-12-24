import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBvOkBwNzEDai0k3OzMU-dIdOBFBBfHSoM",
  authDomain: "chetana-mental-health.firebaseapp.com",
  projectId: "chetana-mental-health",
  storageBucket: "chetana-mental-health.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
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
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('🔥 Firebase initialized successfully');
  } catch (error) {
    console.error('🔥 Firebase initialization error:', error.message);
    console.log('🔥 Disabling Firestore due to initialization error');
    db = null;
  }
}

export { db };
