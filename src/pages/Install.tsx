import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, Download, CheckCircle } from "lucide-react";

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 space-y-6 border-2 border-primary/20">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="w-12 h-12 text-primary" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-foreground">
            Installation Required
          </h1>
          
          <p className="text-muted-foreground">
            You must install SPORTY CODES app to access our platform. Install now for instant access to live odds and secure betting!
          </p>
          
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-semibold text-destructive">
              ⚠️ Browser access is not supported. Please install the app.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {isInstalled ? (
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">App is already installed!</span>
            </div>
          ) : isInstallable ? (
            <Button
              onClick={handleInstallClick}
              className="w-full"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Install App
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Manual Installation</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-semibold">On iPhone/iPad:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Tap the Share button (box with arrow)</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" in the top right</li>
                  </ol>
                  
                  <p className="font-semibold mt-4">On Android:</p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Tap the menu (3 dots) in the browser</li>
                    <li>Tap "Add to Home Screen" or "Install App"</li>
                    <li>Tap "Install" or "Add"</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <h3 className="font-semibold text-sm">Benefits of Installing:</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                <span>Quick access from your home screen</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                <span>Works offline after first visit</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                <span>Receive push notifications for live matches</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-primary mt-0.5" />
                <span>Faster loading and better performance</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Install;
