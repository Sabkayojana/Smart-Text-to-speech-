// FIX: Removed self-import which was causing declaration conflicts.
// import { PrebuiltVoice, ScriptTurn } from './types';

export enum PrebuiltVoice {
  Achernar = 'Achernar',
  Achird = 'Achird',
  Algenib = 'Algenib',
  Algieba = 'Algieba',
  Alnilam = 'Alnilam',
  Aoede = 'Aoede',
  Autonoe = 'Autonoe',
  Callirrhoe = 'Callirrhoe',
  Charon = 'Charon',
  Despina = 'Despina',
  Enceladus = 'Enceladus',
  Erinome = 'Erinome',
  Fenrir = 'Fenrir',
  Gacrux = 'Gacrux',
  Iapetus = 'Iapetus',
  Kore = 'Kore',
  Laomedeia = 'Laomedeia',
  Leda = 'Leda',
  Orus = 'Orus',
  Puck = 'Puck',
  Pulcherrima = 'Pulcherrima',
  Rasalgethi = 'Rasalgethi',
  Sadachbia = 'Sadachbia',
  Sadaltager = 'Sadaltager',
  Schedar = 'Schedar',
  Sulafat = 'Sulafat',
  Umbriel = 'Umbriel',
  Vindemiatrix = 'Vindemiatrix',
  Zephyr = 'Zephyr',
  Zubenelgenubi = 'Zubenelgenubi',
}

export interface ScriptTurn {
  id: string;
  speaker: string;
  dialogue: string;
}

export interface Speaker {
  name: string;
  voice: PrebuiltVoice;
}

export interface GenerationTask {
  id: string;
  scriptChunk: string;
  charCount: number;
  status: 'pending' | 'generating' | 'completed' | 'error';
  audioDataB64: string | null;
  duration: number | null;
  error: string | null;
  speaker?: string;
  voice?: PrebuiltVoice;
}

export interface GenerationJob {
  id: string;
  name: string;
  createdAt: string;
  mode: 'single' | 'multi';
  tasks: GenerationTask[];
  // Store the state of the inputs when the job was created
  config: {
    // FIX: Added 'mode' to config to store the full input state, resolving type errors in App.tsx.
    mode: 'single' | 'multi';
    // single mode
    scriptText?: string;
    voice?: PrebuiltVoice;
    // multi mode
    script?: ScriptTurn[];
    speakers?: Speaker[];
    // common
    styleInstruction: string;
  };
}
