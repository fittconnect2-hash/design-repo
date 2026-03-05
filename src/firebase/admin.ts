import 'server-only';
import { initializeApp, getApps, App } from 'firebase-admin/app';

export function getFirebaseAdminApp(): App {
  if (getApps().length) {
    return getApps()[0];
  }
  // This is a placeholder for a real service account.
  // In a real app, you would load this from a secure location.
  return initializeApp({
    credential: {
        projectId: 'demo-project',
        clientEmail: 'demo@demo-project.iam.gserviceaccount.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\n\n-----END PRIVATE KEY-----\n',
    }
  });
}
