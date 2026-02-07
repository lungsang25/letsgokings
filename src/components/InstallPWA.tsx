import { Download, X, Share } from "lucide-react";
import { useState, useEffect } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { Button } from "@/components/ui/button";
import { trackAppInstallClicked } from "@/lib/analytics";

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

function isInStandaloneMode(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
}

export function InstallPWA() {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    // Show iOS prompt if on iOS, not in standalone mode, and not dismissed before
    if (isIOS() && !isInStandaloneMode()) {
      const wasDismissed = localStorage.getItem("pwa-ios-dismissed");
      if (!wasDismissed) {
        // Delay showing the prompt slightly for better UX
        const timer = setTimeout(() => setShowIOSPrompt(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    if (showIOSPrompt) {
      localStorage.setItem("pwa-ios-dismissed", "true");
      setShowIOSPrompt(false);
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) {
    return null;
  }

  // iOS-specific prompt
  if (showIOSPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border border-border rounded-lg p-4 shadow-lg z-50 animate-in slide-in-from-bottom-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
            <Share className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">Install LetsGoKings</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Tap <span className="inline-flex items-center"><Share className="h-3 w-3 mx-0.5" /></span> then <strong>"Add to Home Screen"</strong>
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <span className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                  <Share className="h-3 w-3" />
                </span>
                <span>→</span>
                <span className="px-1.5 py-0.5 rounded bg-muted text-[10px]">Add to Home Screen</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Android/Chrome prompt
  if (!isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-card border border-border rounded-lg p-4 shadow-lg z-50 animate-in slide-in-from-bottom-4">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm">Install LetsGoKings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Add to your home screen for quick access
          </p>
          <Button
            onClick={() => {
              trackAppInstallClicked('android');
              install();
            }}
            size="sm"
            className="mt-2 w-full"
          >
            Install App
          </Button>
        </div>
      </div>
    </div>
  );
}
