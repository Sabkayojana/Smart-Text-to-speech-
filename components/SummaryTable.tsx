
import React from 'react';
import { GenerationTask } from '../types';
import { DownloadIcon } from './icons';
import { audioBufferToWav, decodeAudioData } from '../utils/audio';

interface SummaryTableProps {
    tasks: GenerationTask[];
}

const SummaryTable: React.FC<SummaryTableProps> = ({ tasks }) => {
    
    const handleDownload = async (task: GenerationTask, part: number) => {
        if (!task.audioDataB64) return;
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        try {
            const audioBuffer = await decodeAudioData(task.audioDataB64, audioContext);
            const wavBlob = audioBufferToWav(audioBuffer);
            const url = URL.createObjectURL(wavBlob);
            const a = document.createElement('a');
            document.body.appendChild(a);
            a.style.display = 'none';
            a.href = url;
            const safeSpeakerName = task.speaker ? task.speaker.replace(/[^a-z0-9]/gi, '_').toLowerCase() : '';
            a.download = task.speaker ? `${safeSpeakerName}_part_${part}.wav` : `voice-over-part-${part}.wav`;
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Failed to process and download audio:", error);
            alert("An error occurred while preparing the audio for download.");
        }
    };

    const hasSpeakers = tasks.some(task => task.speaker);

    return (
        <div className="mt-8 p-6 bg-gray-800/50 rounded-lg border border-gray-700">
            <h2 className="text-xl font-semibold text-gray-200 mb-4">Generation Summary</h2>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-600">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Part</th>
                            {hasSpeakers && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Speaker</th>}
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Characters</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Duration</th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase tracking-wider">Download</th>
                        </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {tasks.map((task, index) => (
                            <tr key={task.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-200">{index + 1}</td>
                                {hasSpeakers && <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-300">{task.speaker}</td>}
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{task.charCount}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{task.duration ? `${task.duration.toFixed(2)}s` : 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <button
                                        onClick={() => handleDownload(task, index + 1)}
                                        disabled={!task.audioDataB64}
                                        className="text-indigo-400 hover:text-indigo-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
                                        aria-label={`Download Part ${index + 1}`}
                                    >
                                        <DownloadIcon className="w-6 h-6 mx-auto" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SummaryTable;
