import { useState } from "react";
import { Handshake } from "lucide-react";
import type { ServiceEntity, CompanyProfile } from "@/lib/types";
import { executeServiceAIQuery } from "@/lib/services/aiDomainService";
import { getAuthenticatedUserId } from "@/lib/services/securityService";
import { Icon } from "@/components/digione/icons";
import { DigiBadge, DigiButton } from "@/components/digione/primitives";

interface ServiceAIAdvisorProps {
  service: ServiceEntity;
  company: CompanyProfile;
  onInquire?: (service: ServiceEntity) => void;
}

export function ServiceAIAdvisor({ service, company, onInquire }: ServiceAIAdvisorProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAnswer, setActiveAnswer] = useState<{
    text: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    sources: string[];
    queryAsked: string;
  } | null>(null);

  const defaultPrompts = [
    "What capabilities are included in this service?",
    "Where is this service available?",
    "How can I request service scheduling?",
    "Who provides this service?",
  ];

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim()) return;
    setLoading(true);
    setQuery(questionText);
    const authUid = getAuthenticatedUserId() || "usr-owner-001";
    try {
      const res = await executeServiceAIQuery(
        company,
        service,
        authUid,
        questionText
      );
      setActiveAnswer({
        text: res.response,
        confidence: res.confidence,
        sources: res.sourcesUsed,
        queryAsked: questionText,
      });

      // Log AI interaction to Firestore
      try {
        import("@/services/aiService").then(({ logAIInteraction }) => {
          logAIInteraction({
            id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            userId: authUid,
            companyId: company.id,
            entityType: "SERVICE",
            entityId: service.id,
            queryText: questionText,
            responseText: res.response,
            confidence: res.confidence,
            timestamp: new Date().toISOString(),
          });
        });
      } catch {}
    } catch (err: any) {
      setActiveAnswer({
        text: "I don't have verified information about that in this service's published data.",
        confidence: "LOW",
        sources: ["Service Record"],
        queryAsked: questionText,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-card-md border border-line bg-canvas p-5 sm:p-6 shadow-xs font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line pb-3.5 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-card-xs bg-royal/10 text-royal border border-royal/20 shrink-0 shadow-2xs">
            <Handshake className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[11.5px] font-extrabold uppercase tracking-[0.14em] text-graphite">
              COMMERCIAL DESK
            </h3>
            <span className="text-[11px] text-stone block font-medium">
              Technical & commercial advisory for {service.name}
            </span>
          </div>
        </div>
        <DigiBadge variant="soft">COMMERCIAL READY</DigiBadge>
      </div>

      {/* Spacious Horizontal Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* Left Column: Prompts & Input Bar */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-mute block font-bold mb-2">
              SUGGESTED INQUIRIES
            </span>
            <div className="flex flex-col gap-1.5">
              {defaultPrompts.map((p) => (
                <button
                  key={p}
                  onClick={() => handleAsk(p)}
                  disabled={loading}
                  className="rounded-card-xs border border-line bg-white px-3 py-2 text-[11.5px] font-semibold text-graphite hover:border-royal hover:text-royal hover:bg-soft transition-colors disabled:opacity-50 text-left shadow-2xs cursor-pointer flex items-center justify-between group"
                >
                  <span className="truncate pr-2">{p}</span>
                  <Icon name="arrowRight" className="h-3 w-3 text-stone group-hover:text-royal group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(query);
            }}
            className="flex gap-2 pt-1"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Ask custom question about ${service.name}...`}
              disabled={loading}
              className="flex-1 rounded-card-xs border border-line bg-white px-3.5 py-2 text-[12.5px] text-graphite placeholder:text-mute focus:outline-none focus:border-royal transition font-medium shadow-2xs"
            />
            <DigiButton
              type="submit"
              variant="primary"
              disabled={loading || !query.trim()}
              className="px-4 shrink-0 py-2 text-xs font-bold uppercase tracking-wider rounded-card-xs"
            >
              {loading ? "TRANSMITTING..." : "ASK"}
            </DigiButton>
          </form>
        </div>

        {/* Right Column: Grounded Response & Action Panel */}
        <div className="lg:col-span-7">
          {loading && (
            <div className="rounded-card-md border border-line bg-white p-5 space-y-3 animate-pulse shadow-xs">
              <div className="h-4 w-1/3 bg-mist rounded" />
              <div className="h-3.5 w-3/4 bg-mist rounded" />
              <div className="h-3.5 w-1/2 bg-mist rounded" />
            </div>
          )}

          {!loading && activeAnswer && (
            <div className="rounded-card-md border border-line bg-white p-5 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between border-b border-line pb-2 text-[10.5px]">
                <span className="font-bold text-graphite uppercase tracking-wider truncate max-w-[280px]">
                  Q: &ldquo;{activeAnswer.queryAsked}&rdquo;
                </span>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className="text-mute font-bold uppercase tracking-wider text-[9.5px]">CONFIDENCE:</span>
                  <span
                    className={`font-bold ${
                      activeAnswer.confidence === "HIGH"
                        ? "text-emerald-600"
                        : activeAnswer.confidence === "MEDIUM"
                        ? "text-amber-600"
                        : "text-stone"
                    }`}
                  >
                    {activeAnswer.confidence}
                  </span>
                </div>
              </div>

              <p className="text-[13px] leading-relaxed text-graphite font-normal whitespace-pre-wrap">
                {activeAnswer.text}
              </p>

              {activeAnswer.sources && activeAnswer.sources.length > 0 && (
                <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="text-mute font-bold uppercase tracking-wider">GROUNDED SOURCES:</span>
                  {activeAnswer.sources.map((s, idx) => (
                    <span key={idx} className="rounded-card-xs bg-canvas border border-line px-2 py-0.5 text-stone font-semibold">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              {onInquire && (
                <div className="pt-2 border-t border-line/60">
                  <DigiButton
                    variant="primary"
                    className="w-full justify-center text-[11.5px] py-2.5 uppercase tracking-wider font-bold rounded-card-xs"
                    icon="exchange"
                    onClick={() => onInquire(service)}
                  >
                    REQUEST PROPOSAL WITH SERVICE CONTEXT
                  </DigiButton>
                </div>
              )}
            </div>
          )}

          {!loading && !activeAnswer && (
            <div className="rounded-card-md border border-dashed border-line bg-white/70 p-6 flex flex-col items-center justify-center text-center space-y-2.5 min-h-[220px]">
              <div className="w-10 h-10 rounded-card-xs bg-soft text-royal border border-royal/20 flex items-center justify-center shadow-2xs">
                <Icon name="spark" className="h-5 w-5" />
              </div>
              <h4 className="text-xs font-bold text-graphite uppercase tracking-wider">
                Grounded Technical Synthesis Ready
              </h4>
              <p className="text-[12px] text-stone max-w-sm leading-relaxed font-medium">
                Select a suggested prompt on the left or transmit a custom specification query to synthesize verified service capability data.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
