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
  submitFeedback: (message: string) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const USERS_COLLECTION = 'users';
const GUESTS_COLLECTION = 'guests';
const FEEDBACK_COLLECTION = 'feedback';
const GUEST_ID_KEY = 'letsgokings_guest_id';

// Get or create a persistent guest ID
const getOrCreateGuestId = (): string => {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
};

// Get existing guest ID (returns null if none exists)
const getExistingGuestId = (): string | null => {
  return localStorage.getItem(GUEST_ID_KEY);
};

// Helper to calculate days from streak
const calculateDaysCount = (streak: StreakData): number => {
  if (!streak?.startDate || !streak.isActive) return 0;
  const start = new Date(streak.startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Check if user has been inactive for more than 24 hours
const isInactiveOver24Hours = (streak: StreakData): boolean => {
  if (!streak || streak.isActive) return false; // Active users are not filtered
  
  const lastUpdate = new Date(streak.lastUpdateTime);
  const now = new Date();
  const hoursSinceInactive = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceInactive > 24;
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

  // Subscribe to leaderboard updates from both users and guests collections
  useEffect(() => {
    const usersQuery = query(collection(db, USERS_COLLECTION));
    const guestsQuery = query(collection(db, GUESTS_COLLECTION));
    
    let usersEntries: LeaderboardEntry[] = [];
    let guestsEntries: LeaderboardEntry[] = [];
    
    const updateLeaderboard = () => {
      const allEntries = [...usersEntries, ...guestsEntries];
      // Filter out users who have been inactive for more than 24 hours
      const activeEntries = allEntries.filter(entry => !isInactiveOver24Hours(entry.streak));
      // Sort by days count descending
      activeEntries.sort((a, b) => b.daysCount - a.daysCount);
      setLeaderboard(activeEntries);
    };
    
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      usersEntries = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreUserDoc;
        usersEntries.push({
          user: data.user,
          streak: data.streak,
          daysCount: calculateDaysCount(data.streak),
        });
      });
      updateLeaderboard();
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching users leaderboard:', error);
      setIsLoading(false);
    });
    
    const unsubscribeGuests = onSnapshot(guestsQuery, (snapshot) => {
      guestsEntries = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as FirestoreUserDoc;
        guestsEntries.push({
          user: data.user,
          streak: data.streak,
          daysCount: calculateDaysCount(data.streak),
        });
      });
      updateLeaderboard();
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching guests leaderboard:', error);
      setIsLoading(false);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeGuests();
    };
  }, []);

  // Load current user's streak data when they log in
  useEffect(() => {
    if (!currentUser) return;

    const fetchUserData = async () => {
      try {
        const collectionName = currentUser.isGuest ? GUESTS_COLLECTION : USERS_COLLECTION;
        const userDoc = await getDoc(doc(db, collectionName, currentUser.id));
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

  // Restore guest session from localStorage on mount
  useEffect(() => {
    const restoreGuestSession = async () => {
      // Only restore if no authenticated user
      if (currentUser) return;
      
      const existingGuestId = getExistingGuestId();
      if (!existingGuestId) return;
      
      try {
        const guestDoc = await getDoc(doc(db, GUESTS_COLLECTION, existingGuestId));
        if (guestDoc.exists()) {
          const data = guestDoc.data() as FirestoreUserDoc;
          setCurrentUser(data.user);
          setStreakData(data.streak);
        }
      } catch (error) {
        console.error('Error restoring guest session:', error);
      }
    };

    // Wait for auth state to settle before restoring guest
    if (!isLoading) {
      restoreGuestSession();
    }
  }, [isLoading, currentUser]);

  const getDaysCount = (): number => {
    if (!streakData?.startDate || !streakData.isActive) return 0;
    const start = new Date(streakData.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  // Save user data to Firestore (users or guests collection)
  const saveToFirestore = async (user: User, streak: StreakData) => {
    const collectionName = user.isGuest ? GUESTS_COLLECTION : USERS_COLLECTION;
    
    try {
      // Remove undefined fields (Firestore doesn't accept undefined)
      const cleanUser = {
        id: user.id,
        name: user.name,
        isGuest: user.isGuest,
        ...(user.email && { email: user.email }),
        ...(user.photoUrl && { photoUrl: user.photoUrl }),
      };
      
      const userDoc = {
        user: cleanUser,
        streak,
        updatedAt: Timestamp.now(),
      };
      await setDoc(doc(db, collectionName, user.id), userDoc);
    } catch (error) {
      console.error('Error saving to Firestore:', error);
    }
  };

  const login = async (user: User) => {
    // For guests, ensure we use persistent ID
    const finalUser = user.isGuest 
      ? { ...user, id: getOrCreateGuestId() }
      : user;
    
    setCurrentUser(finalUser);
    
    // Check if user exists in Firestore (both authenticated and guest)
    const collectionName = finalUser.isGuest ? GUESTS_COLLECTION : USERS_COLLECTION;
    try {
      const userDoc = await getDoc(doc(db, collectionName, finalUser.id));
      if (userDoc.exists()) {
        const data = userDoc.data() as FirestoreUserDoc;
        setStreakData(data.streak);
        // Update user info (photo, name might have changed)
        await saveToFirestore(finalUser, data.streak);
      } else if (finalUser.isGuest) {
        // New guest - don't save to Firestore yet, only save when they start challenge
        // Just set initial local state
        const initialStreak: StreakData = {
          userId: finalUser.id,
          startDate: null,
          isActive: false,
          lastUpdateTime: new Date().toISOString(),
        };
        setStreakData(initialStreak);
      }
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const logout = async () => {
    try {
      // Only sign out from Firebase Auth if not a guest
      if (currentUser && !currentUser.isGuest) {
        await signOut(auth);
      }
      // Clear guest ID from localStorage when logging out
      if (currentUser?.isGuest) {
        localStorage.removeItem(GUEST_ID_KEY);
      }
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

  const submitFeedback = async (message: string): Promise<boolean> => {
    if (!currentUser || !message.trim()) return false;
    
    try {
      const feedbackId = `${currentUser.id}_${Date.now()}`;
      const feedbackDoc = {
        userId: currentUser.id,
        userName: currentUser.name,
        isGuest: currentUser.isGuest,
        message: message.trim(),
        createdAt: Timestamp.now(),
      };
      await setDoc(doc(db, FEEDBACK_COLLECTION, feedbackId), feedbackDoc);
      return true;
    } catch (error) {
      console.error('Error submitting feedback:', error);
      return false;
    }
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
        submitFeedback,
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
