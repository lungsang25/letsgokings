import { useEffect, useRef, useMemo } from 'react';
import { Trophy, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import UserCard from './UserCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trackLeaderboardViewed } from '@/lib/analytics';

const Leaderboard = () => {
  const { leaderboard, currentUser } = useApp();
  
  // Store previous rankings to calculate rank changes
  const previousRankingsRef = useRef<Map<string, number>>(new Map());

  // Track leaderboard view on mount
  useEffect(() => {
    if (currentUser) {
      trackLeaderboardViewed(currentUser.isGuest ? 'guest' : 'google');
    }
  }, [currentUser?.id]);

  const sortedLeaderboard = useMemo(() => {
    return [...leaderboard].sort((a, b) => {
      // Active users first, then by days count
      if (a.streak.isActive !== b.streak.isActive) {
        return a.streak.isActive ? -1 : 1;
      }
      return b.daysCount - a.daysCount;
    });
  }, [leaderboard]);

  // Calculate rank changes by comparing current rankings with previous
  const rankChanges = useMemo(() => {
    const changes = new Map<string, number>();
    
    sortedLeaderboard.forEach((entry, index) => {
      const currentRank = index + 1;
      const previousRank = previousRankingsRef.current.get(entry.user.id);
      
      if (previousRank !== undefined) {
        // Positive = moved up (rank decreased), Negative = moved down (rank increased)
        changes.set(entry.user.id, previousRank - currentRank);
      } else {
        changes.set(entry.user.id, 0); // New user, no change
      }
    });
    
    return changes;
  }, [sortedLeaderboard]);

  // Update previous rankings after calculating changes
  useEffect(() => {
    const newRankings = new Map<string, number>();
    sortedLeaderboard.forEach((entry, index) => {
      newRankings.set(entry.user.id, index + 1);
    });
    previousRankingsRef.current = newRankings;
  }, [sortedLeaderboard]);

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Leaderboard</h2>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{leaderboard.length} warriors</span>
        </div>
      </div>

      <ScrollArea className="h-[400px] sm:h-[500px] pr-4 -mr-4">
        <div className="space-y-3">
          {sortedLeaderboard.map((entry, index) => (
            <UserCard
              key={entry.user.id}
              rank={index + 1}
              name={entry.user.name}
              photoUrl={entry.user.photoUrl}
              daysCount={entry.daysCount}
              isActive={entry.streak.isActive}
              isCurrentUser={currentUser?.id === entry.user.id}
              isGuest={entry.user.isGuest}
              rankChange={rankChanges.get(entry.user.id) || 0}
              isRecentlyRelapsed={entry.isRecentlyRelapsed}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="mt-6 pt-4 border-t border-border/50">
        <p className="text-xs text-center text-muted-foreground">
          🤝 <span className="font-medium">Truthfulness to the community</span> — We honor honest participation
        </p>
      </div>
    </div>
  );
};

export default Leaderboard;
