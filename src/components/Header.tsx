import { useState } from 'react';
import { Crown, LogOut, Sun, Moon, ChevronDown, BookOpen, MessageSquare } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

const Header = () => {
  const { currentUser, logout, submitFeedback } = useApp();
  const { theme, toggleTheme } = useTheme();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const handleFeedbackSubmit = async () => {
    if (!feedbackMessage.trim()) return;
    
    setIsSubmitting(true);
    const success = await submitFeedback(feedbackMessage);
    setIsSubmitting(false);
    
    if (success) {
      setFeedbackSubmitted(true);
      setFeedbackMessage('');
      setTimeout(() => {
        setFeedbackOpen(false);
        setFeedbackSubmitted(false);
      }, 2000);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Crown className="h-8 w-8 text-primary crown-shadow" />
            <div className="absolute inset-0 animate-pulse-glow">
              <Crown className="h-8 w-8 text-primary opacity-50" />
            </div>
          </div>
          <span className="font-display text-xl font-bold tracking-tight">
            LetsGo<span className="text-gradient-gold">Kings</span>
          </span>
        </div>

        {currentUser && (
          <div className="flex items-center gap-3">
            {/* Rules Button */}
            <Button
              variant="ghost"
              onClick={() => setRulesOpen(true)}
              className="text-muted-foreground hover:text-foreground text-xs px-2"
              title="View Rules"
            >
              Rules
            </Button>

            {/* Day/Night Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-muted-foreground hover:text-foreground"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* Dropdown Menu with User Info */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-secondary/50">
                  <Avatar className="h-8 w-8 border-2 border-primary/30">
                    <AvatarImage src={currentUser.photoUrl} alt={currentUser.name} />
                    <AvatarFallback className="bg-secondary text-xs font-medium">
                      {currentUser.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-sm font-medium leading-none">{currentUser.name}</span>
                    {currentUser.isGuest && (
                      <span className="text-xs text-muted-foreground">Guest</span>
                    )}
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" strokeWidth={2.5} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                <DropdownMenuItem onClick={() => setFeedbackOpen(true)} className="cursor-pointer">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Feedback
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-success focus:text-success">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Rules Dialog */}
      <Dialog open={rulesOpen} onOpenChange={setRulesOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Platform Rules</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <span className="text-lg">1.</span>
              <p className="text-sm text-foreground/90">
                <span className="font-semibold">Authenticated users will be move above guest users in the leaderboard.</span>
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <span className="text-lg">2.</span>
              <p className="text-sm text-foreground/90">
                <span className="font-semibold">Confirm your streak within 36 hours to stay active — otherwise, you'll be marked as relapsed.</span>
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <span className="text-lg">3.</span>
              <p className="text-sm text-foreground/90">
                <span className="font-semibold">Relapsed warriors will be removed from the leaderboard after 24 hours of inactivity.</span>
              </p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border/30">
              <span className="text-lg">4.</span>
              <p className="text-sm text-foreground/90">
                <span className="font-semibold">Sign in to keep your streak safe and secure across devices.</span>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setRulesOpen(false)} className="bg-primary text-primary-foreground">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Share Your Feedback</DialogTitle>
            <DialogDescription>
              Please let us know what we can improve on this platform to serve your journey better.
            </DialogDescription>
          </DialogHeader>
          {feedbackSubmitted ? (
            <div className="py-8 text-center">
              <div className="text-4xl mb-3">🙏</div>
              <p className="text-lg font-medium text-success">Thank you for your feedback!</p>
              <p className="text-sm text-muted-foreground">We appreciate you helping us improve.</p>
            </div>
          ) : (
            <>
              <div className="py-4">
                <Textarea
                  placeholder="Share your thoughts, suggestions, or ideas..."
                  value={feedbackMessage}
                  onChange={(e) => setFeedbackMessage(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setFeedbackOpen(false)}
                  className="border-border/50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleFeedbackSubmit}
                  disabled={!feedbackMessage.trim() || isSubmitting}
                  className="bg-primary text-primary-foreground"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </header>
  );
};

export default Header;
