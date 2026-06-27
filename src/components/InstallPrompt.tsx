import { useState, useEffect } from 'react';
import { X, Smartphone, Share, PlusSquare, ArrowUpFromLine, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if already running in standalone (installed) mode
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      return; // Already installed
    }

    // 2. Check if user dismissed this prompt in the current session / permanently
    const isDismissed = localStorage.getItem('oh_install_prompt_dismissed') === 'true';
    if (isDismissed) {
      return;
    }

    // 3. Detect device type (mobile focus)
    const userAgent = window.navigator.userAgent;
    const isMobileDevice = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    // Also include a screen width check as a backup for testing/responsive layout
    const isSmallScreen = window.innerWidth <= 768;

    if (!isMobileDevice && !isSmallScreen) {
      return; // Only show on mobile screens/devices
    }

    // 4. Detect iOS specifically
    const isAppleIos = /iPhone|iPad|iPod/i.test(userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPad OS 13+
    setIsIos(isAppleIos);

    // 5. Handle standard PWA installation prompt (for Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If it's iOS or any other mobile browser where beforeinstallprompt isn't supported,
    // show our prompt after a short delay (e.g. 3 seconds) so it's not immediately intrusive.
    if (isAppleIos) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      // For non-iOS where beforeinstallprompt doesn't fire but we still want them to know
      // how to install (via browser menu), we can show it as a fallback if the event doesn't fire.
      const timer = setTimeout(() => {
        if (!deferredPrompt) {
          setShowPrompt(true);
        }
      }, 4000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback instruction for Android browsers that don't support direct triggers:
      alert('To install, tap your browser menu (three dots icon) at the top right and select "Add to Home screen" or "Install app".');
      return;
    }

    // Show the native installation prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice: ${outcome}`);

    // We no longer need the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Persist dismissal so we don't spam the user
    localStorage.setItem('oh_install_prompt_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-6 md:hidden pointer-events-none">
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="w-full max-w-sm mx-auto bg-[#181818] border border-[#c5a059]/30 rounded-2xl shadow-2xl p-4 pointer-events-auto text-[#e4e3e0] relative overflow-hidden"
          >
            {/* Elegant luxury top border design element */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#c5a059]/60 to-transparent" />

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition p-1.5 rounded-full hover:bg-white/5"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header / Content */}
            <div className="flex gap-3.5 items-start mt-1">
              <div className="p-2.5 bg-[#c5a059]/10 border border-[#c5a059]/20 rounded-xl text-[#c5a059] shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="space-y-1 pr-6">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-serif italic font-bold text-sm text-[#c5a059]">Install App</h4>
                  <Sparkles className="w-3 h-3 text-[#c5a059] fill-[#c5a059]/30 animate-pulse" />
                </div>
                <p className="text-xs font-medium text-gray-200">
                  Add <strong>Orchid Heights Accounts</strong> to your home screen for quick, offline-ready financial tracking.
                </p>
              </div>
            </div>

            {/* Installation Action Section */}
            <div className="mt-4 pt-3.5 border-t border-white/5">
              {isIos ? (
                // iOS Installation Instructions
                <div className="space-y-2.5 text-[11px] text-gray-400">
                  <p className="font-semibold text-gray-300">To install on your iPhone / iPad:</p>
                  <div className="flex items-center gap-2.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                    <ArrowUpFromLine className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>
                      1. Tap the <strong className="text-white">Share</strong> button at the bottom of Safari.
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5 bg-white/5 px-2.5 py-1.5 rounded-lg border border-white/5">
                    <PlusSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      2. Scroll down and choose <strong className="text-white">Add to Home Screen</strong>.
                    </span>
                  </div>
                </div>
              ) : (
                // Android Direct Installation Action
                <div className="flex gap-2">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-gradient-to-r from-[#c5a059] to-[#b38a43] hover:from-[#d6b16d] hover:to-[#c5a059] text-[#111] text-xs font-semibold py-2 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 uppercase tracking-wider text-center"
                  >
                    Install App
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-medium py-2 px-3 rounded-lg border border-white/5 transition"
                  >
                    Maybe Later
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
