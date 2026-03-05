import 'server-only';

import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';
import { firebaseConfig } from '@/firebase/config';

let app: App;
if (getApps().length === 0) {
  app = initializeApp({
    storageBucket: firebaseConfig.storageBucket,
  });
} else {
  app = getApps()[0];
}

const storage = getAdminStorage(app);

export { storage };
