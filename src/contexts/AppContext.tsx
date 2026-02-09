import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  onSnapshot,
  query,
  where,
  Timestamp
} from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '@/lib/firebase';
import {
  trackLogin,
  trackLogout,
  trackSignUp,
  trackChallengeStarted,
  trackRelapse,
  trackAutoRelapse,
  trackStreakConfirmed,
  trackFeedbackSubmitted,
} from '@/lib/analytics';

export interface User {
  id: string;
  name: string;
  email?: string;
  photoUrl?: string;
  isGuest: boolean;
}

// Guest credentials stored in Firestore
interface GuestCredentials {
  username: string;
  password: string; // In production, this should be hashed
  guestId: string;
  createdAt: Timestamp;
}

const GUEST_CREDENTIALS_COLLECTION = 'guest_credentials';

export interface StreakData {
  userId: string;
  startDate: string | null;
  isActive: boolean;
  lastUpdateTime: string;
  relapseTime?: string | null; // Timestamp when user relapsed, used to show red indicator for 3 days
  previousStartDate?: string | null; // Start date before relapse, used to calculate who passed this user
  exempt?: boolean; // If true, user is exempt from 24-hour auto-relapse
}

interface LeaderboardEntry {
  user: User;
  streak: StreakData;
  daysCount: number;
  isRecentlyRelapsed: boolean; // True if user relapsed within last 3 days
}

