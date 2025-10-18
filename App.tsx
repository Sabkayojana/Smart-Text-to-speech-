import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PrebuiltVoice, GenerationTask, ScriptTurn, Speaker, GenerationJob } from './types';
import { generateSpeech } from './services/geminiService';
import { decodeAudioData } from './utils/audio';
import VoiceSelector from './components/VoiceSelector';
import GenerationQueue from './components/GenerationQueue';
import SummaryTable from './components/SummaryTable';
import ScriptBuilder from './components/ScriptBuilder';
import SpeakerMapping from './components/SpeakerMapping';
import { SpinnerIcon, PlusIcon } from './components/icons';
import { loadHistory, saveHistory } from './utils/history';
import HistoryPanel from './components/HistoryPanel';


const initialSingleScript = `Welcome to the enhanced Gemini Text-to-Speech Studio. This tool is now optimized for generating high-quality voice-overs for long scripts.

You can paste your entire script here, up to 50,000 characters. The system will automatically handle the rest. It intelligently splits your text into manageable chunks, ensuring that sentences and words are not cut off midway. This preserves the natural flow and coherence of the narration.

Once you click 'Run', each chunk is processed sequentially to generate audio. This ensures a consistent voice, tone, and style across all parts of your voice-over, as if recorded in a single take. You can monitor the progress of each part in the Generation Queue. When a part is complete, you can preview it immediately.

After the entire script is processed, a comprehensive summary table will appear. This table will provide details for each generated audio file, including its character count, duration, and a direct download link.

This streamlined workflow is designed to make voice-over production for long-form content, such as audiobooks, presentations, or video narrations, both simple and efficient. Just paste your script, select a voice, define the style, and let Gemini do the work.`;

const initialMultiScript: ScriptTurn[] = [
    { id: '1', speaker: 'Narrator', dialogue: 'The scene opens in a futuristic city, with flying cars zipping between towering skyscrapers.' },
    { id: '2', speaker: 'Jax', dialogue: 'Are you sure this is the right place? My sensors are picking up strange energy readings.' },
    { id: '3', speaker: 'Zoe', dialogue: 'Positive. The artifact is here. I can feel it. Let\'s move.' },
];

