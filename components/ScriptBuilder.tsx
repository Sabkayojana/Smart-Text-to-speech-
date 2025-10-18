import React from 'react';
import { ScriptTurn } from '../types';
import { PlusIcon, TrashIcon, SpeakerIcon } from './icons';

interface ScriptBuilderProps {
    script: ScriptTurn[];
    setScript: React.Dispatch<React.SetStateAction<ScriptTurn[]>>;
}

const ScriptBuilder: React.FC<ScriptBuilderProps> = ({ script, setScript }) => {

    const handleScriptChange = (id: string, field: 'speaker' | 'dialogue', value: string) => {
        setScript(currentScript =>
            currentScript.map(turn =>
                turn.id === id ? { ...turn, [field]: value } : turn
            )
        );
    };

    const addTurn = () => {
        const nextSpeakerNum = script.length + 1;
        const newTurn: ScriptTurn = {
            id: Date.now().toString(),
            speaker: `Speaker ${nextSpeakerNum}`,
            dialogue: ''
        };
        setScript(currentScript => [...currentScript, newTurn]);
    };

    const removeTurn = (id: string) => {
        setScript(currentScript => currentScript.filter(turn => turn.id !== id));
    };


    return (
        <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-4">
            <h2 className="text-lg font-semibold text-gray-200 mb-2">Script builder</h2>
            {script.map((turn, index) => (
                <div key={turn.id} className="flex items-start gap-4 p-3 rounded-md bg-gray-900/50">
                    <div className="pt-2 text-gray-400">
                      <SpeakerIcon className="w-5 h-5"/>
                    </div>
                    <div className="flex-1 space-y-2">
                        <input
                            type="text"
                            value={turn.speaker}
                            onChange={(e) => handleScriptChange(turn.id, 'speaker', e.target.value)}
                            className="w-full p-1 bg-transparent text-gray-200 font-semibold focus:outline-none focus:bg-gray-700/50 rounded-md"
                            aria-label="Speaker Name"
                        />
                        <textarea
                            value={turn.dialogue}
                            onChange={(e) => handleScriptChange(turn.id, 'dialogue', e.target.value)}
                            placeholder={`Dialogue for ${turn.speaker || `Speaker ${index + 1}`}`}
                            className="w-full h-20 p-2 bg-gray-800/60 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-y text-gray-300"
                            aria-label="Dialogue"
                        />
                    </div>
                     <button 
                        onClick={() => removeTurn(turn.id)} 
                        className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        aria-label="Remove Turn"
                    >
                        <TrashIcon />
                    </button>
                </div>
            ))}
             <button
                onClick={addTurn}
                className="w-full flex items-center justify-center p-2 text-sm text-indigo-300 bg-gray-700/50 hover:bg-gray-700 rounded-md transition-colors"
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                Add Speaker Turn
            </button>
        </div>
    );
};

export default ScriptBuilder;
