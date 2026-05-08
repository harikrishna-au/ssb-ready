const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Dynamically loading the project info from the google-services.json file you provided
const googleServicesPath = path.join(__dirname, '../../ssb_ready_app/android/app/google-services.json');

let firebaseConfig = {};
try {
  const fileContent = fs.readFileSync(googleServicesPath, 'utf8');
  const googleServices = JSON.parse(fileContent);
  firebaseConfig = {
    projectId: googleServices.project_info.project_id,
    storageBucket: googleServices.project_info.storage_bucket,
  };
  console.log(`Firebase initialized with Project ID: ${firebaseConfig.projectId}`);
} catch (err) {
  console.warn('Warning: Could not read google-services.json. Falling back to default initialization.');
}

if (!admin.apps.length) {
  admin.initializeApp(firebaseConfig);
}

const db = admin.firestore();

module.exports = { admin, db };
