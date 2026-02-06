import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot,
  query,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';

export interface User {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
  isGuest: boolean;
}

export interface StreakData {
  userId: string;
  startDate: string | null;
  isActive: boolean;
  lastUpdateTime: string;
}

interface LeaderboardEntry {
  user: User;
  streak: StreakData;
  daysCount: number;
}

// Firestore document structure
interface FirestoreUserDoc {
  user: User;
  streak: StreakData;
  updatedAt: Timestamp;
}

interface AppContextType {
  currentUser: User | null;
  streakData: StreakData | null;
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  startChallenge: () => void;
  relapse: () => void;
  confirmActive: () => void;
  getDaysCount: () => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const USERS_COLLECTION = 'users';

// Helper to calculate days from streak
const calculateDaysCount = (streak: StreakData): number => {
  if (!streak?.startDate || !streak.isActive) return 0;
  const start = new Date(streak.startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Listen for Firebase Auth state changes (persists login across refreshes)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in - restore session
        const user: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Warrior',
          email: firebaseUser.email || undefined,
          photoUrl: firebaseUser.photoURL || undefined,
          isGuest: false,
        };
        setCurrentUser(user);
        
        // Fetch user's streak data from Firestore
        try {
          const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.id));
          if (userDoc.exists()) {
            const data = userDoc.data() as FirestoreUserDoc;
            setStreakData(data.streak);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
        setStreakData(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to leaderboard updates from Firestore
  useEffect(() => {
    const q = query(collection(db, USERS_COLLECTION));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entries: LeaderboardEntry[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreUserDoc;
        entries.push({
          user: data.user,
          streak: data.streak,
          daysCount: calculateDaysCount(data.streak),
        });
      });
      
      // Sort by days count descending
      entries.sort((a, b) => b.daysCount - a.daysCount);
      setLeaderboard(entries);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching leaderboard:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load current user's streak data when they log in
  useEffect(() => {
    if (!currentUser || currentUser.isGuest) return;

    const fetchUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, currentUser.id));
        if (userDoc.exists()) {
          const data = userDoc.data() as FirestoreUserDoc;
          setStreakData(data.streak);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [currentUser]);

  const getDaysCount = (): number => {
    if (!streakData?.startDate || !streakData.isActive) return 0;
    const start = new Date(streakData.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Save user data to Firestore
  const saveToFirestore = async (user: User, streak: StreakData) => {
    if (user.isGuest) return; // Don't save guest users to Firestore
    
    try {
      const userDoc: FirestoreUserDoc = {
        user,
        streak,
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, USERS_COLLECTION, user.id), userDoc);
    } catch (error) {
      console.error('Error saving to Firestore:', error);
    }
  };

  const login = async (user: User) => {
    setCurrentUser(user);
    
    if (!user.isGuest) {
      // Check if user exists in Firestore
      try {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.id));
        if (userDoc.exists()) {
          const data = userDoc.data() as FirestoreUserDoc;
          setStreakData(data.streak);
          // Update user info (photo, name might have changed)
          await saveToFirestore(user, data.streak);
        }
      } catch (error) {
        console.error('Error during login:', error);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setCurrentUser(null);
      setStreakData(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const startChallenge = async () => {
    if (!currentUser) return;
    
    const newStreak: StreakData = {
      userId: currentUser.id,
      startDate: new Date().toISOString(),
      isActive: true,
      lastUpdateTime: new Date().toISOString(),
    };
    setStreakData(newStreak);
    await saveToFirestore(currentUser, newStreak);
  };

  const relapse = async () => {
    if (!currentUser) return;
    
    const resetStreak: StreakData = {
      userId: currentUser.id,
      startDate: null,
      isActive: false,
      lastUpdateTime: new Date().toISOString(),
    };
    setStreakData(resetStreak);
    await saveToFirestore(currentUser, resetStreak);
  };

  const confirmActive = async () => {
    if (!currentUser || !streakData) return;
    
    const updatedStreak: StreakData = {
      ...streakData,
      lastUpdateTime: new Date().toISOString(),
    };
    setStreakData(updatedStreak);
    await saveToFirestore(currentUser, updatedStreak);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        streakData,
        leaderboard,
        isLoading,
        login,
        logout,
        startChallenge,
        relapse,
        confirmActive,
        getDaysCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
