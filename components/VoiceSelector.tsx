
import React from 'react';
import { PrebuiltVoice } from '../types';

interface VoiceSelectorProps {
    id: string;
    selectedVoice: PrebuiltVoice;
    onChange: (voice: PrebuiltVoice) => void;
    label?: string;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ id, selectedVoice, onChange, label }) => {
    const voices = Object.values(PrebuiltVoice);

    return (
        <div>
            {label && <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">{label}</label>}
            <select
                id={id}
                value={selectedVoice}
                onChange={(e) => onChange(e.target.value as PrebuiltVoice)}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm p-2"
            >
                {voices.map(voice => (
                    <option key={voice} value={voice}>{voice}</option>
                ))}
            </select>
        </div>
    );
};

export default VoiceSelector;
