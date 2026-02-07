// One-time script to exempt specific users from 24-hour auto-relapse
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBYn8Cm6HMheXYXq-mK6VrjAiuvgoaTODM",
  authDomain: "letsgokings-369ea.firebaseapp.com",
  projectId: "letsgokings-369ea",
  storageBucket: "letsgokings-369ea.firebasestorage.app",
  messagingSenderId: "488277685860",
  appId: "1:488277685860:web:78ec0ade64cc4d563e5171",
  measurementId: "G-HW520HE04S"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Users to exempt (from Luffy Desai to Gigachad)
const USERS_TO_EXEMPT = [
  'Luffy Desai',
  'AlphaWolf Jones',
  'NoobMaster69',
  'Steven',
  'Evelyn',
  'Robert77',
  'Goku Malhotra',
  'BeastMode',
  'Link Jackson',
  'Mike Jain',
  'CaptainAwesome',
  'letsdothis',
  'Alex',
  'IamTenzin',
  'MLGPro',
  'Gigachad',
];

const USERS_COLLECTION = 'users';
const GUESTS_COLLECTION = 'guests';

async function exemptUsers() {
  console.log('\n🛡️  Exempting users from 24-hour auto-relapse...\n');
  
  let exemptedCount = 0;
  
  for (const collectionName of [USERS_COLLECTION, GUESTS_COLLECTION]) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const userName = data.user?.name;
        
        if (USERS_TO_EXEMPT.includes(userName)) {
          // Update the streak.exempt field
          await updateDoc(doc(db, collectionName, docSnapshot.id), {
            'streak.exempt': true
          });
          console.log(`✅ Exempted: ${userName} (${collectionName})`);
          exemptedCount++;
        }
      }
    } catch (error) {
      console.error(`Error processing ${collectionName}:`, error);
    }
  }
  
  console.log(`\n✨ Done! Exempted ${exemptedCount} user(s) from auto-relapse.\n`);
  process.exit(0);
}

exemptUsers().catch(console.error);
