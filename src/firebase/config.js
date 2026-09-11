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
let gestorApp = null;
let gestorDb = null;

export const GESTOR_PRO_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_GESTOR_FIREBASE_API_KEY || 'AIzaSyBSdiVpgstJrbBq5KdRoEvMNoKNK9O_VRA',
  authDomain: import.meta.env.VITE_GESTOR_FIREBASE_AUTH_DOMAIN || 'gestor-de-equipos-pro-3ed23.firebaseapp.com',
  projectId: import.meta.env.VITE_GESTOR_FIREBASE_PROJECT_ID || 'gestor-de-equipos-pro-3ed23',
  storageBucket: import.meta.env.VITE_GESTOR_FIREBASE_STORAGE_BUCKET || 'gestor-de-equipos-pro-3ed23.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_GESTOR_FIREBASE_MESSAGING_SENDER_ID || '474923440909',
  appId: import.meta.env.VITE_GESTOR_FIREBASE_APP_ID || '1:474923440909:web:1b3103e793bf4a19512e44'
};

if (isFirebaseConfigured) {
  try {
    const apps = getApps();
    const mainApp = apps.find(a => a.name === '[DEFAULT]');
    app = mainApp || initializeApp(currentConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('Firebase initialized successfully with project:', currentConfig.projectId);

    // Initialize secondary app connection to Gestor de Equipos PRO
    const gApp = apps.find(a => a.name === 'GestorProSyncApp');
    gestorApp = gApp || initializeApp(GESTOR_PRO_FIREBASE_CONFIG, 'GestorProSyncApp');
    gestorDb = getFirestore(gestorApp);
    console.log('Gestor de Equipos PRO Sync connection initialized.');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }
}

export { app, db, auth, gestorApp, gestorDb };

