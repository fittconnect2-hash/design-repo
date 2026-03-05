'use client';

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
  } catch (error: any) {
    console.error('Upload API error:', error);
    
    let userFriendlyMessage = 'An unknown error occurred during upload.';
    const errorMessage = error.message || '';

    // Check for the specific "bucket not found" error. This is a common issue
    // if Firebase Storage has not been enabled in the Firebase Console.
    if (error.code === 404 && (errorMessage.includes('bucket') || errorMessage.includes('does not exist'))) {
        userFriendlyMessage = `The Firebase Storage bucket "${firebaseConfig.storageBucket}" was not found. Please go to your Firebase Console, navigate to the "Storage" section, and click "Get Started" to create the default bucket. This is a required one-time setup step.`;
    } else {
        userFriendlyMessage = `Upload failed on the server. Details: ${errorMessage}`;
    }

    return NextResponse.json({ error: 'Upload Failed', details: userFriendlyMessage }, { status: 500 });
  }
}