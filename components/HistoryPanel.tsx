import React from 'react';
import { GenerationJob } from '../types';
import { TrashIcon } from './icons';

interface HistoryPanelProps {
    history: GenerationJob[];
    activeJobId: string | null;
    onLoadJob: (jobId: string) => void;
    onDeleteJob: (jobId: string) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, activeJobId, onLoadJob, onDeleteJob }) => {

    const getJobStatus = (job: GenerationJob): { text: string; color: string } => {
        if (job.tasks.every(t => t.status === 'completed')) {
            return { text: 'Completed', color: 'text-green-400' };
        }
        if (job.tasks.some(t => t.status === 'generating' || t.status === 'pending')) {
            const pendingCount = job.tasks.filter(t => t.status === 'pending' || t.status === 'generating').length;
            const total = job.tasks.length;
            const completed = total - pendingCount;
            return { text: `In Progress (${completed}/${total})`, color: 'text-indigo-400' };
        }
        if (job.tasks.some(t => t.status === 'error')) {
            return { text: 'Error', color: 'text-red-400' };
        }
        return { text: 'Ready', color: 'text-gray-400' };
    };

    return (
        <div className="bg-gray-800/50 rounded-lg border border-gray-700 max-h-[80vh] overflow-y-auto">
            {history.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                    Your generated projects will appear here.
                </div>
            ) : (
                <ul className="divide-y divide-gray-700">
                    {history.map(job => {
                        const status = getJobStatus(job);
                        const isActive = job.id === activeJobId;
                        return (
                            <li key={job.id} className={`relative p-3 transition-colors ${isActive ? 'bg-indigo-900/30' : 'hover:bg-gray-700/50'}`}>
                                <div className="flex justify-between items-start">
                                    <button onClick={() => onLoadJob(job.id)} className="text-left flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-200 truncate">{job.name}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(job.createdAt).toLocaleString()}
                                        </p>
                                        <p className={`text-xs font-medium mt-1 ${status.color}`}>
                                            {status.text}
                                        </p>
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteJob(job.id);
                                        }}
                                        className="p-1 text-gray-500 hover:text-red-400 transition-colors ml-2 flex-shrink-0"
                                        aria-label={`Delete project ${job.name}`}
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    );
};

export default HistoryPanel;
