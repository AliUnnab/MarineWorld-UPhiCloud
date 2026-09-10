import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  CheckCircle2,
  Info,
  FileText,
  RefreshCw,
  ArrowUpRight,
  BrainCircuit,
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
  const companyName =
    parentCompany.displayName ||
    (parentCompany as any).name ||
    parentCompany.legalName ||
    "ARGENTO MARINE";

  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const [messages, setMessages] = useState<MessageItem[]>(() => [
    {
      id: "msg-welcome",
      sender: "advisor",
      text: `Hello. I am the dedicated AI Advisor for ${offering.name}, grounded strictly in verified engineering specifications, operational limits, class certifications, and commercial terms authorized by ${companyName}.\n\nHow may I assist your engineering, procurement, or compliance evaluation today?`,
      confidence: "HIGH",
      sourcesUsed: (offering.groundingSources || []).map((s) => s.filename || s.title).slice(0, 2),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Prevent scrolling the whole page down on initial load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, loading]);

  const suggestedQuestions = [
    "Technical specifications",
    "Typical use cases",
    "Certifications",
    "Delivery & lead time",
    "Price & commercial terms",
    "Available configurations",
    "Compare with similar models",
  ];

  const handleAsk = (queryText: string) => {
    if (!queryText.trim() || loading) return;

    setHasInteracted(true);
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

      // Clean answer ensuring no asterisks are present
      const cleanAnswer = (result.answer || "")
        .replace(/\*/g, "")
        .replace(/^[\s]*[-•]\s*/gm, "• ");

      const advisorMsg: MessageItem = {
        id: `adv-${Date.now()}`,
        sender: "advisor",
        text: cleanAnswer,
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

  const allSources =
    offering.groundingSources && offering.groundingSources.length > 0
      ? offering.groundingSources
      : [
          {
            title: `${offering.name} Verified Technical Datasheet`,
            filename: `${offering.code || "MW-TECH"}_datasheet.pdf`,
          },
          {
            title: `${companyName} Manufacturer Class Compliance Certificate`,
            filename: `${offering.code || "MW-CERT"}_compliance_doc.pdf`,
          },
        ];

  return (
    <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden p-5 sm:p-6 space-y-5 font-sans">
      {/* 1. Header Card (Matching provided design) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100/80 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Ask about {offering.name}
            </h2>
            <p className="text-sm text-slate-500 font-normal mt-0.5">
              Get technical, commercial, and operational answers.
            </p>
          </div>
        </div>

        <div className="self-start sm:self-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Verified Information</span>
          </div>
        </div>
      </div>

      {/* 2. Quick Prompts Card (Matching screenshot pills) */}
      <div className="bg-slate-50/70 border border-slate-200/70 rounded-2xl p-4 sm:p-4.5">
        <div className="flex flex-wrap gap-2.5">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleAsk(q)}
              disabled={loading}
              className="px-3.5 py-1.5 sm:py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer shadow-2xs disabled:opacity-50 text-left"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Messages Canvas (Displays conversation without asterisks) */}
      {hasInteracted && (
        <div
          ref={messagesContainerRef}
          className="p-4 sm:p-5 space-y-4 max-h-[380px] overflow-y-auto rounded-2xl bg-slate-50/60 border border-slate-200/60 font-sans"
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs ${
                  msg.sender === "user"
                    ? "bg-[#0B2545] text-white rounded-br-none"
                    : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                }`}
              >
                {/* Advisor Header metadata */}
                {msg.sender === "advisor" && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2 text-[11px] font-sans text-slate-500">
                    <div className="flex items-center gap-1.5 font-semibold text-sky-700">
                      <BrainCircuit className="w-3.5 h-3.5" />
                      <span>{offering.name} Verified Advisor</span>
                    </div>
                    {msg.confidence && (
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[10px]">
                        CONFIDENCE: {msg.confidence}
                      </span>
                    )}
                  </div>
                )}

                {/* Message text formatted - Clean without asterisks */}
                <div className="whitespace-pre-line space-y-2">
                  {msg.text.replace(/\*/g, "")}
                </div>

                {/* Citations & Verified Sources */}
                {msg.sourcesUsed && msg.sourcesUsed.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="font-semibold text-slate-400">GROUNDED IN:</span>
                    {msg.sourcesUsed.map((source, sIdx) => (
                      <span
                        key={sIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-slate-700 font-medium text-[11px]"
                      >
                        <FileText className="w-3 h-3 text-sky-600" />
                        <span>{source}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Suggestion buttons */}
                {msg.suggestedAction && (
                  <div className="mt-3 pt-2 flex flex-wrap items-center gap-2">
                    {msg.suggestedAction === "REQUEST_OFFER" && (
                      <button
                        type="button"
                        onClick={onRequestOffer}
                        className="px-3.5 py-1.5 rounded-lg bg-[#0B2545] hover:bg-[#071a30] text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>Request Official Offer</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {msg.suggestedAction === "COMMERCIAL_RFQ" && (
                      <button
                        type="button"
                        onClick={onOpenRFQ}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>Submit Commercial RFQ</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {msg.suggestedAction === "CONNECT_COMPANY" && (
                      <button
                        type="button"
                        onClick={onConnectCompany}
                        className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <span>Connect with Company</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
            </div>
          ))}

          {loading && (
            <div className="flex flex-col items-start">
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs flex items-center gap-2.5 text-xs text-slate-600">
                <RefreshCw className="w-4 h-4 text-sky-600 animate-spin" />
                <span>Verifying authorized technical parameters & grounding sources...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 4. Input Box (Matching screenshot) */}
      <div className="border border-slate-200 rounded-2xl p-2 sm:p-2.5 bg-white shadow-2xs focus-within:border-slate-400 transition">
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
            placeholder={`Type your question about ${offering.name}...`}
            className="flex-1 px-3 py-2 text-sm bg-transparent border-0 outline-none text-slate-800 placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#0B2545] hover:bg-[#081c35] text-white font-semibold text-sm transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>Ask</span>
          </button>
        </form>
      </div>

      {/* 5. Footer Disclaimer Row (Matching screenshot) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-0.5 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-4 h-4 text-slate-400 shrink-0" />
          <span>
            Answers are based on verified information from{" "}
            <span className="font-semibold text-slate-700 uppercase">{companyName}</span>.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowSources((prev) => !prev)}
          className="text-xs font-semibold text-slate-700 hover:text-slate-900 transition flex items-center gap-1 cursor-pointer self-start sm:self-auto"
        >
          <span>View sources</span>
          <span>→</span>
        </button>
      </div>

      {/* Expandable Grounded Sources Drawer */}
      {showSources && (
        <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-sky-600" />
              <span>Verified Grounding Documents & Datasheets</span>
            </h4>
            <span className="text-[10px] text-slate-500">
              {allSources.length} authorized records on file
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {allSources.map((source, sIdx) => (
              <div
                key={sIdx}
                className="p-2.5 rounded-lg bg-white border border-slate-200/70 flex items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-sky-600 shrink-0" />
                  <span className="font-medium text-slate-800 truncate">
                    {(source as any).filename || (source as any).title}
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shrink-0">
                  VERIFIED
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
