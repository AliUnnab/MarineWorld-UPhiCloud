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

export async function generateAIContent(
  prompt: string,
  systemInstruction?: string,
  modelName = "gemini-2.5-flash"
): Promise<string> {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: systemInstruction
        ? { systemInstruction }
        : undefined,
    });
    return response.text || "";
  } catch (error: any) {
    console.error("[Gemini AI] Error generating content:", error);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
        }),
      });
      const data = await res.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to generate response at this time.";
    } catch (fetchErr) {
      console.error("[Gemini AI] Fallback fetch error:", fetchErr);
      throw error;
    }
  }
}
