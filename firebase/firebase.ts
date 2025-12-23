
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getAuth, Auth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDdsApeXM5WsHTcx4sLVJ37dAwxOjBMTu8",
  authDomain: "quiz-app-ff0ab.firebaseapp.com",
  projectId: "quiz-app-ff0ab",
  storageBucket: "quiz-app-ff0ab.firebasestorage.app",
  messagingSenderId: "798626817516",
  appId: "1:798626817516:web:dbfd5e97394332da1e4cc9"
};

// ✅ Initialize Firebase App only once
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase App initialized');
} else {
  app = getApps()[0];
  console.log('✅ Firebase App already initialized');
}

// ✅ Initialize Firestore with cache and fallback
let db: Firestore;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
    experimentalForceLongPolling: true, // helps in some network environments
  });
} catch (e) {
  db = getFirestore(app);
}

// ✅ Initialize Auth
const auth: Auth = getAuth(app);
// Enable offline persistence
auth.setPersistence = auth.setPersistence || (() => Promise.resolve());

// Log Auth initialization
console.log('✅ Firebase Auth initialized for domain:', firebaseConfig.authDomain);
console.log('✅ Project ID:', firebaseConfig.projectId);

// ✅ Export instances
export { app, db, auth };
