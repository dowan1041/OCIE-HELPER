import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const nsn = formData.get("nsn") as string;

    if (!file || !nsn) {
      return NextResponse.json(
        { error: "File and NSN are required" },
        { status: 400 }
      );
    }

    // Get file extension
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];

    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: jpg, jpeg, png, gif, webp" },
        { status: 400 }
      );
    }

    // Create filename with NSN
    const filename = `${nsn.padStart(4, "0")}.${ext}`;
    const filePath = `equipment/${filename}`;

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Firebase Storage
    const bucket = adminStorage.bucket();
    const fileRef = bucket.file(filePath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make the file publicly accessible
    await fileRef.makePublic();

    // Get the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    return NextResponse.json({
      success: true,
      filename,
      url: publicUrl,
      message: "Image uploaded successfully",
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload image" },
      { status: 500 }
    );
  }
}
