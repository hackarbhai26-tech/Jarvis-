import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function chatWithJarvis(message: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: message,
    config: {
      systemInstruction: "You are JARVIS, a highly advanced, sophisticated, and witty AI assistant inspired by Tony Stark's assistant. You are helpful, precise, and occasionally sarcastic. You have access to real-time information via Google Search. Keep your responses concise and professional, like a high-tech interface.",
      tools: [{ googleSearch: {} }],
    },
  });

  return response.text;
}

export async function generateJarvisVoice(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Speak as JARVIS: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' }, // Zephyr sounds sophisticated
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
}
