const admin = require('firebase-admin');

// In a real scenario, you should use a service account JSON file.
// For now, we initialize with the project ID from your google-services.json
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sbbready-51511',
  });
}

const db = admin.firestore();

module.exports = { admin, db };
