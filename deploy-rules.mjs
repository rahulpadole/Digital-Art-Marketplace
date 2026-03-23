import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const source = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Artworks - anyone can read, only artists can create/update their own
    match /artworks/{artworkId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && request.auth.uid == resource.data.artistId;

      // Likes subcollection
      match /likes/{userId} {
        allow read: if true;
        allow write: if request.auth != null && request.auth.uid == userId;
      }
    }

    // Comments - anyone can read, logged in users can write
    match /comments/{commentId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Orders - buyers and sellers can read their own
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null &&
        (request.auth.uid == resource.data.buyerId || request.auth.uid == resource.data.sellerId);
    }

    // Notifications - users can read/update their own
    match /notifications/{notifId} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null && request.auth.uid == resource.data.userId;
    }

    // Chats - only participants can read/write
    match /chats/{chatId} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;

      match /messages/{messageId} {
        allow read, write: if request.auth != null;
      }
    }
  }
}`;

async function deploy() {
  try {
    const ruleset = await admin.securityRules().createRuleset({
      source: {
        files: [{
          name: 'firestore.rules',
          content: source
        }]
      }
    });
    
    await admin.securityRules().releaseFirestoreRuleset(ruleset.name);
    console.log('✅ Firestore security rules deployed successfully!');
  } catch (err) {
    console.error('❌ Error deploying rules:', err);
  }
}

deploy();
