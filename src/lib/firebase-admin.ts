import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

let app: App | null = null;
let db: Firestore | null = null;
let storage: Storage | null = null;

// Format private key - handle various formats from different environments
const formatPrivateKey = (key: string | undefined): string => {
  if (!key) return "";

  let formattedKey = key;

  // Remove surrounding quotes if present
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }
  if (formattedKey.startsWith("'") && formattedKey.endsWith("'")) {
    formattedKey = formattedKey.slice(1, -1);
  }

  // Replace escaped newlines with actual newlines
  formattedKey = formattedKey.replace(/\\n/g, "\n");

  return formattedKey;
};

// Lazy initialization - only initialize when needed
const getApp = (): App => {
  if (app) return app;

  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (privateKey && process.env.FIREBASE_CLIENT_EMAIL) {
    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Fallback without credentials
    app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }

  return app;
};

export const getAdminDb = (): Firestore => {
  if (!db) {
    getApp();
    db = getFirestore();
  }
  return db;
};

export const getAdminStorage = (): Storage => {
  if (!storage) {
    getApp();
    storage = getStorage();
  }
  return storage;
};

// For backward compatibility
export const adminDb = {
  collection: (name: string) => getAdminDb().collection(name),
};

export const adminStorage = {
  bucket: () => getAdminStorage().bucket(),
};

export default getApp;
