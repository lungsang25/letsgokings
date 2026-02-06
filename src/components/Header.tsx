import { Crown, LogOut } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Header = () => {
  const { currentUser, logout } = useApp();

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
            <div className="hidden sm:flex items-center gap-2">
              <Avatar className="h-8 w-8 border-2 border-primary/30">
                <AvatarImage src={currentUser.photoUrl} alt={currentUser.name} />
                <AvatarFallback className="bg-secondary text-xs font-medium">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium leading-none">{currentUser.name}</span>
                {currentUser.isGuest && (
                  <span className="text-xs text-muted-foreground">Guest</span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
