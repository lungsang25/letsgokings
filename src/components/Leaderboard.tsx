import { useEffect, useMemo } from 'react';
import { Trophy, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import UserCard from './UserCard';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trackLeaderboardViewed } from '@/lib/analytics';

// Check if relapse happened within last 24 hours
const isWithin24Hours = (relapseTime: string | null | undefined): boolean => {
  if (!relapseTime) return false;
  const relapseDate = new Date(relapseTime);
  const now = new Date();
  const hoursSinceRelapse = (now.getTime() - relapseDate.getTime()) / (1000 * 60 * 60);
  return hoursSinceRelapse <= 24;
};

const Leaderboard = () => {
  const { leaderboard, currentUser } = useApp();

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
      // Sort by days count (higher is better)
      if (b.daysCount !== a.daysCount) {
        return b.daysCount - a.daysCount;
      }
      // Tie-breaker: earlier startDate ranks higher (started first = more committed)
      const aStart = a.streak.startDate ? new Date(a.streak.startDate).getTime() : Infinity;
      const bStart = b.streak.startDate ? new Date(b.streak.startDate).getTime() : Infinity;
      return aStart - bStart;
    });
  }, [leaderboard]);

  // Calculate rank changes based on recent relapses (within 24 hours)
  // Users who relapsed get a down arrow
  // Users whose startDate is between relapsed user's startDate and relapseTime get an up arrow
  const rankChanges = useMemo(() => {
    const changes = new Map<string, number>();
    
    // Find users who relapsed within 24 hours
    const recentlyRelapsedUsers = sortedLeaderboard.filter(entry => 
      isWithin24Hours(entry.streak.relapseTime)
    );
    
    // Mark relapsed users with down arrow
    recentlyRelapsedUsers.forEach(relapsedEntry => {
      changes.set(relapsedEntry.user.id, -1);
      
      // Use previousStartDate since startDate becomes null after relapse
      const relapsedPreviousStartDate = relapsedEntry.streak.previousStartDate 
        ? new Date(relapsedEntry.streak.previousStartDate).getTime() 
        : null;
      const relapseTime = relapsedEntry.streak.relapseTime 
        ? new Date(relapsedEntry.streak.relapseTime).getTime() 
        : null;
      
      if (relapsedPreviousStartDate && relapseTime) {
        // Find users who "passed" this relapsed user
        // Their startDate should be between relapsed user's previousStartDate and relapseTime
        sortedLeaderboard.forEach(entry => {
          // Skip the relapsed user themselves
          if (entry.user.id === relapsedEntry.user.id) return;
          // Skip users who also relapsed recently
          if (isWithin24Hours(entry.streak.relapseTime)) return;
          // Skip users without an active streak
          if (!entry.streak.startDate || !entry.streak.isActive) return;
          
          const userStartDate = new Date(entry.streak.startDate).getTime();
          
          // If user started after the relapsed user started, but before they relapsed
          // This user has "passed" the relapsed user
          if (userStartDate > relapsedPreviousStartDate && userStartDate < relapseTime) {
            changes.set(entry.user.id, 1);
          }
        });
      }
    });
    
    return changes;
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
