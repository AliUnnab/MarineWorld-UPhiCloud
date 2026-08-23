import { useState, useEffect } from "react";
import type { CompanyProfile } from "@/lib/types";
import {
  processCompanyAIQuery,
  type AIResponsePayload,
} from "@/lib/aiService";
import {
  Sparkles,
  Send,
  ShieldCheck,
  Building2,
  Bot,
  User,
  ArrowRight,
  Layers,
  FileText,
  Clock,
} from "lucide-react";

/* ------------------------------------------------------------
   LOADING SKELETON
   ------------------------------------------------------------ */
export function CompanyAISkeleton() {
  return (
    <div className="space-y-8 animate-pulse max-w-[1180px] mx-auto font-sans">
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 space-y-4">
        <div className="h-4 w-32 bg-mist rounded" />
        <div className="h-8 w-72 bg-mist rounded" />
        <div className="h-4 w-96 bg-mist rounded" />
      </div>

      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-9 w-44 bg-mist rounded-full" />
        ))}
      </div>

      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 h-96" />
    </div>
  );
}

/* ------------------------------------------------------------
   SUGGESTED PUBLIC VISITOR QUERIES
   ------------------------------------------------------------ */
const SUGGESTED_PUBLIC_QUERIES = [
  "What are your primary certified marine engineering & refit capabilities?",
  "Which classification societies (DNV, Lloyd's Register, ABS) certify your operations?",
  "What standard commercial delivery terms (Incoterms) and lead times apply?",
  "Summarize your active operating facilities and global distribution hubs.",
  "How can our procurement team initiate a formal RFQ or technical quotation?",
];

/* ------------------------------------------------------------
   MAIN COMPANY AI MODULE (PUBLIC-SAFE INTELLIGENCE CONSOLE)
   ------------------------------------------------------------ */
