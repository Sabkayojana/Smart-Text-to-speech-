import React from 'react';
import { Speaker, PrebuiltVoice } from '../types';
import VoiceSelector from './VoiceSelector';

interface SpeakerMappingProps {
    speakers: Speaker[];
    onSpeakerVoiceChange: (speakerName: string, voice: PrebuiltVoice) => void;
}

const SpeakerMapping: React.FC<SpeakerMappingProps> = ({ speakers, onSpeakerVoiceChange }) => {
    return (
        <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <h3 className="text-md font-semibold text-gray-200 mb-4">Speaker Voices</h3>
            {speakers.length > 0 ? (
                 <div className="space-y-3">
                    {speakers.map(speaker => (
                        <div key={speaker.name} className="grid grid-cols-2 gap-4 items-center">
                            <span className="font-medium text-gray-300 truncate">{speaker.name}</span>
                            <VoiceSelector
                                id={`speaker-voice-${speaker.name}`}
                                selectedVoice={speaker.voice}
                                onChange={(voice) => onSpeakerVoiceChange(speaker.name, voice)}
                            />
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-500">Add speakers to the script to assign voices.</p>
            )}
        </div>
    );
};

export default SpeakerMapping;
