
import { GoogleGenAI, Modality } from "@google/genai";
import { PrebuiltVoice } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSpeech = async (
    text: string,
    voice: PrebuiltVoice
): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voice }
                    }
                },
            },
        });
        
        if (response.promptFeedback?.blockReason) {
            throw new Error(`Request was blocked: ${response.promptFeedback.blockReason} - ${response.promptFeedback.blockReasonMessage || 'No additional details.'}`);
        }

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        
        if (!base64Audio) {
            const finishReason = response.candidates?.[0]?.finishReason;
            if (finishReason && finishReason !== 'STOP') {
                const finishMessage = response.candidates?.[0]?.finishMessage;
                throw new Error(`Generation failed. Finish reason: ${finishReason}. ${finishMessage || ''}`);
            }
            throw new Error("No audio data returned from API. The response may have been empty or the prompt was invalid.");
        }

        return base64Audio;
    } catch (error) {
        console.error("Error generating speech:", error);
        if (error instanceof Error) {
             throw new Error(`Failed to generate speech. Please check your input and API key. Details: ${error.message}`);
        }
        throw new Error("Failed to generate speech. Please check your input and API key.");
    }
};
