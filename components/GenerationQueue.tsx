import React from 'react';
import { GenerationTask } from '../types';
import AudioPlayer from './AudioPlayer';
import { SpinnerIcon, CheckCircleIcon, XCircleIcon, ClockIcon, ArrowPathIcon } from './icons';

interface GenerationQueueProps {
    tasks: GenerationTask[];
    onRetry: (taskId: string) => void;
}

// A rough estimate for characters per second for an average English speaker.
const CHARS_PER_SECOND_ESTIMATE = 15;

const GenerationQueue: React.FC<GenerationQueueProps> = ({ tasks, onRetry }) => {
    return (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
             <h3 className="text-md font-semibold text-gray-200 mb-4">Generation Queue</h3>
             <div className="space-y-3 max-h-[80vh] overflow-y-auto pr-2">
                {tasks.map((task, index) => (
                    <div key={task.id} className="p-3 bg-gray-900/50 rounded-md border border-gray-700/50">
                        <div className="flex items-center justify-between">
                             <h4 className="font-semibold text-gray-300">
                                {task.speaker ? <span className="font-bold text-indigo-300">{task.speaker}</span> : `Part ${index + 1}`}
                                <span className="text-xs text-gray-400 font-normal ml-2">
                                    ({task.charCount} chars
                                    {task.duration ? 
                                        ` / ${task.duration.toFixed(1)}s` :
                                        (task.status === 'pending' || task.status === 'generating') ?
                                        ` / ~${(task.charCount / CHARS_PER_SECOND_ESTIMATE).toFixed(1)}s est.` :
                                        ''
                                    })
                                </span>
                            </h4>
                            <div className="flex items-center space-x-2 text-sm capitalize">
                                {task.status === 'pending' && <ClockIcon className="w-5 h-5 text-gray-500" />}
                                {task.status === 'generating' && <SpinnerIcon className="w-5 h-5 text-indigo-400" />}
                                {task.status === 'completed' && <CheckCircleIcon className="w-5 h-5 text-green-400" />}
                                {task.status === 'error' && <XCircleIcon className="w-5 h-5 text-red-400" />}
                                <span className={`
                                    ${task.status === 'pending' && 'text-gray-400'}
                                    ${task.status === 'generating' && 'text-indigo-300'}
                                    ${task.status === 'completed' && 'text-green-300'}
                                    ${task.status === 'error' && 'text-red-300'}
                                `}>
                                    {task.status}
                                </span>
                            </div>
                        </div>
                        {task.status === 'completed' && task.audioDataB64 && (
                            <AudioPlayer audioDataB64={task.audioDataB64} part={index + 1} speaker={task.speaker} />
                        )}
                        {task.status === 'error' && (
                            <div className="flex items-start justify-between mt-2">
                                <p className="text-sm text-red-400 flex-1 break-words pr-2">{task.error}</p>
                                <button
                                    onClick={() => onRetry(task.id)}
                                    className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-md transition-colors"
                                    aria-label={`Retry Part ${index + 1}`}
                                >
                                    <ArrowPathIcon className="w-4 h-4" />
                                    <span>Retry</span>
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GenerationQueue;