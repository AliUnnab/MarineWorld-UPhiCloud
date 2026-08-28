/**
 * MarineWorld.City — Cryptographic Utility Functions
 * Provides SHA-256 password hashing compatible with Web Crypto API and Node.js environments.
 */

export async function hashPassword(password: string): Promise<string> {
  if (!password) return "";
  
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Deterministic fallback for environments without crypto.subtle
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return "h_" + Math.abs(hash).toString(16).padStart(16, "0");
}
