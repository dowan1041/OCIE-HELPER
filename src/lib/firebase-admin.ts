import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let app: App;

// Format private key - handle various formats from different environments
const formatPrivateKey = (key: string | undefined): string => {
  if (!key) return "";

  // Remove surrounding quotes if present
  let formattedKey = key;
  if (formattedKey.startsWith('"') && formattedKey.endsWith('"')) {
    formattedKey = formattedKey.slice(1, -1);
  }

  // Replace escaped newlines with actual newlines
  formattedKey = formattedKey.replace(/\\n/g, "\n");

  return formattedKey;
};

if (getApps().length === 0) {
  // Check if we have service account credentials
  if (process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
  } else {
    // Fallback: Initialize without credentials (for client-side or when not needed)
    app = initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
  }
} else {
  app = getApps()[0];
}

export const adminDb = getFirestore();
export const adminStorage = getStorage();
export default app;
