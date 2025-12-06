/**
 * Migration script to upload existing equipment data and images to Firebase
 *
 * Usage:
 * 1. First, add service account credentials to .env.local:
 *    FIREBASE_CLIENT_EMAIL=your-service-account@ocie-helper.iam.gserviceaccount.com
 *    FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *
 * 2. Run the migration:
 *    npx ts-node --compiler-options '{"module":"commonjs"}' scripts/migrate-to-firebase.ts
 *
 *    Or use tsx:
 *    npx tsx scripts/migrate-to-firebase.ts
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env.local") });

// Initialize Firebase Admin
if (getApps().length === 0) {
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    console.error("ERROR: FIREBASE_PRIVATE_KEY not found in .env.local");
    console.error("Please add your service account credentials to .env.local");
    console.error(
      "Download from: Firebase Console > Project Settings > Service Accounts > Generate New Private Key"
    );
    process.exit(1);
  }

  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

const db = getFirestore();
const storage = getStorage();
const bucket = storage.bucket();

interface EquipmentItem {
  lin: string[];
  nomenclature: string;
  partialNsn: string;
  anotherName: string;
  size: string;
  image: string | null;
}

async function uploadImage(filename: string): Promise<string | null> {
  const localPath = path.join(__dirname, "../public/images", filename);

  if (!fs.existsSync(localPath)) {
    console.log(`  Image not found: ${filename}`);
    return null;
  }

  const destination = `equipment/${filename}`;

  try {
    await bucket.upload(localPath, {
      destination,
      metadata: {
        contentType: `image/${filename.split(".").pop()}`,
      },
    });

    // Make public
    await bucket.file(destination).makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    console.log(`  Uploaded: ${filename}`);
    return publicUrl;
  } catch (error) {
    console.error(`  Failed to upload ${filename}:`, error);
    return null;
  }
}

async function migrateData() {
  console.log("Starting migration to Firebase...\n");

  // Load equipment data
  const dataPath = path.join(__dirname, "../src/data/equipment.json");
  const rawData = fs.readFileSync(dataPath, "utf-8");
  const equipment: EquipmentItem[] = JSON.parse(rawData);

  console.log(`Found ${equipment.length} items to migrate\n`);

  // Check if collection already has data
  const existingDocs = await db.collection("equipment").get();
  if (!existingDocs.empty) {
    console.log(`WARNING: Collection 'equipment' already has ${existingDocs.size} documents.`);
    console.log("Do you want to continue? This will add duplicate data.");
    console.log("Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < equipment.length; i++) {
    const item = equipment[i];
    console.log(`[${i + 1}/${equipment.length}] ${item.nomenclature}`);

    try {
      // Upload image if exists
      let imageUrl: string | null = null;
      if (item.image) {
        imageUrl = await uploadImage(item.image);
      }

      // Add to Firestore
      const docData = {
        lin: item.lin,
        nomenclature: item.nomenclature,
        partialNsn: item.partialNsn,
        anotherName: item.anotherName,
        size: item.size,
        image: imageUrl,
        createdAt: new Date().toISOString(),
      };

      await db.collection("equipment").add(docData);
      console.log(`  Added to Firestore\n`);
      successCount++;
    } catch (error) {
      console.error(`  ERROR:`, error);
      errorCount++;
    }
  }

  console.log("\n========== Migration Complete ==========");
  console.log(`Success: ${successCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Total: ${equipment.length}`);
}

migrateData()
  .then(() => {
    console.log("\nMigration finished!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
