import { Crown, Flame, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface UserCardProps {
  rank: number;
  name: string;
  photoUrl?: string;
  daysCount: number;
  isActive: boolean;
  isCurrentUser?: boolean;
  isGuest?: boolean;
}

const UserCard = ({ 
  rank, 
  name, 
  photoUrl, 
  daysCount, 
  isActive, 
  isCurrentUser,
  isGuest 
}: UserCardProps) => {
  const getRankStyle = () => {
    switch (rank) {
      case 1:
        return 'bg-gradient-gold glow-gold border-gold/30';
      case 2:
        return 'bg-gradient-silver border-silver/30';
      case 3:
        return 'bg-gradient-bronze border-bronze/30';
      default:
        return 'bg-secondary/30 border-border/50';
    }
  };

  const getRankBadge = () => {
    if (rank <= 3) {
      return (
        <div className={`
          flex items-center justify-center w-8 h-8 rounded-full 
          ${rank === 1 ? 'bg-gradient-gold' : rank === 2 ? 'bg-gradient-silver' : 'bg-gradient-bronze'}
        `}>
          {rank === 1 ? (
            <Crown className="h-4 w-4 text-background" />
          ) : (
            <span className="text-sm font-bold text-background">{rank}</span>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary">
        <span className="text-sm font-medium text-muted-foreground">{rank}</span>
      </div>
    );
  };

  return (
    <div className={`
      relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-300
      ${isCurrentUser ? 'ring-2 ring-primary/50' : ''}
      ${rank <= 3 ? getRankStyle() : 'bg-card/50 border-border/30 hover:bg-card/80'}
    `}>
      {/* Rank Badge */}
      {getRankBadge()}

      {/* Avatar */}
      <Avatar className={`h-12 w-12 ${rank <= 3 ? 'border-2 border-background/30' : 'border border-border'}`}>
        <AvatarImage src={photoUrl} alt={name} />
        <AvatarFallback className={`${rank <= 3 ? 'bg-background/20 text-background font-semibold' : 'bg-secondary'}`}>
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`font-medium truncate ${rank <= 3 ? 'text-background' : 'text-foreground'}`}>
            {name}
          </span>
          {isCurrentUser && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${rank <= 3 ? 'bg-background/20 text-background' : 'bg-primary/10 text-primary'}`}>
              You
            </span>
          )}
          {isGuest && (
            <span className={`text-xs ${rank <= 3 ? 'text-background/70' : 'text-muted-foreground'}`}>
              (Guest)
            </span>
          )}
        </div>
        <div className={`flex items-center gap-1 text-sm ${rank <= 3 ? 'text-background/80' : 'text-muted-foreground'}`}>
          {isActive ? (
            <>
              <Flame className="h-3 w-3" />
              <span>Active streak</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3 w-3" />
              <span>Inactive</span>
            </>
          )}
        </div>
      </div>

      {/* Days Count */}
      <div className="text-right">
        <div className={`text-2xl font-display font-bold ${rank <= 3 ? 'text-background' : 'text-foreground'}`}>
          {daysCount}
        </div>
        <div className={`text-xs ${rank <= 3 ? 'text-background/70' : 'text-muted-foreground'}`}>
          {daysCount === 1 ? 'day' : 'days'}
        </div>
      </div>
    </div>
  );
};

export default UserCard;
