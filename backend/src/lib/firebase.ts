import * as admin from 'firebase-admin';

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

if (!admin.apps.length) {
  try {
    if (firebaseAdminConfig.projectId && firebaseAdminConfig.clientEmail && firebaseAdminConfig.privateKey) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig as admin.ServiceAccount),
      });
      console.log('✅ Firebase Admin initialized');
    } else {
      console.warn('⚠️ Firebase Admin not initialized: Missing credentials');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error);
  }
}

export const auth = admin.auth();
export default admin;
