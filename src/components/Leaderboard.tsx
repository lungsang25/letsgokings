import { Trophy, Users } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import UserCard from './UserCard';
import { ScrollArea } from '@/components/ui/scroll-area';

const Leaderboard = () => {
  const { leaderboard, currentUser } = useApp();

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    // Active users first, then by days count
    if (a.streak.isActive !== b.streak.isActive) {
      return a.streak.isActive ? -1 : 1;
    }
    return b.daysCount - a.daysCount;
  });

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
