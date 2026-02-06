import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

interface AppContextType {
  currentUser: User | null;
  streakData: StreakData | null;
  leaderboard: LeaderboardEntry[];
  login: (user: User) => void;
  logout: () => void;
  startChallenge: () => void;
  relapse: () => void;
  confirmActive: () => void;
  getDaysCount: () => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'letsGoKings_user',
  STREAK: 'letsGoKings_streak',
  LEADERBOARD: 'letsGoKings_leaderboard',
};

// Demo users for leaderboard
const DEMO_USERS: LeaderboardEntry[] = [
  {
    user: { id: 'demo1', name: 'Marcus Aurelius', isGuest: false },
    streak: { userId: 'demo1', startDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), isActive: true, lastUpdateTime: new Date().toISOString() },
    daysCount: 45,
  },
  {
    user: { id: 'demo2', name: 'David Goggins', isGuest: false },
    streak: { userId: 'demo2', startDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString(), isActive: true, lastUpdateTime: new Date().toISOString() },
    daysCount: 32,
  },
  {
    user: { id: 'demo3', name: 'Jocko Willink', isGuest: false },
    streak: { userId: 'demo3', startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(), isActive: true, lastUpdateTime: new Date().toISOString() },
    daysCount: 28,
  },
  {
    user: { id: 'demo4', name: 'Andrew Huberman', isGuest: false },
    streak: { userId: 'demo4', startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), isActive: true, lastUpdateTime: new Date().toISOString() },
    daysCount: 21,
  },
  {
    user: { id: 'demo5', name: 'Jordan Peterson', isGuest: false },
    streak: { userId: 'demo5', startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), isActive: true, lastUpdateTime: new Date().toISOString() },
    daysCount: 14,
  },
];

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(DEMO_USERS);

  // Load from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
    const savedStreak = localStorage.getItem(STORAGE_KEYS.STREAK);
    const savedLeaderboard = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);

    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
    if (savedStreak) {
      setStreakData(JSON.parse(savedStreak));
    }
    if (savedLeaderboard) {
      setLeaderboard(JSON.parse(savedLeaderboard));
    }
  }, []);

  // Save to localStorage when state changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [currentUser]);

  useEffect(() => {
    if (streakData) {
      localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(streakData));
    } else {
      localStorage.removeItem(STORAGE_KEYS.STREAK);
    }
  }, [streakData]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
  }, [leaderboard]);

  const getDaysCount = (): number => {
    if (!streakData?.startDate || !streakData.isActive) return 0;
    const start = new Date(streakData.startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const updateLeaderboard = (user: User, streak: StreakData, days: number) => {
    setLeaderboard(prev => {
      const filtered = prev.filter(entry => entry.user.id !== user.id);
      const newEntry: LeaderboardEntry = { user, streak, daysCount: days };
      const updated = [...filtered, newEntry];
      return updated.sort((a, b) => b.daysCount - a.daysCount);
    });
  };

  const login = (user: User) => {
    setCurrentUser(user);
    // Check if user already has streak data
    const existingEntry = leaderboard.find(entry => entry.user.id === user.id);
    if (existingEntry) {
      setStreakData(existingEntry.streak);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setStreakData(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.STREAK);
  };

  const startChallenge = () => {
    if (!currentUser) return;
    
    const newStreak: StreakData = {
      userId: currentUser.id,
      startDate: new Date().toISOString(),
      isActive: true,
      lastUpdateTime: new Date().toISOString(),
    };
    setStreakData(newStreak);
    updateLeaderboard(currentUser, newStreak, 0);
  };

  const relapse = () => {
    if (!currentUser) return;
    
    const resetStreak: StreakData = {
      userId: currentUser.id,
      startDate: null,
      isActive: false,
      lastUpdateTime: new Date().toISOString(),
    };
    setStreakData(resetStreak);
    updateLeaderboard(currentUser, resetStreak, 0);
  };

  const confirmActive = () => {
    if (!currentUser || !streakData) return;
    
    const updatedStreak: StreakData = {
      ...streakData,
      lastUpdateTime: new Date().toISOString(),
    };
    setStreakData(updatedStreak);
    updateLeaderboard(currentUser, updatedStreak, getDaysCount());
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        streakData,
        leaderboard,
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
