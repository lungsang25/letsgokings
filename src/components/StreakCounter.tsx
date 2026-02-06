import { useEffect, useState } from 'react';
import { Flame, Calendar, Trophy } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';

const StreakCounter = () => {
  const { streakData, currentUser, leaderboard } = useApp();
  const [displayDays, setDisplayDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      if (!streakData?.startDate || !streakData.isActive) {
        setDisplayDays(0);
        setHours(0);
        setMinutes(0);
        setSeconds(0);
        return;
      }

      const start = new Date(streakData.startDate);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

      setDisplayDays(days);
      setHours(hrs);
      setMinutes(mins);
      setSeconds(secs);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [streakData]);

  const isActive = streakData?.isActive && streakData?.startDate;

  // Calculate user's rank from leaderboard
  const userRank = currentUser 
    ? leaderboard.findIndex(entry => entry.user.id === currentUser.id) + 1 
    : 0;

  return (
    <div className="card-elevated p-6 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Flame className={`h-5 w-5 ${isActive ? 'text-primary animate-pulse-glow' : 'text-muted-foreground'}`} />
          <h2 className="text-lg font-semibold">Your Streak</h2>
        </div>
        {userRank > 0 && (
          <div className="flex items-center gap-1">
            <Trophy className="h-5 w-5 text-primary" />
            <span className="text-lg font-semibold text-white">{userRank}</span>
          </div>
        )}
      </div>

      <div className="text-center">
        <div className="relative inline-block">
          <div className={`text-7xl sm:text-8xl font-display font-bold animate-count-up ${isActive ? 'text-gradient-gold' : 'text-muted-foreground'}`}>
            {displayDays}
          </div>
          <div className="text-sm uppercase tracking-widest text-muted-foreground mt-2">
            {displayDays === 1 ? 'Day' : 'Days'}
          </div>
        </div>

        {isActive && (
          <div className="mt-6 flex justify-center gap-4 sm:gap-6">
            <TimeUnit value={hours} label="Hours" />
            <TimeUnit value={minutes} label="Min" />
            <TimeUnit value={seconds} label="Sec" />
          </div>
        )}

        {streakData?.startDate && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Started {new Date(streakData.startDate).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            })}</span>
          </div>
        )}

        {!isActive && (
          <p className="mt-6 text-muted-foreground">
            Start your challenge to begin tracking
          </p>
        )}
      </div>
    </div>
  );
};

const TimeUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <div className="bg-secondary/50 rounded-lg px-3 py-2 min-w-[3rem]">
      <span className="text-xl font-semibold font-mono">
        {value.toString().padStart(2, '0')}
      </span>
    </div>
    <span className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">{label}</span>
  </div>
);

export default StreakCounter;
