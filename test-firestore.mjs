import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDwWatAot3i14chBqJpRWXpouX7ILckN9A",
  authDomain: "digital-art-website.firebaseapp.com",
  projectId: "digital-art-website",
  storageBucket: "digital-art-website.firebasestorage.app",
  messagingSenderId: "420044978016",
  appId: "1:420044978016:web:b5af68a6991e405a515005",
  measurementId: "G-XJ9PHC2E0M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function test() {
  try {
    console.log("Testing read...");
    const snapshot = await getDocs(collection(db, "users"));
    console.log(`Read success! Found ${snapshot.size} users.`);
    
    console.log("Testing write...");
    await setDoc(doc(db, "test", "test2"), { now: new Date() });
    console.log("Write success!");
    process.exit(0);
  } catch (error) {
    console.error("FirebaseError caught!");
    console.error("Code:", error.code);
    console.error("Message:", error.message);
    process.exit(1);
  }
}

test();
