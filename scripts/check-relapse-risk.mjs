// Script to check users at risk of auto-relapse (24-hour window)
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

const USERS_COLLECTION = 'users';
const GUESTS_COLLECTION = 'guests';

async function getActiveUsersAtRisk() {
  const now = new Date();
  const results = [];

  // Fetch from both collections
  for (const collectionName of [USERS_COLLECTION, GUESTS_COLLECTION]) {
    try {
      const snapshot = await getDocs(collection(db, collectionName));
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const streak = data.streak;
        const user = data.user;
        
        // Only check active users with a start date
        if (streak?.isActive && streak?.startDate && streak?.lastUpdateTime) {
          const lastUpdate = new Date(streak.lastUpdateTime);
          const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
          const hoursRemaining = 24 - hoursSinceUpdate;
          
          // Only include users who haven't already relapsed (hoursRemaining > 0)
          if (hoursRemaining > 0) {
            results.push({
              name: user.name,
              type: user.isGuest ? 'Guest' : 'Google',
              hoursRemaining: hoursRemaining,
              lastUpdate: streak.lastUpdateTime,
            });
          }
        }
      });
    } catch (error) {
      console.error(`Error fetching ${collectionName}:`, error);
    }
  }

  // Sort by hours remaining (ascending - most urgent first)
  results.sort((a, b) => a.hoursRemaining - b.hoursRemaining);
  
  return results;
}

async function main() {
  console.log('\n🔥 Users at Risk of Auto-Relapse (24-hour window)\n');
  console.log('=' .repeat(60));
  
  const users = await getActiveUsersAtRisk();
  
  if (users.length === 0) {
    console.log('\n✅ No active users at risk of relapse.\n');
  } else {
    console.log(`\nFound ${users.length} active user(s):\n`);
    console.log('Name'.padEnd(25) + 'Type'.padEnd(10) + 'Hours Left'.padEnd(15) + 'Last Update');
    console.log('-'.repeat(70));
    
    users.forEach((user) => {
      const hoursStr = user.hoursRemaining.toFixed(2) + ' hrs';
      const urgency = user.hoursRemaining < 6 ? ' ⚠️ URGENT' : user.hoursRemaining < 12 ? ' ⏰' : '';
      console.log(
        user.name.padEnd(25) + 
        user.type.padEnd(10) + 
        hoursStr.padEnd(15) + 
        new Date(user.lastUpdate).toLocaleString() +
        urgency
      );
    });
    
    console.log('\n' + '-'.repeat(70));
    console.log(`Total: ${users.length} user(s) need to confirm within 24 hours or will be auto-relapsed.\n`);
  }
  
  process.exit(0);
}

main().catch(console.error);
