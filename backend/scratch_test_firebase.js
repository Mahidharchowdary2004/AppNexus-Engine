
require('dotenv').config();
const admin = require('firebase-admin');

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

console.log('Project ID:', firebaseAdminConfig.projectId);
console.log('Client Email:', firebaseAdminConfig.clientEmail);
console.log('Private Key starts with:', firebaseAdminConfig.privateKey?.substring(0, 30));

try {
  admin.initializeApp({
    credential: admin.credential.cert(firebaseAdminConfig),
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  
  if (process.env.FIREBASE_PRIVATE_KEY?.startsWith('"')) {
    console.log('Trying with quotes removed...');
    const fixedKey = process.env.FIREBASE_PRIVATE_KEY.replace(/^"|"$/g, '').replace(/\\n/g, '\n');
    try {
      admin.initializeApp({
        credential: admin.credential.cert({ ...firebaseAdminConfig, privateKey: fixedKey }),
      }, 'secondary');
      console.log('✅ Fixed: Firebase Admin initialized successfully after removing quotes');
    } catch (e2) {
      console.error('❌ Still failed:', e2.message);
    }
  }
}
