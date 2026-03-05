import { NextRequest, NextResponse } from 'next/server';
import { firebaseConfig } from '@/firebase/config';
import type { App } from 'firebase-admin/app';

// NOTE: All firebase-admin imports are done inside the POST function
// using require() to prevent Next.js from bundling server-side code
// into the client-side application, which would cause a build error.

export async function POST(request: NextRequest) {
  try {
    // Dynamically import and initialize firebase-admin inside the route handler
    const { initializeApp, getApps } = require('firebase-admin/app');
    const { getStorage } = require('firebase-admin/storage');

    let app: App;
    if (getApps().length === 0) {
      app = initializeApp({
        storageBucket: firebaseConfig.storageBucket,
      });
    } else {
      app = getApps()[0];
    }
    const storage = getStorage(app);
    
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

    if (error.code === 'GaxiosError' || (errorMessage && (errorMessage.includes('Could not load the default credentials') || errorMessage.includes("initialization failed")))) {
        userFriendlyMessage = 'The server is missing authentication credentials. This can happen during local development if the environment is not set up correctly. Make sure GOOGLE_APPLICATION_CREDENTIALS is set.';
    } else if (errorMessage.includes('does not exist')) {
        userFriendlyMessage = `The Firebase Storage bucket "${firebaseConfig.storageBucket}" was not found. Please go to your Firebase Console, navigate to the "Storage" section, and click "Get Started" to create the default bucket. This is a required one-time setup step.`;
    } else {
        userFriendlyMessage = `Upload failed on the server. Details: ${errorMessage}`;
    }

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    return new NextResponse(JSON.stringify({ error: 'Upload Failed', details: userFriendlyMessage }), {
        status: 500,
        headers: headers,
    });
  }
}
