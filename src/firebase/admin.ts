import 'server-only';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getStorage as getAdminStorage, Storage } from 'firebase-admin/storage';
import { firebaseConfig } from '@/firebase/config';

let app: App;

if (getApps().length === 0) {
  // In a Firebase App Hosting environment, initializeApp() will automatically
  // use the service account associated with the backend.
  app = initializeApp({
    storageBucket: firebaseConfig.storageBucket,
  });
} else {
  app = getApps()[0];
}

const storage = getAdminStorage(app);

export { storage };
