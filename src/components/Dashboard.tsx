import { useState } from 'react';
import { Flame, AlertTriangle, CheckCircle, Crown, RefreshCw } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import StreakCounter from './StreakCounter';
import Leaderboard from './Leaderboard';
import Header from './Header';

const Dashboard = () => {
  const { streakData, startChallenge, relapse, confirmActive, getDaysCount } = useApp();
  const [showConfirmation, setShowConfirmation] = useState(false);

  const isActive = streakData?.isActive && streakData?.startDate;
  const daysCount = getDaysCount();

  // Check if last update was more than 48 hours ago
  const needsConfirmation = () => {
    if (!streakData?.lastUpdateTime) return false;
    const lastUpdate = new Date(streakData.lastUpdateTime);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    return hoursDiff >= 48;
  };

  const handleConfirmActive = () => {
    confirmActive();
    setShowConfirmation(true);
    setTimeout(() => setShowConfirmation(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <Header />
      
      <main className="container py-6 sm:py-8">
        {/* Motivational Banner */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Rise Above</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">
            {isActive ? (
              <>Keep Going, <span className="text-gradient-gold">King</span></>
            ) : (
              <>Your Journey Awaits, <span className="text-gradient-gold">King</span></>
            )}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            {isActive 
              ? `${daysCount} days of power. Every moment strengthens your resolve.`
              : "Take the first step towards mastering your energy and unlocking your potential."
            }
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Left Column - Streak & Actions */}
          <div className="space-y-6">
            <StreakCounter />

            {/* Action Buttons */}
            <div className="card-elevated p-6">
              <h3 className="font-semibold mb-4">Actions</h3>
              
              <div className="space-y-3">
                {!isActive ? (
                  <Button
                    onClick={startChallenge}
                    className="w-full h-12 bg-gradient-gold text-primary-foreground hover:opacity-90 font-semibold text-base glow-primary"
                  >
                    <Flame className="h-5 w-5 mr-2" />
                    Start Challenge
                  </Button>
                ) : (
                  <>
                    {/* Confirm Still Active */}
                    <Button
                      onClick={handleConfirmActive}
                      variant="outline"
                      className="w-full h-12 border-success/50 text-success hover:bg-success/10 hover:border-success font-medium"
                    >
                      {showConfirmation ? (
                        <>
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Status Confirmed!
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2" />
                          Confirm Still On Track
                        </>
                      )}
                    </Button>

                    {needsConfirmation() && (
                      <p className="text-xs text-amber-500 text-center">
                        ⚠️ Please confirm your status within 48 hours to stay active
                      </p>
                    )}

                    {/* Relapse Button */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full h-12 border-destructive/50 text-destructive hover:bg-destructive/10 hover:border-destructive font-medium"
                        >
                          <AlertTriangle className="h-5 w-5 mr-2" />
                          Report Relapse
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-card border-border">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="font-display">Reset Your Streak?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will reset your streak to 0 days. Remember, every king falls — what matters is that you rise again. Your honesty strengthens the community.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border/50">Keep Going</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={relapse}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Reset & Rise Again
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </div>

              {isActive && (
                <div className="mt-4 p-3 rounded-lg bg-secondary/30 border border-border/30">
                  <p className="text-xs text-muted-foreground text-center">
                    💪 <span className="font-medium">Honesty is power.</span> The community respects truthful warriors.
                  </p>
                </div>
              )}
            </div>

            {/* Milestones */}
            {isActive && (
              <div className="card-elevated p-6">
                <h3 className="font-semibold mb-4">Milestones</h3>
                <div className="grid grid-cols-4 gap-2">
                  {[7, 14, 30, 90].map((milestone) => (
                    <div
                      key={milestone}
                      className={`
                        text-center p-3 rounded-lg border transition-all
                        ${daysCount >= milestone 
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'bg-secondary/30 border-border/30 text-muted-foreground'
                        }
                      `}
                    >
                      <div className="text-lg font-bold">{milestone}</div>
                      <div className="text-xs">days</div>
                      {daysCount >= milestone && (
                        <CheckCircle className="h-4 w-4 mx-auto mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Leaderboard */}
          <Leaderboard />
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
