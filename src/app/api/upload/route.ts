import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/firebase/admin'; // Use the server-only admin module
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

    if (error.code === 404 && (errorMessage.includes('bucket') || errorMessage.includes('does not exist'))) {
        userFriendlyMessage = `The Firebase Storage bucket "${firebaseConfig.storageBucket}" was not found. Please go to your Firebase Console, navigate to the "Storage" section, and click "Get Started" to create the default bucket. This is a required one-time setup step.`;
    } else if (error.code === 'GaxiosError' || (error.message && error.message.includes('Could not load the default credentials'))) {
        userFriendlyMessage = 'The server is missing authentication credentials. This can happen during local development if the environment is not set up correctly. Make sure GOOGLE_APPLICATION_CREDENTIALS is set.';
    }
    else {
        userFriendlyMessage = `Upload failed on the server. Details: ${errorMessage}`;
    }

    return NextResponse.json({ error: 'Upload Failed', details: userFriendlyMessage }, { status: 500 });
  }
}
