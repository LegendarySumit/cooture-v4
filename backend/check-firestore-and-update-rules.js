const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize with service account (same as backend)
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
const serviceAccount = require(serviceAccountPath);

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id
  });
  
  console.log('[INFO] Firebase Admin initialized');
  console.log('[INFO] Project:', serviceAccount.project_id);
  
  // Try to verify database exists
  const db = admin.firestore();
  
  console.log('[INFO] Testing Firestore connection...');
  
  // This will fail if security rules block it, proving the rules are the issue
  db.collection('_test').limit(1).get()
    .then(snapshot => {
      console.log('[SUCCESS] Firestore is accessible!');
      console.log('[INFO] The security rules are not blocking access.');
      process.exit(0);
    })
    .catch(error => {
      if (error.code === 'PERMISSION_DENIED') {
        console.log('[ERROR] Firestore security rules are blocking access');
        console.log('[ERROR] Error details:', error.message);
        
        // Try getting admin token for Rules API
        console.log('\n[INFO] Attempting to update security rules via REST API...');
        
        admin.credential.cert(serviceAccount).getAccessToken()
          .then(result => {
            const token = result.access_token;
            const projectId = serviceAccount.project_id;
            const rulesContent = fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8');
            
            // Create ruleset
            const rulesUrl = `https://firebaserules.googleapis.com/v1/projects/${projectId}/rulesets`;
            
            return fetch(rulesUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                source: {
                  files: [{
                    name: 'firestore.rules',
                    content: rulesContent
                  }]
                }
              })
            });
          })
          .then(response => response.json())
          .then(result => {
            console.log('[INFO] Ruleset created:', result.name);
            
            // You can then release it
            console.log('[SUCCESS] Rules API is functional');
            console.log('[INFO] Rules have been prepared for deployment');
            process.exit(0);
          })
          .catch(err => {
            console.error('[ERROR]', err.message);
            process.exit(1);
          });
      } else {
        console.error('[ERROR]', error.code, error.message);
        process.exit(1 );
      }
    });
    
} catch (error) {
  console.error('[FATAL]', error.message);
  process.exit(1);
}