// Check if user has relapsed within the last 3 days
const isWithinRelapsePeriod = (streak: StreakData): boolean => {
  if (!streak.relapseTime) return false;
  const relapseDate = new Date(streak.relapseTime);
  const now = new Date();
  const daysSinceRelapse = (now.getTime() - relapseDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceRelapse <= 3;
};

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
const GUEST_USERNAME_KEY = 'letsgokings_guest_username';

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

// Check if username already exists in guest_credentials collection
const checkUsernameExists = async (username: string): Promise<boolean> => {
  try {
    const credentialsQuery = query(
      collection(db, GUEST_CREDENTIALS_COLLECTION),
      where('username', '==', username.toLowerCase())
    );
    const snapshot = await getDocs(credentialsQuery);
    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
};

// Register a new guest with username and password
export const registerGuest = async (
  username: string,
  password: string,
  photoUrl?: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // Check if username already exists
    const exists = await checkUsernameExists(username);
    if (exists) {
      return { success: false, error: 'Username already exists. Please choose a different one.' };
    }

    // Create a new guest ID
    const guestId = 'guest_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // Store credentials in guest_credentials collection
    const credentials: GuestCredentials = {
      username: username.toLowerCase(),
      password: password, // Note: In production, hash this password
      guestId: guestId,
      createdAt: Timestamp.now(),
    };
    
    await setDoc(doc(db, GUEST_CREDENTIALS_COLLECTION, username.toLowerCase()), credentials);
    
    // Store guest ID and username in localStorage for session persistence
    localStorage.setItem(GUEST_ID_KEY, guestId);
    localStorage.setItem(GUEST_USERNAME_KEY, username.toLowerCase());
    
    const user: User = {
      id: guestId,
      name: username,
      isGuest: true,
      photoUrl: photoUrl,
    };
    
    return { success: true, user };
  } catch (error) {
    console.error('Error registering guest:', error);
    return { success: false, error: 'Failed to register. Please try again.' };
  }
};

// Check guest credentials for login
export const checkGuestCredentials = async (
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> => {
  try {
    // Get credentials document by username
    const credDoc = await getDoc(doc(db, GUEST_CREDENTIALS_COLLECTION, username.toLowerCase()));
    
    if (!credDoc.exists()) {
      return { success: false, error: 'Username not found. Please register first.' };
    }
    
    const credentials = credDoc.data() as GuestCredentials;
    
    // Check password
    if (credentials.password !== password) {
      return { success: false, error: 'Invalid password.' };
    }
    
    // Store guest ID and username in localStorage for session persistence
    localStorage.setItem(GUEST_ID_KEY, credentials.guestId);
    localStorage.setItem(GUEST_USERNAME_KEY, username.toLowerCase());
    
    // Get user data from guests collection
    const guestDoc = await getDoc(doc(db, GUESTS_COLLECTION, credentials.guestId));
    
    if (guestDoc.exists()) {
      const data = guestDoc.data() as FirestoreUserDoc;
      return { success: true, user: data.user };
    } else {
      // User exists in credentials but not in guests collection (first time after registration)
      const user: User = {
        id: credentials.guestId,
        name: username,
        isGuest: true,
      };
      return { success: true, user };
    }
  } catch (error) {
    console.error('Error checking guest credentials:', error);
    return { success: false, error: 'Failed to login. Please try again.' };
  }
};

// Helper to calculate days from streak
const calculateDaysCount = (streak: StreakData): number => {
  if (!streak?.startDate || !streak.isActive) return 0;
  const start = new Date(streak.startDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - start.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

// Check if user has been inactive for more than 24 hours (for leaderboard filtering)
const isInactiveOver24Hours = (streak: StreakData): boolean => {
  if (!streak || streak.isActive) return false; // Active users are not filtered
  
  const lastUpdate = new Date(streak.lastUpdateTime);
  const now = new Date();
  const hoursSinceInactive = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  
  return hoursSinceInactive > 24;
};

// Check if active user should be auto-relapsed (24+ hours without confirmation)
const shouldAutoRelapse = (streak: StreakData): { shouldRelapse: boolean; hoursInactive: number } => {
  if (!streak || !streak.isActive || !streak.startDate) {
    return { shouldRelapse: false, hoursInactive: 0 };
  }
  
  // Exempt users are never auto-relapsed
  if (streak.exempt) {
    return { shouldRelapse: false, hoursInactive: 0 };
  }
  
  const lastUpdate = new Date(streak.lastUpdateTime);
  const now = new Date();
  const hoursInactive = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
  
  return { shouldRelapse: hoursInactive >= 24, hoursInactive: Math.floor(hoursInactive) };
};

// Client-side auto-relapse: Process all inactive users in a collection
const processAutoRelapseForCollection = async (collectionName: string): Promise<number> => {
  let relapsedCount = 0;
  
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data() as FirestoreUserDoc;
      const { shouldRelapse, hoursInactive } = shouldAutoRelapse(data.streak);
      
      if (shouldRelapse) {
        const streakDays = calculateDaysCount(data.streak);
        
        const resetStreak: StreakData = {
          userId: data.streak.userId,
          startDate: null,
          isActive: false,
          lastUpdateTime: new Date().toISOString(),
          relapseTime: new Date().toISOString(),
          previousStartDate: data.streak.startDate,
        };
        
        await setDoc(doc(db, collectionName, data.user.id), {
          user: data.user,
          streak: resetStreak,
          updatedAt: Timestamp.now(),
        });
        
        // Track auto-relapse
        trackAutoRelapse(streakDays, hoursInactive, data.user.isGuest ? 'guest' : 'google');
        console.log(`Auto-relapsed ${data.user.name} after ${hoursInactive} hours of inactivity`);
        relapsedCount++;
      }
    }
  } catch (error) {
    console.error(`Error processing auto-relapse for ${collectionName}:`, error);
  }
  
  return relapsedCount;
};

// Run client-side auto-relapse check for all users
const runClientAutoRelapse = async (): Promise<void> => {
  console.log('Running client-side auto-relapse check...');
  
  const [usersRelapsed, guestsRelapsed] = await Promise.all([
    processAutoRelapseForCollection(USERS_COLLECTION),
    processAutoRelapseForCollection(GUESTS_COLLECTION),
  ]);
  
  const total = usersRelapsed + guestsRelapsed;
  if (total > 0) {
    console.log(`Auto-relapse complete: ${usersRelapsed} users, ${guestsRelapsed} guests relapsed`);
  }
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

  // Run client-side auto-relapse check once on app load
  // This ensures inactive users are relapsed even if they never return
  useEffect(() => {
    runClientAutoRelapse();
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
      // Sort: active users first, then by days count descending, then by startDate ascending
      activeEntries.sort((a, b) => {
        // Active users first
        if (a.streak.isActive !== b.streak.isActive) {
          return a.streak.isActive ? -1 : 1;
        }
        // Sort by days count (higher is better)
        if (b.daysCount !== a.daysCount) {
          return b.daysCount - a.daysCount;
        }
        // Tie-breaker: earlier startDate ranks higher
        const aStart = a.streak.startDate ? new Date(a.streak.startDate).getTime() : Infinity;
        const bStart = b.streak.startDate ? new Date(b.streak.startDate).getTime() : Infinity;
        return aStart - bStart;
      });
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
          isRecentlyRelapsed: isWithinRelapsePeriod(data.streak),
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
          isRecentlyRelapsed: isWithinRelapsePeriod(data.streak),
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

  // Auto-relapse check: mark user as relapsed if 24+ hours without confirmation
  useEffect(() => {
    if (!currentUser || !streakData) return;
    
    const { shouldRelapse, hoursInactive } = shouldAutoRelapse(streakData);
    if (!shouldRelapse) return;
    
    const performAutoRelapse = async () => {
      const streakDays = calculateDaysCount(streakData);
      const resetStreak: StreakData = {
        userId: currentUser.id,
        startDate: null,
        isActive: false,
        lastUpdateTime: new Date().toISOString(),
        relapseTime: new Date().toISOString(),
        previousStartDate: streakData.startDate,
      };
      
      setStreakData(resetStreak);
      
      const collectionName = currentUser.isGuest ? GUESTS_COLLECTION : USERS_COLLECTION;
      try {
        const userDoc = {
          user: currentUser,
          streak: resetStreak,
          updatedAt: Timestamp.now(),
        };
        await setDoc(doc(db, collectionName, currentUser.id), userDoc);
        // Track auto-relapse event
        trackAutoRelapse(streakDays, hoursInactive, currentUser.isGuest ? 'guest' : 'google');
        console.log(`Auto-relapsed user after ${hoursInactive} hours of inactivity`);
      } catch (error) {
        console.error('Error saving auto-relapse to Firestore:', error);
      }
    };
    
    performAutoRelapse();
  }, [currentUser, streakData]);

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
        // Track login event
        trackLogin(finalUser.isGuest ? 'guest' : 'google');
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
        // Track sign up for new guest
        trackSignUp('guest');
      } else {
        // New Google user - track sign up
        trackSignUp('google');
      }
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const logout = async () => {
    try {
      const userType = currentUser?.isGuest ? 'guest' : 'google';
      // Only sign out from Firebase Auth if not a guest
      if (currentUser && !currentUser.isGuest) {
        await signOut(auth);
      }
      // Clear guest ID and username from localStorage when logging out
      if (currentUser?.isGuest) {
        localStorage.removeItem(GUEST_ID_KEY);
        localStorage.removeItem(GUEST_USERNAME_KEY);
      }
      // Track logout event
      trackLogout(userType);
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
      // Keep relapseTime and previousStartDate so arrows stay visible for 24 hours
      relapseTime: streakData?.relapseTime || null,
      previousStartDate: streakData?.previousStartDate || null,
    };
    setStreakData(newStreak);
    await saveToFirestore(currentUser, newStreak);
    // Track challenge started event
    trackChallengeStarted(currentUser.isGuest ? 'guest' : 'google');
  };

  const relapse = async () => {
    if (!currentUser) return;
    
    // Track relapse with current streak days before resetting
    const currentDays = getDaysCount();
    const resetStreak: StreakData = {
      userId: currentUser.id,
      startDate: null,
      isActive: false,
      lastUpdateTime: new Date().toISOString(),
      relapseTime: new Date().toISOString(), // Track when relapse happened
      previousStartDate: streakData?.startDate || null, // Preserve start date for rank change calculation
    };
    setStreakData(resetStreak);
    await saveToFirestore(currentUser, resetStreak);
    // Track relapse event
    trackRelapse(currentDays, currentUser.isGuest ? 'guest' : 'google');
  };

  const confirmActive = async () => {
    if (!currentUser || !streakData) return;
    
    const currentDays = getDaysCount();
    const updatedStreak: StreakData = {
      ...streakData,
      lastUpdateTime: new Date().toISOString(),
    };
    setStreakData(updatedStreak);
    await saveToFirestore(currentUser, updatedStreak);
    // Track streak confirmed event
    trackStreakConfirmed(currentDays, currentUser.isGuest ? 'guest' : 'google');
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
      // Track feedback submitted event
      trackFeedbackSubmitted(currentUser.isGuest ? 'guest' : 'google');
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
