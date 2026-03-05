import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps as getAdminApps } from 'firebase-admin/app';
import { getStorage } from 'firebase-admin/storage';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK if not already initialized.
// In a Firebase App Hosting environment, this will automatically use the
// service account associated with the backend.
if (!getAdminApps().length) {
  initializeApp();
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: 'File or user ID is missing.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Get a reference to the correct storage bucket
    const bucket = getStorage().bucket(firebaseConfig.storageBucket);
    
    // Create a unique path for the file in Firebase Storage
    const filePath = `designs/${userId}/${Date.now()}_${file.name}`;
    const fileUpload = bucket.file(filePath);

    // Save the file buffer to the bucket
    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });
    
    // Make the file public so it can be viewed via a URL
    await fileUpload.makePublic();
    
    // Get the public URL of the uploaded file
    const publicUrl = fileUpload.publicUrl();

    // Return the public URL to the client
    return NextResponse.json({ imageUrl: publicUrl });
  } catch (error) {
    console.error('Upload API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Upload failed on the server.', details: errorMessage }, { status: 500 });
  }
}
