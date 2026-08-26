import React, { useState, useEffect } from "react";
import { ShieldCheck, Cookie, ChevronRight, Check } from "lucide-react";

const COOKIE_CONSENT_KEY = "marineworld_cookie_consent_v1";

export interface CookiePreferences {
  essential: boolean; // Always true
  analytics: boolean;
  functional: boolean;
  decidedAt: string;
}

export function CookieConsentBanner() {
  const [isOpen, setIsOpen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    functional: true,
    decidedAt: "",
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (!stored) {
        // First visit: show banner
        setIsOpen(true);
      } else {
        setPreferences(JSON.parse(stored));
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  const handleAcceptAll = () => {
    const pref: CookiePreferences = {
      essential: true,
      analytics: true,
      functional: true,
      decidedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(pref));
    } catch {}
    setPreferences(pref);
    setIsOpen(false);
  };

  const handleAcceptEssentialOnly = () => {
    const pref: CookiePreferences = {
      essential: true,
      analytics: false,
      functional: false,
      decidedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(pref));
    } catch {}
    setPreferences(pref);
    setIsOpen(false);
  };

  const handleSaveCustom = () => {
    const pref: CookiePreferences = {
      ...preferences,
      essential: true,
      decidedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(pref));
    } catch {}
    setPreferences(pref);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      id="cookie-consent-banner"
      role="region"
      aria-label="Cookie and Privacy Preferences"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-white border border-line rounded-2xl shadow-xl p-5 antialiased font-sans text-graphite transition-all duration-300"
    >
      <div className="flex items-start gap-3.5 mb-3">
        <div className="w-9 h-9 rounded-xl bg-royal/10 text-royal flex items-center justify-center shrink-0">
          <Cookie className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-graphite tracking-tight flex items-center gap-1.5">
            Privacy & Cookie Preferences
          </h3>
          <p className="text-xs text-stone leading-relaxed mt-1">
            MarineWorld.City uses essential session storage to deliver verified maritime digital identities and optional diagnostics to optimize sector infrastructure.
          </p>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-line space-y-2.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-line">
            <div>
              <div className="font-bold text-graphite">Essential & Security (Required)</div>
              <div className="text-[11px] text-stone">Session authentication and access gating tokens.</div>
            </div>
            <span className="font-mono text-[10px] font-bold text-royal bg-royal/10 px-2 py-0.5 rounded">
              ALWAYS ON
            </span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-line">
            <div>
              <div className="font-bold text-graphite">Performance & Diagnostics</div>
              <div className="text-[11px] text-stone">Client telemetry and network health metrics.</div>
            </div>
            <input
              type="checkbox"
              id="chk-consent-analytics"
              checked={preferences.analytics}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, analytics: e.target.checked }))
              }
              className="w-4 h-4 rounded text-royal focus:ring-royal cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-line">
            <div>
              <div className="font-bold text-graphite">Functional Workspace State</div>
              <div className="text-[11px] text-stone">Saved collections, notes, and local filters.</div>
            </div>
            <input
              type="checkbox"
              id="chk-consent-functional"
              checked={preferences.functional}
              onChange={(e) =>
                setPreferences((prev) => ({ ...prev, functional: e.target.checked }))
              }
              className="w-4 h-4 rounded text-royal focus:ring-royal cursor-pointer"
            />
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-line flex flex-col sm:flex-row items-center gap-2">
        {showDetails ? (
          <button
            type="button"
            id="btn-cookie-save-custom"
            onClick={handleSaveCustom}
            className="w-full sm:flex-1 py-2 px-3 bg-royal text-white rounded-xl text-xs font-bold hover:bg-navy transition cursor-pointer"
          >
            Save Preferences
          </button>
        ) : (
          <>
            <button
              type="button"
              id="btn-cookie-accept-all"
              onClick={handleAcceptAll}
              className="w-full sm:flex-1 py-2 px-3 bg-royal text-white rounded-xl text-xs font-bold hover:bg-navy transition cursor-pointer"
            >
              Accept All
            </button>
            <button
              type="button"
              id="btn-cookie-essential-only"
              onClick={handleAcceptEssentialOnly}
              className="w-full sm:w-auto py-2 px-3 bg-canvas border border-line text-stone hover:text-graphite rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Essential Only
            </button>
          </>
        )}

        <button
          type="button"
          id="btn-cookie-toggle-details"
          onClick={() => setShowDetails((prev) => !prev)}
          className="text-xs text-stone hover:text-graphite font-medium underline px-1 py-1"
        >
          {showDetails ? "Hide Details" : "Customize"}
        </button>
      </div>

      <div className="mt-2 text-center">
        <a
          href="/privacy"
          className="text-[10.5px] text-mute hover:text-stone transition underline"
        >
          Read full GDPR Privacy Policy & Institutional Terms
        </a>
      </div>
    </div>
  );
}
