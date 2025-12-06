import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let app: App;

// Format private key - handle both escaped \n and actual newlines
const formatPrivateKey = (key: string | undefined): string => {
  if (!key) return "";
  // Replace literal \n with actual newlines
  return key.replace(/\\n/g, "\n").replace(/\\\\n/g, "\n");
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
