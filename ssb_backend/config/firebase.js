const admin = require('firebase-admin');
require('dotenv').config();

// Using environment variables for Firebase configuration as per your request
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
};

if (!admin.apps.length) {
  if (firebaseConfig.projectId) {
    admin.initializeApp(firebaseConfig);
    console.log(`Firebase initialized with Project ID: ${firebaseConfig.projectId}`);
  } else {
    console.warn('Warning: FIREBASE_PROJECT_ID is missing in .env');
    admin.initializeApp();
  }
}

const db = admin.firestore();

module.exports = { admin, db };
