import { useEffect } from "react";
import { Shield, ArrowRight, X } from "lucide-react";

export function GuestSavePromptModal({
  isOpen,
  onClose,
  entityType = "item",
}: {
  isOpen: boolean;
  onClose: () => void;
  entityType?: "company" | "product" | "service" | "item" | string;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSignIn = () => {
    window.history.pushState({}, "", "/login/personal");
    window.dispatchEvent(new PopStateEvent("popstate"));
    onClose();
  };

  return (
    <div
      id="guest-save-prompt-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-graphite/60 backdrop-blur-xs p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="guest-save-prompt-modal"
        className="relative w-full max-w-md bg-white border border-line rounded-2xl p-6 sm:p-8 text-center space-y-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone hover:text-graphite p-1 rounded-lg transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-full bg-soft border border-royal/20 text-royal flex items-center justify-center mx-auto shadow-xs">
          <Shield className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-bold uppercase tracking-tight text-graphite">
            Personal Workspace Required
          </h2>
          <p className="text-xs text-stone leading-relaxed">
            Sign in to save this to your MarineWorld workspace.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            id="btn-guest-prompt-signin"
            type="button"
            onClick={handleSignIn}
            className="w-full py-2.5 px-4 rounded-xl bg-royal hover:bg-royal-dark text-white font-bold text-xs uppercase tracking-wider transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>SIGN IN</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-guest-prompt-continue"
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs font-semibold text-stone hover:text-graphite transition cursor-pointer"
          >
            CONTINUE EXPLORING
          </button>
        </div>
      </div>
    </div>
  );
}