export function CompanyAIModule({
  company,
  onSelectModule,
}: {
  company: CompanyProfile;
  onSelectModule?: (moduleSlug: string) => void;
}) {
  const [messages, setMessages] = useState<AIResponsePayload[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isError, setIsError] = useState(false);

  const displayName = company.displayName || company.name;

  // Initial Seed Query on mount (Visitor Perspective)
  useEffect(() => {
    let isMounted = true;
    setIsProcessing(true);

    processCompanyAIQuery(
      company,
      `What are the core accredited capabilities and offerings of ${displayName}?`,
      "VIEWER"
    )
      .then((res) => {
        if (isMounted) {
          setMessages([res]);
          setIsProcessing(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsError(true);
          setIsProcessing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [company.id, displayName]);

  // Handle Query Submission (Always Visitor "VIEWER" role for public page)
  const handleSendQuery = async (queryToSubmit?: string) => {
    const text = (queryToSubmit || inputValue).trim();
    if (!text || isProcessing) return;

    setIsProcessing(true);
    setIsError(false);
    setInputValue("");

    try {
      const response = await processCompanyAIQuery(company, text, "VIEWER");
      setMessages((prev) => [...prev, response]);
    } catch (err) {
      setIsError(true);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isError) {
    return (
      <div className="rounded-card-lg border border-line bg-white p-8 text-center space-y-4 max-w-[1180px] mx-auto font-sans">
        <Sparkles className="mx-auto h-10 w-10 text-amber-500" />
        <h3 className="text-h3 text-graphite">AI INTELLIGENCE TEMPORARILY UNAVAILABLE</h3>
        <p className="text-[14px] text-stone max-w-md mx-auto">
          Unable to establish grounded connection to {displayName}'s verified data context. Please try again.
        </p>
        <div>
          <button
            onClick={() => handleSendQuery(SUGGESTED_PUBLIC_QUERIES[0])}
            className="px-4 py-2 bg-royal text-white rounded-card text-xs font-bold tracking-wider uppercase hover:bg-royal-dark transition cursor-pointer"
          >
            RETRY INQUIRY
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-[1180px] mx-auto font-sans">
      {/* 01. HEADER SECTION */}
      <div className="rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-royal">
            <Sparkles className="h-4 w-4" />
            <span>VERIFIED BUSINESS INTELLIGENCE</span>
          </div>
          <h2 className="text-h2 mt-1 text-graphite">Autonomous Intelligence Assistant</h2>
          <p className="mt-1 text-[14px] text-stone max-w-2xl font-normal leading-relaxed">
            Company-scoped intelligence layer grounded in verified registry data, technical specifications, and operating capabilities of {displayName}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 text-[11.5px] font-semibold">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>GROUNDED CONTEXT</span>
          </div>
        </div>
      </div>

      {/* 02. SUGGESTED PUBLIC QUERIES */}
      <div className="space-y-2.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-stone block">
          SUGGESTED INQUIRIES & CAPABILITY EVALUATION
        </span>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PUBLIC_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => handleSendQuery(q)}
              disabled={isProcessing}
              className="rounded-full border border-line bg-white px-4 py-2 text-[12px] font-semibold text-stone hover:text-royal hover:border-royal hover:bg-canvas transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* 03. CONVERSATION THREAD */}
      <div className="space-y-6">
        {messages.map((item, idx) => (
          <div key={item.id || idx} className="space-y-4">
            {/* User Query Bubble */}
            <div className="flex justify-end">
              <div className="max-w-2xl rounded-card-lg bg-royal text-white p-5 shadow-xs">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-royal-light mb-1">
                  <User className="h-3.5 w-3.5" />
                  <span>COMMERCIAL / TECHNICAL INQUIRY</span>
                </div>
                <p className="text-[14px] leading-relaxed">{item.query}</p>
              </div>
            </div>

            {/* AI Grounded Response Bubble */}
            <div className="flex justify-start">
              <div className="max-w-3xl w-full rounded-card-lg border border-line bg-white p-6 md:p-8 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-royal text-white text-xs font-bold">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="text-[12.5px] font-bold text-graphite block">
                        {displayName} Intelligence Model
                      </span>
                      <span className="text-[10px] text-stone uppercase tracking-wider">
                        Grounded in MarineWorld Verified Dataset
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>VERIFIED RESPONSE</span>
                  </div>
                </div>

                {/* Answer Body */}
                <div className="prose prose-sm max-w-none text-[14px] text-stone leading-relaxed whitespace-pre-line">
                  {item.answer}
                </div>

                {/* Grounded Evidence Sources */}
                {item.evidence && item.evidence.length > 0 && (
                  <div className="pt-3 border-t border-line space-y-2">
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-stone block">
                      GROUNDED REGISTRY EVIDENCE
                    </span>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {item.evidence.map((ev, eIdx) => (
                        <div
                          key={eIdx}
                          className="rounded border border-line bg-canvas p-2.5 text-[12px] text-graphite"
                        >
                          <span className="font-bold text-royal text-[10px] block uppercase tracking-wider">
                            {ev.source}
                          </span>
                          <span className="text-stone">{ev.detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex justify-start">
            <div className="rounded-card-lg border border-line bg-white p-6 shadow-xs flex items-center gap-3 text-stone text-[13px]">
              <Sparkles className="h-5 w-5 text-royal animate-spin" />
              <span>Analyzing verified registry data for {displayName}...</span>
            </div>
          </div>
        )}
      </div>

      {/* 04. QUERY INPUT BAR */}
      <div className="sticky bottom-6 rounded-card-lg border border-line bg-white p-3 shadow-lg flex items-center gap-3">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendQuery();
            }
          }}
          placeholder={`Ask about ${displayName}'s capabilities, technical specs, or certifications...`}
          className="flex-1 bg-transparent px-4 py-2.5 text-[13.5px] text-graphite focus:outline-none placeholder:text-stone/60"
        />
        <button
          onClick={() => handleSendQuery()}
          disabled={!inputValue.trim() || isProcessing}
          className="flex items-center gap-2 px-5 py-2.5 bg-royal text-white rounded-card text-xs font-bold tracking-wider uppercase hover:bg-royal-dark transition-all disabled:opacity-40 cursor-pointer shadow-xs shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
          <span>INQUIRE</span>
        </button>
      </div>
    </div>
  );
}