const App: React.FC = () => {
    // Core state
    const [history, setHistory] = useState<GenerationJob[]>(() => loadHistory());
    const [activeJobId, setActiveJobId] = useState<string | null>(null);

    // Input state for new projects
    const [mode, setMode] = useState<'single' | 'multi'>('single');
    const [styleInstruction, setStyleInstruction] = useState('Read in a clear, professional, and engaging tone.');
    const [scriptText, setScriptText] = useState<string>(initialSingleScript);
    const [voice, setVoice] = useState<PrebuiltVoice>(PrebuiltVoice.Zephyr);
    const [script, setScript] = useState<ScriptTurn[]>(initialMultiScript);
    const [speakers, setSpeakers] = useState<Speaker[]>([]);
    
    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const audioContextRef = React.useRef<AudioContext | null>(null);

    const activeJob = useMemo(() => history.find(job => job.id === activeJobId), [history, activeJobId]);

    // Initialize audio context
    useEffect(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }, []);

    // Persist history whenever it changes
    useEffect(() => {
        saveHistory(history);
    }, [history]);
    
    // Sync speakers from script turns in multi-speaker mode
    useEffect(() => {
        if (mode === 'multi' && !activeJobId) {
            const uniqueSpeakerNames = [...new Set(script.map(turn => turn.speaker.trim()).filter(Boolean))];
            
            setSpeakers(prevSpeakers => {
                const updatedSpeakers = uniqueSpeakerNames.map((name, index) => {
                    const existingSpeaker = prevSpeakers.find(s => s.name === name);
                    if (existingSpeaker) return existingSpeaker;
                    
                    const availableVoices = Object.values(PrebuiltVoice);
                    return {
                        name,
                        voice: availableVoices[(prevSpeakers.length + index) % availableVoices.length],
                    };
                });
                return updatedSpeakers.filter(s => uniqueSpeakerNames.includes(s.name));
            });
        }
    }, [script, mode, activeJobId]);

    const showSummary = useMemo(() => {
        if (!activeJob) return false;
        // Show summary if there are tasks and at least one is not pending.
        // This allows the table to appear and populate as tasks are processed.
        return activeJob.tasks.length > 0 && activeJob.tasks.some(t => t.status !== 'pending');
    }, [activeJob]);
    
    const updateJob = (jobId: string, updates: Partial<GenerationJob> | ((job: GenerationJob) => Partial<GenerationJob>)) => {
        setHistory(prevHistory =>
            prevHistory.map(job => {
                if (job.id === jobId) {
                    const jobUpdates = typeof updates === 'function' ? updates(job) : updates;
                    return { ...job, ...jobUpdates };
                }
                return job;
            })
        );
    };

    const updateTask = (taskId: string, updates: Partial<GenerationTask>) => {
        if (!activeJobId) return;
        updateJob(activeJobId, (job) => ({
            tasks: job.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
        }));
    };

    const handleSpeakerVoiceChange = (speakerName: string, newVoice: PrebuiltVoice) => {
        setSpeakers(currentSpeakers => 
            currentSpeakers.map(s => s.name === speakerName ? { ...s, voice: newVoice } : s)
        );
    };

    const handleCreateJob = () => {
        setError(null);

        let tasks: GenerationTask[] = [];
        let jobConfig: GenerationJob['config'];
        
        if (mode === 'single') {
            if (!scriptText.trim()) return setError("Please enter a script.");
            if (scriptText.length > 50000) return setError("Script is too long. Maximum length is 50,000 characters.");

            const MAX_CHUNK_CHAR_LIMIT = 4500;
            const chunks: string[] = [];
            let remainingScript = scriptText;
            const styleLen = styleInstruction.trim().length > 0 ? styleInstruction.trim().length + 1 : 0;

            while (remainingScript.length > 0) {
                const effectiveLimit = MAX_CHUNK_CHAR_LIMIT - styleLen;
                if (remainingScript.length <= effectiveLimit) {
                    if (remainingScript.trim()) chunks.push(remainingScript);
                    break;
                }
                
                let chunkEnd = effectiveLimit;
                const lastSentenceEnd = remainingScript.substring(0, chunkEnd).search(/(\.|\?|!|\n)[^.?!]*$/);
                if (lastSentenceEnd > 0) {
                    chunkEnd = lastSentenceEnd + 1;
                } else {
                    const lastSpace = remainingScript.substring(0, chunkEnd).lastIndexOf(' ');
                    if (lastSpace > 0) chunkEnd = lastSpace;
                }
                
                const chunk = remainingScript.substring(0, chunkEnd);
                if (chunk.trim()) chunks.push(chunk);
                remainingScript = remainingScript.substring(chunkEnd);
            }

            tasks = chunks.map((chunk, index) => ({
                id: `${Date.now()}-${index}`, scriptChunk: chunk, charCount: chunk.length,
                status: 'pending', audioDataB64: null, duration: null, error: null,
            }));
            jobConfig = { mode, scriptText, voice, styleInstruction };

        } else { // Multi-speaker mode
            if (script.length === 0 || script.every(turn => !turn.dialogue.trim())) return setError("Please add dialogue to the script.");
            
            tasks = script.filter(turn => turn.dialogue.trim()).map((turn, index) => {
                const trimmedSpeaker = turn.speaker.trim();
                const speakerInfo = speakers.find(s => s.name === trimmedSpeaker);
                return {
                    id: `${Date.now()}-${index}`, scriptChunk: turn.dialogue, charCount: turn.dialogue.length,
                    status: 'pending', audioDataB64: null, duration: null, error: null,
                    speaker: trimmedSpeaker, voice: speakerInfo?.voice || PrebuiltVoice.Zephyr,
                };
            });
            jobConfig = { mode, script, speakers, styleInstruction };
        }

        if (tasks.length === 0) return setError("No valid text found to generate speech.");

        const newJob: GenerationJob = {
            id: Date.now().toString(),
            name: mode === 'single' ? `Voice-over Project` : `Multi-speaker Script`,
            createdAt: new Date().toISOString(),
            mode,
            tasks,
            config: jobConfig,
        };
        
        setHistory(prev => [newJob, ...prev]);
        setActiveJobId(newJob.id);
    };
    
    const processTask = useCallback(async (task: GenerationTask) => {
        if (!audioContextRef.current || !activeJob) return;
        
        updateTask(task.id, { status: 'generating' });

        const instruction = activeJob.config.styleInstruction.trim();
        const fullText = instruction ? `${instruction.replace(/[.!?:]*$/, '')}: ${task.scriptChunk}` : task.scriptChunk;
        const voiceToUse = task.voice || activeJob.config.voice || PrebuiltVoice.Zephyr;

        try {
            const data = await generateSpeech(fullText, voiceToUse);
            const audioBuffer = await decodeAudioData(data, audioContextRef.current);
            updateTask(task.id, { status: 'completed', audioDataB64: data, duration: audioBuffer.duration });
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            updateTask(task.id, { status: 'error', error: errorMessage });
        }
    }, [activeJob]);

    const handleRetryTask = (taskId: string) => {
        updateTask(taskId, { status: 'pending', error: null });
    };

    const handleLoadJob = (jobId: string) => {
        setActiveJobId(jobId);
    };

    const handleDeleteJob = (jobId: string) => {
        setHistory(prev => prev.filter(j => j.id !== jobId));
        if (activeJobId === jobId) {
            setActiveJobId(null);
        }
    };
    
    const handleStartNew = () => {
        setActiveJobId(null);
        setError(null);
        // Reset inputs to default state
        setMode('single');
        setScriptText(initialSingleScript);
        setVoice(PrebuiltVoice.Zephyr);
        setScript(initialMultiScript);
        setStyleInstruction('Read in a clear, professional, and engaging tone.');
    }

    // Task processing effect
    useEffect(() => {
        if (!activeJob) {
            setIsLoading(false);
            return;
        }

        const isGenerating = activeJob.tasks.some(t => t.status === 'generating');
        const pendingTask = activeJob.tasks.find(t => t.status === 'pending');

        setIsLoading(isGenerating || !!pendingTask);

        if (!isGenerating && pendingTask) {
            processTask(pendingTask);
        }
    }, [activeJob, processTask]);

    const renderEditor = () => (
        <div className="flex flex-col space-y-6">
            <div className="flex justify-center mb-2">
                <div className="bg-gray-800 p-1 rounded-lg flex space-x-1 border border-gray-700">
                    <button onClick={() => setMode('single')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'single' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        Single Voice-over
                    </button>
                    <button onClick={() => setMode('multi')} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'multi' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                        Multi-speaker Script
                    </button>
                </div>
            </div>

            {mode === 'single' ? (
                <>
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <label htmlFor="script-textarea" className="block text-lg font-semibold text-gray-200 mb-3">Full Script</label>
                        <textarea
                            id="script-textarea" value={scriptText} onChange={(e) => setScriptText(e.target.value)}
                            placeholder="Paste your full script here..."
                            className="w-full p-3 bg-gray-900 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 text-gray-200 h-96 resize-y"
                        />
                        <p className={`text-right text-sm mt-2 ${scriptText.length > 50000 ? 'text-red-400' : 'text-gray-500'}`}>{scriptText.length} / 50000 characters</p>
                    </div>
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <VoiceSelector id="main-voice" label="Select Voice" selectedVoice={voice} onChange={setVoice} />
                    </div>
                </>
            ) : (
                <>
                    <ScriptBuilder script={script} setScript={setScript} />
                    <SpeakerMapping speakers={speakers} onSpeakerVoiceChange={handleSpeakerVoiceChange} />
                </>
            )}
             
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                <label htmlFor="style-input" className="block text-sm font-medium text-gray-400 mb-1">Style Instructions (applied to all parts)</label>
                <input
                    id="style-input" type="text" value={styleInstruction} onChange={(e) => setStyleInstruction(e.target.value)}
                    placeholder="e.g., 'A calm, narrative tone'"
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 text-gray-200"
                />
            </div>

             <div className="flex items-center justify-start">
                <button
                    onClick={handleCreateJob}
                    className="w-48 flex items-center justify-center p-3 text-lg font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-all duration-200 shadow-lg hover:shadow-indigo-500/50"
                >
                    Generate Audio
                </button>
            </div>
        </div>
    );

    const renderActiveJob = () => {
        if (!activeJob) return null;
        return (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                     <GenerationQueue tasks={activeJob.tasks} onRetry={handleRetryTask} />
                </div>
                <div>
                     {showSummary && <SummaryTable tasks={activeJob.tasks} />}
                </div>
            </div>
        )
    };

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-4xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
                        Gemini TTS Studio
                    </h1>
                     <p className="text-center text-lg text-gray-400 mt-2">
                        High-quality voice generation with persistent project history.
                    </p>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                    <aside className="xl:col-span-1">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-xl font-semibold text-gray-200">Projects</h2>
                             <button 
                                onClick={handleStartNew} 
                                className="flex items-center text-sm text-indigo-300 hover:text-indigo-200 transition-colors bg-gray-700/50 hover:bg-gray-700 px-3 py-1 rounded-md"
                                title="Start a new project"
                            >
                                <PlusIcon className="w-5 h-5 mr-1"/>
                                New
                            </button>
                        </div>
                        <HistoryPanel 
                            history={history} 
                            activeJobId={activeJobId} 
                            onLoadJob={handleLoadJob} 
                            onDeleteJob={handleDeleteJob}
                        />
                    </aside>

                    <main className="xl:col-span-3">
                         {error && <p className="text-red-400 mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-md">{error}</p>}
                         {activeJob ? renderActiveJob() : renderEditor()}
                    </main>
                </div>
            </div>
        </div>
    );
};

export default App;