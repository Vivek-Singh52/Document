import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCj35bkQlnuDS5EqDmShfQM3xwwXbkLdmI",
  authDomain: "document-40fe9.firebaseapp.com",
  projectId: "document-40fe9",
  storageBucket: "document-40fe9.firebasestorage.app",
  messagingSenderId: "30836632054",
  appId: "1:30836632054:web:adb41ee87f05ae8f17bfd7",
  measurementId: "G-E4BZ1QZ0ED"
};

// Initialize Firebase only if it hasn't been initialized already (Next.js hot reload fix)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);

export { app, db, storage };
