import admin from 'firebase-admin';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function fixRoles() {
  try {
    // Get all users
    const listUsersResult = await auth.listUsers(10);
    
    for (const user of listUsersResult.users) {
      console.log(`Checking user: ${user.email} (${user.uid})`);
      
      const userRef = db.collection('users').doc(user.uid);
      const doc = await userRef.get();
      
      if (!doc.exists) {
        console.log(`- Document missing! Creating as artist...`);
        await userRef.set({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Test Artist',
          role: 'artist',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`- ✅ Role fixed for ${user.email}`);
      } else {
        console.log(`- Document exists. Role is: ${doc.data().role}`);
      }
    }
    console.log('\nAll done! You can now check your profile in the browser.');
  } catch (error) {
    console.error('Error fixing roles:', error);
  }
}

fixRoles();
