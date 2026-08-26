import React, { useState } from "react";
import {
  UserPlus,
  X,
  Mail,
  Send,
  Check,
  Building2,
  Copy,
  Gift,
} from "lucide-react";
import {
  bulkInviteMembers,
  type EcosystemOrganizationSummary,
} from "@/lib/services/ecosystemOrganizationService";

interface EcosystemInviteModalProps {
  isOpen: boolean;
  organization: EcosystemOrganizationSummary;
  onClose: () => void;
}

export function EcosystemInviteModal({
  isOpen,
  organization,
  onClose,
}: EcosystemInviteModalProps) {
  const [emailsInput, setEmailsInput] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleSendInvites = (e: React.FormEvent) => {
    e.preventDefault();
    const emails = emailsInput
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (emails.length === 0) return;

    const res = bulkInviteMembers(organization.id, emails);
    setSuccessMsg(res.message);
    setTimeout(() => {
      setSuccessMsg(null);
      setEmailsInput("");
      onClose();
    }, 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(organization.enrollmentCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-royal font-bold text-xs uppercase tracking-widest mb-1">
            <UserPlus className="w-4 h-4 text-royal" />
            <span>Ecosystem Member Onboarding</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Invite Member Companies
          </h2>
          <p className="text-xs font-medium text-slate-600">
            Dispatch MarineWorld enrollment invitations and {organization.discountPercentage}% discount accreditation benefit to your members.
          </p>
        </div>

        {/* ENROLLMENT CODE INFO BOX */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
              Enrollment Benefit Code
            </span>
            <span className="font-mono text-sm font-extrabold text-slate-900">
              {organization.enrollmentCode}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            {copiedCode ? "Copied!" : "Copy Code"}
          </button>
        </div>

        {successMsg ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-bold text-center">
            {successMsg}
          </div>
        ) : (
          <form onSubmit={handleSendInvites} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Member Official Email Addresses (comma or line separated)
              </label>
              <textarea
                value={emailsInput}
                onChange={(e) => setEmailsInput(e.target.value)}
                placeholder="director@aegeanlogistics.com&#10;procurement@rotterdampower.nl&#10;contact@balticnaval.de"
                rows={4}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-royal hover:bg-royal-dark text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Dispatch Member Invitations</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
