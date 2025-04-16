// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

//import { getStorage } from 'firebase/storage';
// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyBQVjYyLYhODAiUOokNV--ZQZeSX-nQDq0",
  authDomain: "live-care-17110.firebaseapp.com",
  projectId: "live-care-17110",
  storageBucket: "live-care-17110.firebasestorage.app",
  messagingSenderId: "1000763214136",
  appId: "1:1000763214136:web:1829623eed399e1db219cd",
};

// Initialize Firebase and Firestore
// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app); // Exported for compatibility, but not used
export const db = getFirestore(app);

console.log('Firebase initialized, auth:', auth, 'db:', db);