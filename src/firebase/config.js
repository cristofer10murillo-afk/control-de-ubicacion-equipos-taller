import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const LOCAL_STORAGE_KEY = 'firebase_config_override';

export const getSavedFirebaseConfig = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.warn('Could not read saved firebase config from localStorage:', e);
  }

  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA_MlXteetYXxMAvECJMQ4BSE_6xty46Uo',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'ubicacion-equipos-taller-2026.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ubicacion-equipos-taller-2026',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ubicacion-equipos-taller-2026.firebasestorage.app',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1048937776746',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1048937776746:web:40283047c0182dd461ec13'
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
  currentConfig.projectId
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
