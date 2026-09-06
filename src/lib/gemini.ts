import { GoogleGenAI } from "@google/genai";

// Verified working Gemini API Key
export const apiKey = "AIzaSyCDTRhN3ZCPSOffyEEn2nNwHXGIbHJazRw";

const candidateKeys = [
  "AIzaSyCDTRhN3ZCPSOffyEEn2nNwHXGIbHJazRw",
  typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_GEMINI_API_KEY : undefined,
  typeof process !== "undefined" ? (process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY) : undefined,
].filter((k): k is string => Boolean(k && k.trim().length > 10 && k !== "AIzaSyCUp6p5nVC2kCxhskLp8ZgW8ulrsX1C770" && k !== "AIzaSyCtmVbkClFyRcZaPpVgASF7sKm_5cWmRqs"));

export function getGeminiClient(keyToUse?: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey: keyToUse || apiKey });
}

export interface AIPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 string
  };
}

export async function generateAIContentWithParts(
  parts: (string | AIPart)[],
  systemInstruction?: string,
  modelName = "gemini-3.1-flash-lite"
): Promise<string> {
  const normalizedParts = parts.map((p) =>
    typeof p === "string" ? { text: p } : p
  );

  // 1. Try local server proxy endpoint (/api/gemini/generate) first
  if (typeof window !== "undefined") {
    try {
      const serverRes = await fetch("/api/gemini/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parts: normalizedParts,
          systemInstruction,
          modelName,
        }),
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        const text = data.text;
        if (text && typeof text === "string" && text.trim().length > 0) {
          return text.trim();
        }
      } else {
        const errJson = await serverRes.json().catch(() => ({}));
        console.warn("[Gemini Server Proxy warning]", serverRes.status, errJson);
      }
    } catch (proxyErr) {
      console.warn("[Gemini Server Proxy unavailable, falling back to direct client call]:", proxyErr);
    }
  }

  const candidateModels = Array.from(new Set([modelName, "gemini-3.1-flash-lite", "gemini-3.6-flash"]));

  // 2. Direct client fallback with candidate keys
  for (const currentKey of candidateKeys) {
    for (const activeModel of candidateModels) {
      try {
        const ai = getGeminiClient(currentKey);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Gemini AI request timed out")), 35000)
        );

        const generatePromise = ai.models.generateContent({
          model: activeModel,
          contents: normalizedParts as any,
          config: systemInstruction ? { systemInstruction } : undefined,
        });

        const response = await Promise.race([generatePromise, timeoutPromise]);
        if (response.text && response.text.trim().length > 0) {
          return response.text.trim();
        }
      } catch (err: any) {
        console.warn(`[Gemini direct call warning] model: ${activeModel}, key: ${currentKey.slice(0, 8)}...`, err?.message || err);
      }
    }
  }

  throw new Error("AI generation unavailable across all model/key fallbacks.");
}

export async function generateAIContent(
  prompt: string,
  systemInstruction?: string,
  modelName = "gemini-3.1-flash-lite"
): Promise<string> {
  return generateAIContentWithParts([{ text: prompt }], systemInstruction, modelName);
}


