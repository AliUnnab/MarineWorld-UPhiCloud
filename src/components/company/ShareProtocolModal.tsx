import { useState, useEffect } from "react";
import {
  X,
  MessageCircle,
  Linkedin,
  Mail,
  Copy,
  Check,
} from "lucide-react";

interface ShareProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  description?: string;
}

export function ShareProtocolModal({
  isOpen,
  onClose,
  title,
  url,
  description = "Anyone with this link can view this page.",
}: ShareProtocolModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(`${title} — ${description}`);

  const shareChannels = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      href: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      colorClass: "text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50/50",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      colorClass: "text-blue-700 hover:border-blue-300 hover:bg-blue-50/50",
    },
    {
      id: "x",
      label: "X",
      icon: () => (
        <span className="font-bold text-base leading-none text-slate-900">𝕏</span>
      ),
      href: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      colorClass: "text-slate-900 hover:border-slate-400 hover:bg-slate-50",
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%0A%0A${encodedUrl}`,
      colorClass: "text-sky-600 hover:border-sky-300 hover:bg-sky-50/50",
    },
  ];

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-card-lg bg-white p-6 sm:p-7 shadow-2xl border border-line z-10 animate-in zoom-in-95 duration-200 font-sans">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 w-9 h-9 rounded-card-xs border border-line bg-canvas p-2 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1 mb-6 pr-8">
          <h3 className="text-xl font-bold tracking-tight text-graphite font-sans">
            {title}
          </h3>
          <p className="text-xs text-stone leading-relaxed font-sans">
            {description}
          </p>
        </div>

        {/* 4 Share Channels Grid */}
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 mb-6">
          {shareChannels.map((channel) => {
            const Icon = channel.icon;
            return (
              <a
                key={channel.id}
                href={channel.href}
                target="_blank"
                rel="noreferrer"
                className={`flex flex-col items-center justify-center gap-2 rounded-card-md border border-line bg-white p-3 text-center transition shadow-2xs hover:shadow-xs group ${channel.colorClass}`}
              >
                <div className="flex h-7 w-7 items-center justify-center">
                  <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
                </div>
                <span className="text-xs font-semibold font-sans">
                  {channel.label}
                </span>
              </a>
            );
          })}
        </div>

        {/* Link Section */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold text-graphite font-sans">
            Link
          </div>
          
          <div className="flex items-center justify-between rounded-card-md border border-line bg-canvas p-3 transition hover:border-slate-300">
            <div className="min-w-0 flex-1 pr-3">
              <div className="text-xs font-medium text-graphite truncate font-mono">
                {url}
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center py-1.5 px-3 rounded-card-xs border border-line bg-white hover:bg-soft text-graphite transition shadow-2xs shrink-0 text-xs font-semibold gap-1.5 cursor-pointer"
              title="Copy to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 text-xs">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-stone" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
