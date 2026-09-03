import { GoogleGenAI } from "@google/genai";

const apiKey =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
  (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
  "";

let aiInstance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
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
  modelName = "gemini-2.5-flash"
): Promise<string> {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("Gemini API key is not configured in environment.");
  }

  const normalizedParts = parts.map((p) =>
    typeof p === "string" ? { text: p } : p
  );

  try {
    const ai = getGeminiClient();
    
    // Fast timeout promise (6 seconds) to guarantee instant responses
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini AI request timed out")), 6000)
    );

    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: normalizedParts as any,
      config: systemInstruction
        ? { systemInstruction }
        : undefined,
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    if (response.text && response.text.trim().length > 0) {
      return response.text;
    }
    throw new Error("Empty response received from Gemini API");
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    if (
      errMsg.includes("leaked") ||
      errMsg.includes("PERMISSION_DENIED") ||
      errMsg.includes("403") ||
      errMsg.includes("400")
    ) {
      console.warn("[Gemini AI] Gemini API key is restricted/expired.");
      throw error;
    }

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: normalizedParts }],
          systemInstruction: systemInstruction
            ? { parts: [{ text: systemInstruction }] }
            : undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData?.error?.message ||
            `Gemini REST API error (status ${res.status})`
        );
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text && text.trim().length > 0) {
        return text;
      }
      throw new Error("No candidates found in Gemini response");
    } catch (fetchErr) {
      console.warn("[Gemini AI] Gemini generation could not complete:", fetchErr);
      throw fetchErr;
    }
  }
}

export async function generateAIContent(
  prompt: string,
  systemInstruction?: string,
  modelName = "gemini-2.5-flash"
): Promise<string> {
  return generateAIContentWithParts([{ text: prompt }], systemInstruction, modelName);
}
