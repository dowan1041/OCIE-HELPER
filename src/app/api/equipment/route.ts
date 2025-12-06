import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

const COLLECTION_NAME = "equipment";

export async function GET() {
  try {
    const snapshot = await adminDb.collection(COLLECTION_NAME).get();
    const equipment = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return NextResponse.json(equipment);
  } catch (error) {
    console.error("Failed to fetch equipment:", error);
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const newItem = await request.json();

    // Validate required fields
    if (!newItem.nomenclature || !newItem.partialNsn || !newItem.lin || newItem.lin.length === 0) {
      return NextResponse.json(
        { error: "Nomenclature, Partial NSN, and LIN are required" },
        { status: 400 }
      );
    }

    // Validate NSN is exactly 4 digits
    if (!/^\d{4}$/.test(newItem.partialNsn)) {
      return NextResponse.json(
        { error: "Partial NSN must be exactly 4 digits" },
        { status: 400 }
      );
    }

    // Check for duplicate NSN
    const existingQuery = await adminDb
      .collection(COLLECTION_NAME)
      .where("partialNsn", "==", newItem.partialNsn)
      .get();

    if (!existingQuery.empty) {
      return NextResponse.json(
        { error: "Item with this NSN already exists" },
        { status: 400 }
      );
    }

    // Format the new item
    const formattedItem = {
      lin: newItem.lin || [],
      nomenclature: newItem.nomenclature,
      partialNsn: newItem.partialNsn.padStart(4, "0"),
      anotherName: newItem.anotherName || "",
      size: newItem.size || "",
      image: newItem.image || null,
      createdAt: new Date().toISOString(),
    };

    // Add to Firestore
    const docRef = await adminDb.collection(COLLECTION_NAME).add(formattedItem);

    return NextResponse.json({
      success: true,
      item: { id: docRef.id, ...formattedItem },
      message: "Item added successfully",
    });
  } catch (error) {
    console.error("Failed to add equipment:", error);
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }
}
