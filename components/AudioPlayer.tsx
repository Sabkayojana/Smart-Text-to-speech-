import React, { useState, useEffect, useRef, useCallback } from 'react';
import { decodeAudioData, audioBufferToWav } from '../utils/audio';
import { PlayIcon, PauseIcon, DownloadIcon } from './icons';

interface AudioPlayerProps {
    audioDataB64: string;
    part: number;
    speaker?: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioDataB64, part, speaker }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const audioBufferRef = useRef<AudioBuffer | null>(null);
    
    // Refs for tracking playback progress
    const animationFrameRef = useRef<number>();
    const playbackStartContextTimeRef = useRef<number>(0);
    const playbackStartOffsetTimeRef = useRef<number>(0);

    // Initialize AudioContext
    useEffect(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
    }, []);
    
    // Decode audio data when the component receives it
    useEffect(() => {
        let isMounted = true;
        if (audioDataB64 && audioContextRef.current) {
            setIsReady(false);
            setIsPlaying(false);
            if(sourceRef.current) {
                sourceRef.current.stop();
            }

            decodeAudioData(audioDataB64, audioContextRef.current)
                .then(buffer => {
                    if(isMounted) {
                        audioBufferRef.current = buffer;
                        setDuration(buffer.duration);
                        setCurrentTime(0);
                        setIsReady(true);
                    }
                })
                .catch(err => {
                    console.error("Failed to decode audio data", err);
                    if(isMounted) setIsReady(false);
                });
        }

        return () => {
            isMounted = false;
            if (sourceRef.current) {
                try { sourceRef.current.stop(); } catch(e) { /* Already stopped */ }
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
    }, [audioDataB64]);
    
    const updateProgress = useCallback(() => {
        if (!isPlaying || !audioContextRef.current) return;

        const newCurrentTime = playbackStartOffsetTimeRef.current + (audioContextRef.current.currentTime - playbackStartContextTimeRef.current);
        
        if (newCurrentTime < duration) {
            setCurrentTime(newCurrentTime);
            animationFrameRef.current = requestAnimationFrame(updateProgress);
        } else {
            setCurrentTime(duration);
            setIsPlaying(false);
        }
    }, [isPlaying, duration]);
    
    // Effect to start/stop the animation frame loop for progress updates
    useEffect(() => {
        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(updateProgress);
        } else {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isPlaying, updateProgress]);


    const play = (offset: number) => {
        if (!isReady || !audioContextRef.current || !audioBufferRef.current) return;
        
        // Stop any existing source
        if (sourceRef.current) {
            sourceRef.current.onended = null;
            try { sourceRef.current.stop(); } catch(e) {/* Fails if not playing */}
        }
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(audioContextRef.current.destination);
        source.start(0, offset);

        // This handler helps reset state if audio finishes naturally
        source.onended = () => {
            if (isMountedRef.current) {
                // Check if it finished naturally vs being stopped
                if (currentTime >= duration - 0.1) {
                    setIsPlaying(false);
                    setCurrentTime(duration);
                }
            }
        };
        
        sourceRef.current = source;
        playbackStartContextTimeRef.current = audioContextRef.current.currentTime;
        playbackStartOffsetTimeRef.current = offset;
        setIsPlaying(true);
    };
    const isMountedRef = useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; }
    }, []);

    const pause = () => {
        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch(e) {/* Fails if not playing */}
        }
        setIsPlaying(false);
    };
    
    const togglePlayPause = () => {
        if (!isReady) return;
        if (isPlaying) {
            pause();
        } else {
            const offset = (currentTime >= duration) ? 0 : currentTime;
            play(offset);
        }
    };

    const handleDownload = () => {
        if (!audioBufferRef.current) return;

        const wavBlob = audioBufferToWav(audioBufferRef.current);
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        const safeSpeakerName = speaker ? speaker.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
        a.download = speaker ? `${safeSpeakerName}_part_${part}.wav` : `gemini-tts-speech-part-${part}.wav`;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    };
    
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!duration || !isReady) return;
        
        const progressBar = e.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickRatio = x / progressBar.offsetWidth;
        const newTime = duration * clickRatio;

        setCurrentTime(newTime);
        if (isPlaying) {
            play(newTime);
        } else {
            playbackStartOffsetTimeRef.current = newTime;
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex items-center justify-between p-2 bg-gray-800 rounded-md w-full mt-2 space-x-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
                <button
                    onClick={togglePlayPause}
                    disabled={!isReady}
                    className="flex items-center justify-center w-10 h-10 bg-indigo-600 text-white rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed transition-transform duration-200 hover:scale-105 active:scale-95 flex-shrink-0"
                    aria-label="Play/Pause audio"
                >
                    {isPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                </button>
                <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm text-gray-300 font-medium truncate mb-1">{speaker ? `${speaker}'s Audio` : `Part ${part} Audio`}</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-400 font-mono w-10 text-center select-none">{formatTime(currentTime)}</span>
                        <div 
                            className="w-full bg-gray-600 rounded-full h-1.5 cursor-pointer group"
                            onClick={handleSeek}
                            role="progressbar"
                            aria-valuenow={currentTime}
                            aria-valuemin={0}
                            aria-valuemax={duration}
                            aria-label="Audio progress"
                        >
                            <div 
                                className="bg-indigo-500 h-1.5 rounded-full group-hover:bg-indigo-400 transition-colors" 
                                style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                            ></div>
                        </div>
                        <span className="text-xs text-gray-400 font-mono w-10 text-center select-none">{formatTime(duration)}</span>
                    </div>
                </div>
            </div>
            <button
                onClick={handleDownload}
                disabled={!isReady}
                className="p-2 text-gray-400 hover:text-white rounded-full disabled:text-gray-600 disabled:cursor-not-allowed transition-colors"
                aria-label="Download audio"
            >
                <DownloadIcon className="w-6 h-6" />
            </button>
        </div>
    );
};

export default AudioPlayer;