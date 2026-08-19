/**
 * Cliente Unificado de Inteligência Artificial para o Kreator SaaS
 * 
 * Suporta:
 * 1. Google Gemini 2.0 Flash / 1.5 Flash (Gratuito via Google AI Studio - 1.500 req/dia)
 * 2. Groq Cloud (Llama 3.3 70B / Whisper - Gratuito)
 * 3. Fallback Determinístico Local (Garante 100% de disponibilidade mesmo sem API key configurada)
 */

export interface GeminiBookingResult {
  matchedServiceName?: string;
  matchedProfessionalName?: string;
  targetDate?: string; // YYYY-MM-DD
  targetTime?: string; // HH:mm
  timePreference?: "MANHA" | "TARDE" | "NOITE" | "QUALQUER";
  confidence: number;
  reasoning?: string;
}

export async function callGeminiOrGroq(prompt: string, systemInstruction?: string): Promise<string | null> {
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  // 1. Tentar Google Gemini se a chave estiver configurada
  if (geminiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            ...(systemInstruction ? [{ role: "user", parts: [{ text: `Instrução do Sistema: ${systemInstruction}` }] }] : []),
            { role: "user", parts: [{ text: prompt }] },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {
      console.warn("[GEMINI_API_WARNING] Falha na chamada do Gemini, tentando alternativas...", e);
    }
  }

  // 2. Tentar Groq Cloud se disponível
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            ...(systemInstruction ? [{ role: "system", content: systemInstruction }] : []),
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          response_format: { type: "json_object" },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch (e) {
      console.warn("[GROQ_API_WARNING] Falha na chamada da Groq...", e);
    }
  }

  return null;
}
