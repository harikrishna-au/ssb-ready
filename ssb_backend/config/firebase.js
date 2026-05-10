const admin = require('firebase-admin');
const { config } = require('./index');

const firebaseConfig = {
  projectId: config.firebase.projectId,
  storageBucket: config.firebase.storageBucket
};

function parseServiceAccountJson() {
  const raw = config.firebase.serviceAccountJson;
  if (raw == null || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    console.error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON:', e.message);
    throw e;
  }
}

if (!admin.apps.length) {
  const sa = parseServiceAccountJson();

  if (sa) {
    admin.initializeApp({
      credential: admin.credential.cert(sa),
      projectId: firebaseConfig.projectId || sa.project_id,
      storageBucket: firebaseConfig.storageBucket || undefined
    });
    console.log(
      `Firebase Admin initialized with service account (${firebaseConfig.projectId || sa.project_id})`
    );
  } else if (firebaseConfig.projectId) {
    admin.initializeApp({
      ...firebaseConfig
    });
    console.log(`Firebase initialized with Project ID: ${firebaseConfig.projectId}`);
  } else {
    console.warn('Warning: FIREBASE_PROJECT_ID is missing and no FIREBASE_SERVICE_ACCOUNT_JSON');
    admin.initializeApp();
  }
}

const db = admin.firestore();

module.exports = { admin, db };
