import { useState, useEffect } from "react";
import type { CompanyProfile } from "@/lib/types";
import {
  X,
  Video,
  Calendar,
  Download,
  Share2,
  Linkedin,
  Instagram,
  MessageSquare,
  Check,
  ShieldCheck,
  Mail,
  Phone,
  ArrowUpRight,
} from "lucide-react";
import { ShareProtocolModal } from "./ShareProtocolModal";

export interface StaffMemberInfo {
  id: string;
  name: string;
  role: string;
  department?: string;
  avatar?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  isOnline?: boolean;
  isExecutive?: boolean;
}

interface StaffDigitalCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: StaffMemberInfo | null;
  company: CompanyProfile;
}

export function isStaffExecutive(staff?: StaffMemberInfo | null): boolean {
  if (!staff) return false;
  if (staff.isExecutive) return true;
  const role = (staff.role || "").toUpperCase();
  const dept = (staff.department || "").toUpperCase();
  return (
    role.includes("CEO") ||
    role.includes("CHIEF") ||
    role.includes("PRESIDENT") ||
    role.includes("MANAGING DIRECTOR") ||
    dept.includes("EXECUTIVE")
  );
}

export function StaffDigitalCardModal({
  isOpen,
  onClose,
  staff,
  company,
}: StaffDigitalCardModalProps) {
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isShareOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, isShareOpen, onClose]);

  if (!isOpen || !staff) return null;

  const isExec = isStaffExecutive(staff);
  const companyName = company.displayName || company.name || "Enterprise Company";
  const webDomain = company.website
    ? company.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "")
    : `${(company.slug || company.id).toLowerCase()}.com`;

  const officialEmail = company.officialEmail || `info@${webDomain}`;

  // Function to generate and download standard vCard (.vcf) - only for commercial/operational staff
  const handleDownloadVCard = () => {
    if (isExec) return;

    const vCardData = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `N:${staff.name};;;;`,
      `FN:${staff.name}`,
      `ORG:${companyName}`,
      `TITLE:${staff.role}`,
      `TEL;TYPE=WORK,VOICE:${staff.phone}`,
      staff.whatsapp ? `TEL;TYPE=CELL:${staff.whatsapp}` : "",
      `EMAIL;TYPE=PREF,INTERNET:${staff.email}`,
      `URL:${company.website || `https://${webDomain}`}`,
      `NOTE:Maritime Representative on MarineWorld.city`,
      "END:VCARD",
    ]
      .filter(Boolean)
      .join("\r\n");

    const blob = new Blob([vCardData], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `${staff.name.replace(/\s+/g, "_")}_${companyName.replace(/\s+/g, "_")}.vcf`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsDownloaded(true);
    setTimeout(() => setIsDownloaded(false), 2500);
  };

  const staffDeepLink = `https://marineworld.city/companies/${company.slug || company.id}?staff=${staff.id}`;

  return (
    <>
      <div className="fixed inset-0 z-55 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs transition-opacity animate-in fade-in"
          onClick={onClose}
        />

        {/* Digital Card Dialog */}
        <div className="relative w-full max-w-md rounded-card-lg bg-white p-6 sm:p-7 shadow-2xl border border-line z-10 animate-in zoom-in-95 duration-200 font-sans">
          
          {/* Top Bar with Company Badge and Close Button */}
          <div className="flex items-center justify-between mb-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-royal" />
              <span className="text-xs font-bold uppercase tracking-wider text-graphite font-sans">
                {companyName}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-card-xs border border-line bg-canvas p-1.5 text-stone hover:text-graphite hover:bg-soft transition flex items-center justify-center cursor-pointer"
              aria-label="Close card"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Staff Photo Avatar */}
          <div className="flex flex-col items-center text-center space-y-3 mb-5">
            <div className="relative">
              {staff.avatar ? (
                <img
                  src={staff.avatar}
                  alt={staff.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-card-md object-cover border border-line shadow-xs"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-card-md bg-canvas border border-line flex items-center justify-center text-lg font-bold text-graphite font-sans">
                  {staff.name.slice(0, 2)}
                </div>
              )}
              {staff.isOnline && (
                <span
                  className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white shadow-2xs"
                  title="Available"
                />
              )}
            </div>

            {/* Name and Role */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-royal font-sans">
                {isExec ? "EXECUTIVE OFFICE" : (staff.department || "COMMERCIAL & OPERATIONS DESK")}
              </div>
              <h3 className="text-lg font-bold tracking-tight text-graphite font-sans">
                {staff.name}
              </h3>
              <p className="text-xs font-semibold text-stone font-sans">
                {staff.role}
              </p>
            </div>
          </div>

          {/* Executive vs Commercial Point of Contact Routing */}
          {isExec ? (
            /* Executive-level moderated desk */
            <div className="space-y-4 mb-6 font-sans">
              <div className="rounded-card-sm border border-line bg-canvas p-3.5 text-left space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-graphite">
                  <ShieldCheck className="w-4 h-4 text-royal shrink-0" />
                  <span>Strategic Relations &amp; Executive Office</span>
                </div>
                <p className="text-xs text-stone leading-relaxed">
                  For executive consultation, sovereign contracts, or institutional agreements, please contact the strategic relations desk.
                </p>
              </div>

              <div className="space-y-2">
                <a
                  href={`mailto:${officialEmail}?subject=${encodeURIComponent(`Strategic Inquiry: ${companyName} - Executive Office`)}`}
                  className="w-full flex items-center justify-center gap-2 rounded-card-sm bg-slate-950 hover:bg-slate-800 text-white py-3 px-4 text-xs font-bold tracking-wider uppercase transition shadow-2xs"
                >
                  <Mail className="w-4 h-4 text-slate-300" />
                  <span>Contact Strategic Desk</span>
                </a>

                <a
                  href={`tel:${staff.phone.replace(/[^\d+]/g, "")}`}
                  className="w-full flex items-center justify-center gap-2 rounded-card-sm border border-line bg-canvas hover:bg-soft text-graphite py-2.5 px-4 text-xs font-bold tracking-wider uppercase transition shadow-2xs"
                >
                  <Phone className="w-4 h-4 text-stone" />
                  <span>Call Office Line</span>
                </a>

                <button
                  type="button"
                  id="btn-share-exec-contact"
                  onClick={() => setIsShareOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-card-sm border border-line bg-canvas hover:bg-soft text-stone hover:text-graphite py-2.5 px-4 text-xs font-bold tracking-wider uppercase transition shadow-2xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-stone" />
                  <span>Share Contact Details</span>
                </button>
              </div>
            </div>
          ) : (
            /* Commercial & Support Staff Actions */
            <>
              {/* Quick Meet / Calendar Actions */}
              <div className="grid grid-cols-2 gap-2 mb-4 font-sans">
                <a
                  href="https://meet.google.com/new"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-card-sm border border-line bg-canvas hover:bg-soft p-2.5 text-xs font-semibold text-graphite transition shadow-2xs"
                >
                  <Video className="w-3.5 h-3.5 text-stone" />
                  <span>Google Meet</span>
                </a>

                <a
                  href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(`Meeting with ${staff.name} (${companyName})`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 rounded-card-sm border border-line bg-canvas hover:bg-soft p-2.5 text-xs font-semibold text-graphite transition shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-stone" />
                  <span>Calendar</span>
                </a>
              </div>

              {/* Social Icons Row */}
              <div className="flex items-center justify-center gap-2.5 mb-5">
                <a
                  href={staff.linkedin || `https://linkedin.com/company/${company.slug || company.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-card-sm border border-line bg-white text-stone hover:text-royal hover:border-royal/30 hover:bg-royal/10 transition shadow-2xs"
                  title="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>

                <a
                  href={staff.twitter || "https://x.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-card-sm border border-line bg-white text-stone hover:text-graphite hover:border-slate-400 hover:bg-soft transition shadow-2xs"
                  title="X"
                >
                  <span className="font-bold text-xs leading-none">𝕏</span>
                </a>

                <a
                  href={staff.instagram || "https://instagram.com"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-card-sm border border-line bg-white text-stone hover:text-pink-600 hover:border-pink-300 hover:bg-pink-50 transition shadow-2xs"
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>

                <a
                  href={`mailto:${staff.email}`}
                  className="flex h-9 w-9 items-center justify-center rounded-card-sm border border-line bg-white text-stone hover:text-royal hover:border-royal/30 hover:bg-royal/10 transition shadow-2xs"
                  title="Direct Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>

              {/* Primary Action: Download Digital Card */}
              <div className="space-y-2 mb-5 font-sans">
                <button
                  type="button"
                  id="btn-download-digital-card"
                  onClick={handleDownloadVCard}
                  className="w-full flex items-center justify-center gap-2 rounded-card-sm bg-slate-950 hover:bg-slate-800 text-white py-3 px-4 text-xs font-bold tracking-wider uppercase transition shadow-2xs cursor-pointer"
                >
                  {isDownloaded ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Saved to Contacts (.vcf)</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Digital Card (.vcf)</span>
                    </>
                  )}
                </button>

                {/* Secondary Action: Share Contact */}
                <button
                  type="button"
                  id="btn-share-contact"
                  onClick={() => setIsShareOpen(true)}
                  className="w-full flex items-center justify-center gap-2 rounded-card-sm border border-line bg-canvas hover:bg-soft text-graphite py-2.5 px-4 text-xs font-bold tracking-wider uppercase transition shadow-2xs cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-stone" />
                  <span>Share Contact</span>
                </button>
              </div>
            </>
          )}

          {/* Footer Attribution */}
          <div className="border-t border-line pt-3 text-center">
            <span className="text-[11px] font-medium text-slate-500 font-sans">
              Powered by UPhi™
            </span>
          </div>

        </div>
      </div>

      {/* Share Modal */}
      <ShareProtocolModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        title={`Share ${staff.name}`}
        url={staffDeepLink}
        description="Anyone with this link can view these contact details."
      />
    </>
  );
}
