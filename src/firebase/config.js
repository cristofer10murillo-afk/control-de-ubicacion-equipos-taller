import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Default / fallback Firebase credentials or loaded from localStorage / env vars
const LOCAL_STORAGE_KEY = 'firebase_config_override';

export const getSavedFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Could not read saved firebase config from localStorage:', e);
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
  };
};

export const saveFirebaseConfig = (config) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  window.location.reload();
};

const currentConfig = getSavedFirebaseConfig();

export const isFirebaseConfigured = Boolean(
  currentConfig.apiKey && 
  currentConfig.projectId && 
  currentConfig.projectId !== 'YOUR_PROJECT_ID'
);

let app = null;
let db = null;
let auth = null;

if (isFirebaseConfigured) {
  try {
    app = !getApps().length ? initializeApp(currentConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Firebase initialized successfully with project:', currentConfig.projectId);
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

export { app, db, auth };
