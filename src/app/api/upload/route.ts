import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase Admin SDK within the route handler file.
// This ensures this server-only code is never bundled for the client.
let app: App;
if (getApps().length === 0) {
  app = initializeApp({
    storageBucket: firebaseConfig.storageBucket,
  });
} else {
  app = getApps()[0];
}
const storage = getAdminStorage(app);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: 'File or user ID is missing.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = storage.bucket(firebaseConfig.storageBucket);
    
    const filePath = `designs/${userId}/${Date.now()}_${file.name}`;
    const fileUpload = bucket.file(filePath);

    await fileUpload.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });
    
    await fileUpload.makePublic();
    
    const publicUrl = fileUpload.publicUrl();

    return NextResponse.json({ imageUrl: publicUrl });
  } catch (error: any) {
    console.error('Upload API error:', error);
    
    let userFriendlyMessage = 'An unknown error occurred during upload.';
    const errorMessage = error.message || '';

    if (error.code === 'GaxiosError' || (error.message && error.message.includes('Could not load the default credentials'))) {
        userFriendlyMessage = 'The server is missing authentication credentials. This can happen during local development if the environment is not set up correctly. Make sure GOOGLE_APPLICATION_CREDENTIALS is set.';
    } else if (errorMessage.includes('does not exist')) {
        userFriendlyMessage = `The Firebase Storage bucket "${firebaseConfig.storageBucket}" was not found. Please go to your Firebase Console, navigate to the "Storage" section, and click "Get Started" to create the default bucket. This is a required one-time setup step.`;
    }
    else {
        userFriendlyMessage = `Upload failed on the server. Details: ${errorMessage}`;
    }

    return NextResponse.json({ error: 'Upload Failed', details: userFriendlyMessage }, { status: 500 });
  }
}
