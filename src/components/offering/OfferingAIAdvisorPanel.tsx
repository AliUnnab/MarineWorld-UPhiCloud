import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  ShieldCheck,
  Building,
  FileText,
  CornerDownLeft,
  RefreshCw,
  Layers,
  ArrowUpRight,
  Bot,
  User,
  CheckCircle2,
  Lock,
} from "lucide-react";
import type { CompanyOffering, CompanyProfile, CompanyEntity } from "@/lib/types";
import { queryOfferingAIAdvisorStrict } from "@/lib/services/offeringEntityService";

interface OfferingAIAdvisorPanelProps {
  offering: CompanyOffering;
  parentCompany: CompanyProfile | CompanyEntity;
  onRequestOffer: () => void;
  onOpenRFQ: () => void;
  onConnectCompany: () => void;
}

interface MessageItem {
  id: string;
  sender: "user" | "advisor";
  text: string;
  confidence?: "HIGH" | "MEDIUM" | "LOW";
  sourcesUsed?: string[];
  suggestedAction?: "REQUEST_OFFER" | "COMMERCIAL_RFQ" | "CONNECT_COMPANY" | "VIEW_SPECS";
  timestamp: string;
}

export function OfferingAIAdvisorPanel({
  offering,
  parentCompany,
  onRequestOffer,
  onOpenRFQ,
  onConnectCompany,
}: OfferingAIAdvisorPanelProps) {
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>(() => [
    {
      id: "msg-welcome",
      sender: "advisor",
      text: `Hello. I am the dedicated AI Advisor for **${offering.name}**, grounded strictly in verified engineering specifications, operational limits, class certifications, and commercial terms authorized by ${parentCompany.displayName || (parentCompany as any).name || parentCompany.legalName}.\n\nHow may I assist your engineering, procurement, or compliance evaluation today?`,
      confidence: "HIGH",
      sourcesUsed: (offering.groundingSources || []).map((s) => s.filename || s.title).slice(0, 2),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const suggestedQuestions = [
    "What are the main specifications?",
    "Where is it typically used?",
    "Which certifications are available?",
    "What information is available about lead time?",
  ];

  const handleAsk = (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setLoading(true);

    setTimeout(() => {
      const result = queryOfferingAIAdvisorStrict(offering.id, offering.companyId, queryText);

      const advisorMsg: MessageItem = {
        id: `adv-${Date.now()}`,
        sender: "advisor",
        text: result.answer,
        confidence: result.confidence,
        sourcesUsed: result.sourcesUsed,
        suggestedAction: result.suggestedAction,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, advisorMsg]);
      setLoading(false);
    }, 450);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk(inputQuery);
    }
  };

  return (
    <section className="bg-white rounded-xl border border-line overflow-hidden shadow-2xs">
      {/* Advisor Header */}
      <div className="p-5 sm:p-6 border-b border-line bg-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-royal text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-graphite">
                {offering.name} AI Advisor
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ACTIVE EXPERT
              </span>
            </div>
            <p className="text-xs text-stone mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline" />
              <span>Grounded in verified offering information</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center font-mono text-[11px] text-stone">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white border border-line shadow-2xs">
            <Lock className="w-3 h-3 text-royal" />
            <span>SOVEREIGN TENANT ISOLATION</span>
          </div>
        </div>
      </div>

      {/* Suggested Inquiries Chips */}
      <div className="p-4 bg-canvas/60 border-b border-line/60 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1">
            QUICK PROMPTS:
          </span>
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(q)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg border border-line bg-white hover:border-royal hover:text-royal hover:bg-soft text-xs text-graphite font-medium transition cursor-pointer shadow-2xs disabled:opacity-50 text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Canvas */}
      <div className="p-5 sm:p-6 space-y-4 max-h-[460px] overflow-y-auto bg-slate-50/50 font-sans">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-2xl rounded-xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                msg.sender === "user"
                  ? "bg-slate-900 text-white rounded-br-none"
                  : "bg-white text-graphite border border-line rounded-bl-none"
              }`}
            >
              {/* Advisor Header metadata */}
              {msg.sender === "advisor" && (
                <div className="flex items-center justify-between border-b border-line/60 pb-2 mb-2 text-[10.5px] font-mono text-stone">
                  <div className="flex items-center gap-1.5 font-bold text-royal">
                    <Bot className="w-3.5 h-3.5" />
                    <span>{offering.name} Verified Advisor</span>
                  </div>
                  {msg.confidence && (
                    <span className="px-1.5 py-0.5 rounded bg-canvas text-stone border border-line/60">
                      CONFIDENCE: {msg.confidence}
                    </span>
                  )}
                </div>
              )}

              {/* Message text formatted */}
              <div className="whitespace-pre-line space-y-2">{msg.text}</div>

              {/* Citations & Verified Sources */}
              {msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-line/60 flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono text-stone">
                  <span className="text-slate-500">GROUNDED IN:</span>
                  {msg.sourcesUsed.map((source, sIdx) => (
                    <span
                      key={sIdx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-canvas border border-line/60 text-slate-700 font-medium"
                    >
                      <FileText className="w-3 h-3 text-royal" />
                      <span>{source}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Action Suggestion button inside answer */}
              {msg.suggestedAction && (
                <div className="mt-3 pt-2 flex flex-wrap items-center gap-2">
                  {msg.suggestedAction === "REQUEST_OFFER" && (
                    <button
                      type="button"
                      onClick={onRequestOffer}
                      className="px-3 py-1.5 rounded-lg bg-royal hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Request Official Offer</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {msg.suggestedAction === "COMMERCIAL_RFQ" && (
                    <button
                      type="button"
                      onClick={onOpenRFQ}
                      className="px-3 py-1.5 rounded-lg bg-graphite hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Submit Commercial RFQ</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {msg.suggestedAction === "CONNECT_COMPANY" && (
                    <button
                      type="button"
                      onClick={onConnectCompany}
                      className="px-3 py-1.5 rounded-lg border border-line bg-white hover:bg-canvas text-graphite text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Connect with Company</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <span className="text-[10px] font-mono text-stone mt-1 px-1">{msg.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex flex-col items-start">
            <div className="bg-white border border-line rounded-xl p-4 shadow-2xs flex items-center gap-3 text-xs text-stone font-mono">
              <RefreshCw className="w-4 h-4 text-royal animate-spin" />
              <span>Verifying authorized technical parameters & grounding sources...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-4 border-t border-line bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder={`Ask ${offering.name} AI Advisor about specs, depth rating, power, class approvals, or lead time...`}
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm border border-line rounded-xl focus:outline-none focus:border-royal bg-canvas focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="px-4 py-2.5 rounded-xl bg-royal hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Ask Advisor</span>
          </button>
        </form>
      </div>
    </section>
  );
}
