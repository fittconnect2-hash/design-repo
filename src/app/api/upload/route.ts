import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/firebase/admin'; // Import the server-only storage instance
import { firebaseConfig } from '@/firebase/config';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;

    if (!file || !userId) {
      return NextResponse.json({ error: 'File or user ID is missing.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // The bucket is already configured in the admin initialization
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

    // Check if the error indicates missing credentials
    if (error.code === 'GaxiosError' || (errorMessage && (errorMessage.includes('Could not load the default credentials') || errorMessage.includes("initialization failed")))) {
        userFriendlyMessage = 'The server is missing authentication credentials. This can happen during local development if the environment is not set up correctly. Make sure GOOGLE_APPLICATION_CREDENTIALS is set.';
    } else if (errorMessage.includes('does not exist')) {
        userFriendlyMessage = `The Firebase Storage bucket "${firebaseConfig.storageBucket}" was not found. Please go to your Firebase Console, navigate to the "Storage" section, and click "Get Started" to create the default bucket. This is a required one-time setup step.`;
    } else {
        userFriendlyMessage = `Upload failed on the server. Details: ${errorMessage}`;
    }

    // Try to parse for JSON response, otherwise return text
    const headers = new Headers();
    headers.set('Content-Type', 'application/json');

    return new NextResponse(JSON.stringify({ error: 'Upload Failed', details: userFriendlyMessage }), {
        status: 500,
        headers: headers,
    });
  }
}
