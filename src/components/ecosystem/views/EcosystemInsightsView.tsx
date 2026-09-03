import React, { useState } from "react";
import {
  Handshake,
  Send,
  Building2,
  CheckCircle2,
  ExternalLink,
  Lightbulb,
  Search,
  MessageSquare,
  Sparkles,
  Loader2,
  Bot,
} from "lucide-react";
import {
  getEcosystemAIInsights,
  askEcosystemAIAsync,
  type EcosystemOrganizationSummary,
  type EcosystemMemberRecord,
} from "@/lib/services/ecosystemOrganizationService";

interface EcosystemInsightsViewProps {
  organization: EcosystemOrganizationSummary;
  onNavigateUrl?: (url: string) => void;
}

const QUICK_PROMPTS = [
  "Which members have not activated their company?",
  "Which Sector City has the most members?",
  "Show members in Italy or Northern Europe.",
  "Which members are verified?",
  "Which members have active commercial presence?",
  "Provide a strategic ecosystem health summary.",
];

export function EcosystemInsightsView({
  organization,
  onNavigateUrl,
}: EcosystemInsightsViewProps) {
  const [queryInput, setQueryInput] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<
    { query: string; answer: string; matchedMembers: EcosystemMemberRecord[] }[]
  >([]);

  const insights = getEcosystemAIInsights(organization.id);

  const handleAskAI = async (promptToUse?: string) => {
    const q = (promptToUse || queryInput).trim();
    if (!q || isQuerying) return;

    setIsQuerying(true);
    if (!promptToUse) setQueryInput("");

    try {
      const res = await askEcosystemAIAsync(organization.id, q);
      setConversationHistory((prev) => [
        { query: q, answer: res.answer, matchedMembers: res.matchedMembers },
        ...prev,
      ]);
    } catch (error) {
      setConversationHistory((prev) => [
        {
          query: q,
          answer: "Unable to process ecosystem intelligence query. Please try again.",
          matchedMembers: [],
        },
        ...prev,
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-royal uppercase tracking-widest mb-1">
            <Handshake className="w-4 h-4 text-royal" />
            <span>Institutional Intelligence Layer</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <span>ECOSYSTEM INSIGHTS &amp; INTELLIGENCE</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-royal bg-royal/5 border border-royal/20 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3 text-royal" />
              <span>Gemini AI</span>
            </span>
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Real-time automated intelligence derived from {organization.name}'s authorized ecosystem data.
          </p>
        </div>
      </div>

      {/* AUTOMATED INSIGHT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insights.map((insightText, idx) => (
          <div
            key={idx}
            className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-start gap-3.5 space-y-1"
          >
            <div className="w-8 h-8 rounded-xl bg-royal/5 text-royal flex items-center justify-center shrink-0 border border-royal/20 mt-0.5 font-bold">
              <Lightbulb className="w-4 h-4 text-royal" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-royal block">
                Ecosystem Insight #{idx + 1}
              </span>
              <p className="text-xs font-semibold text-slate-800 leading-relaxed mt-1">
                {insightText}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* INTERACTIVE ASK ECOSYSTEM AI INTERFACE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold shrink-0">
              <Bot className="w-5 h-5 text-royal-light" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>QUERY ECOSYSTEM INTELLIGENCE</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Online</span>
                </span>
              </h2>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                Query your member database, activation states, regional hubs, and capabilities using Gemini AI.
              </p>
            </div>
          </div>
        </div>

        {/* QUICK PROMPTS */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Suggested Queries
          </span>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((promptText, i) => (
              <button
                key={i}
                disabled={isQuerying}
                onClick={() => handleAskAI(promptText)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>

        {/* QUERY INPUT FORM */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAskAI();
          }}
          className="flex items-center gap-3"
        >
          <div className="flex-1 relative">
            <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryInput}
              disabled={isQuerying}
              onChange={(e) => setQueryInput(e.target.value)}
              placeholder="Ask anything about your ecosystem members, cities, or accreditation..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-2 focus:ring-royal focus:bg-white disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={isQuerying || !queryInput.trim()}
            className="px-5 py-3 bg-royal hover:bg-royal-dark disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer shrink-0"
          >
            {isQuerying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Query AI</span>
              </>
            )}
          </button>
        </form>

        {/* LOADING INDICATOR */}
        {isQuerying && (
          <div className="p-4 rounded-2xl bg-royal/5 border border-royal/20 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-4 h-4 text-royal animate-spin shrink-0" />
            <span className="text-xs font-semibold text-royal">
              Analyzing organization data and querying Gemini AI...
            </span>
          </div>
        )}

        {/* CONVERSATION HISTORY & MATCHED MEMBER CARDS */}
        {conversationHistory.length > 0 && (
          <div className="space-y-6 pt-4 border-t border-slate-100">
            {conversationHistory.map((item, idx) => (
              <div key={idx} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <Search className="w-4 h-4 text-royal" />
                  <span>Query: "{item.query}"</span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {item.answer}
                </div>

                {item.matchedMembers.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Related Ecosystem Members ({item.matchedMembers.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {item.matchedMembers.map((m) => (
                        <div
                          key={m.memberId}
                          className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-bold"
                        >
                          <div>
                            <span className="block text-slate-900 truncate max-w-[180px]">
                              {m.companyName}
                            </span>
                            <span className="block text-[10px] text-slate-500 font-medium">
                              {m.city}, {m.country}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              if (onNavigateUrl) onNavigateUrl(`/companies/${m.companyId}`);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-lg text-slate-700 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
