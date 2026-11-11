import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, doc, getDocFromServer } from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

const fallbackConfig = {
  projectId: "resounding-sublime-7bvhw",
  appId: "1:1094735878986:web:20ba7ebc1108ce358cbfb3",
  apiKey: "AIzaSyAGWzMs5mfvVKp6a7SCOx288PTjP4uLmhQ",
  authDomain: "resounding-sublime-7bvhw.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-pakmobilepos-5fef3712-5a48-4a22-aeb2-fcf8bf2608b8",
  storageBucket: "resounding-sublime-7bvhw.firebasestorage.app"
};

const firebaseConfig = rawConfig || fallbackConfig;

let app: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  firestoreDb = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
} catch (error) {
  console.warn('Firebase initialization notice (running in safe offline mode):', error);
}

export const db: Firestore | null = firestoreDb;

export async function testFirebaseConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'settings', 'config'));
    return true;
  } catch (error) {
    console.warn('Firebase connection check:', error);
    return false;
  }
}
