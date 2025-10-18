import { GenerationJob } from "../types";

const HISTORY_STORAGE_KEY = 'gemini-tts-history';

export function loadHistory(): GenerationJob[] {
    try {
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (storedHistory) {
            // Add basic validation if needed
            return JSON.parse(storedHistory) as GenerationJob[];
        }
    } catch (error) {
        console.error("Failed to load or parse history from localStorage", error);
        // If parsing fails, clear the corrupted data
        localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
    return [];
}

export function saveHistory(history: GenerationJob[]): void {
    try {
        // Create a copy of the history that excludes the large base64 audio data
        // to avoid exceeding the localStorage quota. Audio is only available for the active session.
        const historyToStore = history.map(job => ({
            ...job,
            tasks: job.tasks.map(task => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { audioDataB64, ...restOfTask } = task;
                return { ...restOfTask, audioDataB64: null };
            }),
        }));

        const serializedHistory = JSON.stringify(historyToStore);
        localStorage.setItem(HISTORY_STORAGE_KEY, serializedHistory);
    } catch (error) {
        console.error("Failed to save history to localStorage", error);
    }
}