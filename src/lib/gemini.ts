import { GoogleGenAI } from "@google/genai";

export interface AIPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string; // base64 string
  };
}

/**
 * Generate AI content securely through the backend proxy.
 * Prevents Gemini API keys from leaking into the browser client or network inspection.
 */
export async function generateAIContentWithParts(
  parts: (string | AIPart)[],
  systemInstruction?: string,
  modelName = "gemini-2.5-flash"
): Promise<string> {
  const normalizedParts = parts.map((p) =>
    typeof p === "string" ? { text: p } : p
  );

  // 1. Primary path: Server-side secure proxy (/api/gemini/generate)
  // Keeps the API key strictly on the server and completely hidden from the browser/client bundle
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
        const errMsg = errJson?.error || `Server returned ${serverRes.status}`;
        console.warn("[Gemini Proxy]", errMsg);
        throw new Error(errMsg);
      }
    } catch (proxyErr: any) {
      console.warn("[Gemini Proxy Error]:", proxyErr?.message || proxyErr);
      throw proxyErr;
    }
  }

  // 2. Standalone server-side / test environment fallback (Node.js only, strictly from env)
  const envKey = (
    (typeof process !== "undefined"
      ? process.env?.GEMINI_API_KEY || process.env?.VITE_GEMINI_API_KEY
      : undefined) || ""
  ).trim();

  if (!envKey) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.");
  }

  const ai = new GoogleGenAI({ apiKey: envKey });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Gemini AI request timed out")), 35000)
  );

  const generatePromise = ai.models.generateContent({
    model: modelName,
    contents: normalizedParts as any,
    config: systemInstruction ? { systemInstruction } : undefined,
  });

  const response = await Promise.race([generatePromise, timeoutPromise]);
  if (response.text && response.text.trim().length > 0) {
    return response.text.trim();
  }

  throw new Error("No response generated from Gemini.");
}

export async function generateAIContent(
  prompt: string,
  systemInstruction?: string,
  modelName = "gemini-2.5-flash"
): Promise<string> {
  return generateAIContentWithParts([{ text: prompt }], systemInstruction, modelName);
}
