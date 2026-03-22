import * as Tone from 'tone';

let pianoSampler: Tone.Sampler | null = null;
let pianoSamplerLoaded: Promise<void> | null = null;
let rhodesSampler: Tone.Sampler | null = null;
let rhodesSamplerLoaded: Promise<void> | null = null;
let reverbNode: Tone.Reverb | null = null;
let reverbNodeReady: Promise<void> | null = null;
let scheduledPlaybackTimeouts: ReturnType<typeof setTimeout>[] = [];
const DEFAULT_TEMPO_BPM = 100;
const MIN_TEMPO_BPM = 40;
const MAX_TEMPO_BPM = 240;
const CHORD_BEATS = 2;
const STRUM_STEP_SECONDS = 0.025;

export type PlaybackStyle = 'strum' | 'block';
export type PlaybackRegister = 'off' | 'low' | 'mid' | 'high';
export type AudioInstrument = 'piano' | 'rhodes';

const REGISTER_MIDI_RANGES: Record<
  Exclude<PlaybackRegister, 'off'>,
  { min: number; max: number }
> = {
  low: { min: 36, max: 59 }, // C2–B3
  mid: { min: 48, max: 71 }, // C3–B4
  high: { min: 60, max: 83 }, // C4–B5
};

const MAX_HUMANIZE_TIMING_S = 0.05; // 50 ms at 100%
const MAX_HUMANIZE_VELOCITY = 12; // ±12 MIDI velocity units at 100%

const applyInversionLock = (notes: string[], register: PlaybackRegister): string[] => {
  if (register === 'off') return notes;
  const range = REGISTER_MIDI_RANGES[register];
  const center = (range.min + range.max) / 2;

  return notes.map((note) => {
    const baseMidi = Tone.Frequency(note).toMidi();
    let bestMidi: number = baseMidi;
    let bestDist = Infinity;

    for (let shift = -4; shift <= 4; shift++) {
      const candidate = baseMidi + shift * 12;
      if (candidate >= range.min && candidate <= range.max) {
        const dist = Math.abs(candidate - center);
        if (dist < bestDist) {
          bestDist = dist;
          bestMidi = candidate;
        }
      }
    }

    // If no octave shift placed this note in range, pick the nearest boundary
    if (bestDist === Infinity) {
      for (let shift = -4; shift <= 4; shift++) {
        const candidate = baseMidi + shift * 12;
        const clampDist = Math.abs(Math.max(range.min, Math.min(range.max, candidate)) - center);
        if (clampDist < bestDist) {
          bestDist = clampDist;
          bestMidi = candidate;
        }
      }
    }

    return Tone.Frequency(bestMidi, 'midi').toNote() as string;
  });
};

/**
 * gate: 0 = staccato (~10% of chord duration), 1 = sustained (~95%)
 */
const applyGate = (chordDurationSeconds: number, gate: number): number =>
  chordDurationSeconds * (0.1 + gate * 0.85);

const normalizeVelocity = (velocity?: number): number | undefined => {
  if (!Number.isFinite(velocity)) {
    return undefined;
  }

  return Math.min(1, Math.max(0.1, (velocity ?? 96) / 127));
};

const normalizeTempoBpm = (tempoBpm?: number): number => {
  if (!Number.isFinite(tempoBpm)) {
    return DEFAULT_TEMPO_BPM;
  }

  return Math.min(
    MAX_TEMPO_BPM,
    Math.max(MIN_TEMPO_BPM, Math.round(tempoBpm ?? DEFAULT_TEMPO_BPM)),
  );
};

const getChordDurationSeconds = (tempoBpm?: number): number => {
  const normalizedTempo = normalizeTempoBpm(tempoBpm);
  return (60 / normalizedTempo) * CHORD_BEATS;
};

const getReverbNode = (): Tone.Reverb => {
  if (!reverbNode) {
    reverbNode = new Tone.Reverb({ decay: 2.5, wet: 0 }).toDestination();
    reverbNodeReady = reverbNode.ready;
  }
  return reverbNode;
};

const ensureReverbReady = async (): Promise<void> => {
  getReverbNode();
  if (reverbNodeReady) {
    await reverbNodeReady;
  }
};

export const setReverbWet = (wet: number): void => {
  getReverbNode().wet.value = Math.min(1, Math.max(0, wet));
};

const shiftNotesByOctaves = (notes: string[], octaveShift: number): string[] => {
  if (octaveShift === 0) return notes;

  return notes.map((note) => {
    const baseMidi = Tone.Frequency(note).toMidi();
    const shiftedMidi = baseMidi + octaveShift * 12;
    return Tone.Frequency(shiftedMidi, 'midi').toNote() as string;
  });
};

const getPianoSampler = (): Tone.Sampler => {
  if (!pianoSampler) {
    pianoSampler = new Tone.Sampler({
      urls: {
        A0: 'A0.mp3',
        C1: 'C1.mp3',
        'D#1': 'Ds1.mp3',
        'F#1': 'Fs1.mp3',
        A1: 'A1.mp3',
        C2: 'C2.mp3',
        'D#2': 'Ds2.mp3',
        'F#2': 'Fs2.mp3',
        A2: 'A2.mp3',
        C3: 'C3.mp3',
        'D#3': 'Ds3.mp3',
        'F#3': 'Fs3.mp3',
        A3: 'A3.mp3',
        C4: 'C4.mp3',
        'D#4': 'Ds4.mp3',
        'F#4': 'Fs4.mp3',
        A4: 'A4.mp3',
        C5: 'C5.mp3',
        'D#5': 'Ds5.mp3',
        'F#5': 'Fs5.mp3',
        A5: 'A5.mp3',
        C6: 'C6.mp3',
        'D#6': 'Ds6.mp3',
        'F#6': 'Fs6.mp3',
        A6: 'A6.mp3',
        C7: 'C7.mp3',
        'D#7': 'Ds7.mp3',
        'F#7': 'Fs7.mp3',
        A7: 'A7.mp3',
        C8: 'C8.mp3',
      },
      release: 1,
      baseUrl: 'https://tonejs.github.io/audio/salamander/',
    }).connect(getReverbNode());

    pianoSamplerLoaded = Tone.loaded();
  }

  return pianoSampler;
};

const ensurePianoSamplerLoaded = async (): Promise<Tone.Sampler> => {
  const sampler = getPianoSampler();

  await ensureReverbReady();

  if (pianoSamplerLoaded) {
    await pianoSamplerLoaded;
  }

  return sampler;
};

const getRhodesSampler = (): Tone.Sampler => {
  if (!rhodesSampler) {
    rhodesSampler = new Tone.Sampler({
      urls: {
        'A#1': 'a%231.mp3',
        'A#2': 'a%232.mp3',
        'A#3': 'a%233.mp3',
        'A#4': 'a%234.mp3',
        'A#5': 'a%235.mp3',
        'A#6': 'a%236.mp3',
        'A#7': 'a%237.mp3',
        A1: 'a1.mp3',
        A2: 'a2.mp3',
        A3: 'a3.mp3',
        A4: 'a4.mp3',
        A5: 'a5.mp3',
        A6: 'a6.mp3',
        A7: 'a7.mp3',
        B1: 'b1.mp3',
        B2: 'b2.mp3',
        B3: 'b3.mp3',
        B4: 'b4.mp3',
        B5: 'b5.mp3',
        B6: 'b6.mp3',
        B7: 'b7.mp3',
        'C#1': 'c%231.mp3',
        'C#2': 'c%232.mp3',
        'C#3': 'c%233.mp3',
        'C#4': 'c%234.mp3',
        'C#5': 'c%235.mp3',
        'C#6': 'c%236.mp3',
        'C#7': 'c%237.mp3',
        C1: 'c1.mp3',
        C2: 'c2.mp3',
        C3: 'c3.mp3',
        C4: 'c4.mp3',
        C5: 'c5.mp3',
        C6: 'c6.mp3',
        C7: 'c7.mp3',
        C8: 'c8.mp3',
        'D#1': 'd%231.mp3',
        'D#2': 'd%232.mp3',
        'D#3': 'd%233.mp3',
        'D#4': 'd%234.mp3',
        'D#5': 'd%235.mp3',
        'D#6': 'd%236.mp3',
        'D#7': 'd%237.mp3',
        D1: 'd1.mp3',
        D2: 'd2.mp3',
        D3: 'd3.mp3',
        D4: 'd4.mp3',
        D5: 'd5.mp3',
        D6: 'd6.mp3',
        D7: 'd7.mp3',
        E1: 'e1.mp3',
        E2: 'e2.mp3',
        E3: 'e3.mp3',
        E4: 'e4.mp3',
        E5: 'e5.mp3',
        E6: 'e6.mp3',
        E7: 'e7.mp3',
        'F#1': 'f%231.mp3',
        'F#2': 'f%232.mp3',
        'F#3': 'f%233.mp3',
        'F#4': 'f%234.mp3',
        'F#5': 'f%235.mp3',
        'F#6': 'f%236.mp3',
        'F#7': 'f%237.mp3',
        F1: 'f1.mp3',
        F2: 'f2.mp3',
        F3: 'f3.mp3',
        F4: 'f4.mp3',
        F5: 'f5.mp3',
        F6: 'f6.mp3',
        F7: 'f7.mp3',
        'G#1': 'g%231.mp3',
        'G#2': 'g%232.mp3',
        'G#3': 'g%233.mp3',
        'G#4': 'g%234.mp3',
        'G#5': 'g%235.mp3',
        'G#6': 'g%236.mp3',
        'G#7': 'g%237.mp3',
        G1: 'g1.mp3',
        G2: 'g2.mp3',
        G3: 'g3.mp3',
        G4: 'g4.mp3',
        G5: 'g5.mp3',
        G6: 'g6.mp3',
        G7: 'g7.mp3',
      },
      release: 0.8,
      baseUrl: '/audio/rhodes/',
    }).connect(getReverbNode());

    rhodesSamplerLoaded = Tone.loaded();
  }

  return rhodesSampler;
};

const ensureRhodesSamplerLoaded = async (): Promise<Tone.Sampler> => {
  const sampler = getRhodesSampler();

  await ensureReverbReady();

  if (rhodesSamplerLoaded) {
    await rhodesSamplerLoaded;
  }

  return sampler;
};

const sortNotesLowToHigh = (notes: string[]): string[] => {
  return [...notes].sort((a, b) => {
    const midiA = Tone.Frequency(a).toMidi();
    const midiB = Tone.Frequency(b).toMidi();
    return midiA - midiB;
  });
};

const triggerStrummedChord = ({
  instrument,
  notes,
  duration,
  startTime,
  velocity,
}: {
  instrument: Tone.Sampler;
  notes: string[];
  duration: Tone.Unit.Time;
  startTime?: Tone.Unit.Time;
  velocity?: number;
}): void => {
  const orderedNotes = sortNotesLowToHigh(notes);
  const normalizedVelocity = normalizeVelocity(velocity);

  orderedNotes.forEach((note, index) => {
    if (startTime !== undefined) {
      const noteTime = Tone.Time(startTime).toSeconds() + index * STRUM_STEP_SECONDS;
      instrument.triggerAttackRelease(note, duration, noteTime, normalizedVelocity);
      return;
    }

    instrument.triggerAttackRelease(
      note,
      duration,
      `+${index * STRUM_STEP_SECONDS}`,
      normalizedVelocity,
    );
  });
};

const triggerBlockChord = ({
  instrument,
  notes,
  duration,
  startTime,
  velocity,
}: {
  instrument: Tone.Sampler;
  notes: string[];
  duration: Tone.Unit.Time;
  startTime?: Tone.Unit.Time;
  velocity?: number;
}): void => {
  const orderedNotes = sortNotesLowToHigh(notes);
  const normalizedVelocity = normalizeVelocity(velocity);

  if (orderedNotes.length === 0) {
    return;
  }

  if (startTime !== undefined) {
    instrument.triggerAttackRelease(orderedNotes, duration, startTime, normalizedVelocity);
    return;
  }

  instrument.triggerAttackRelease(orderedNotes, duration, undefined, normalizedVelocity);
};

const triggerChordByStyle = ({
  style,
  instrument,
  notes,
  duration,
  startTime,
  attack,
  decay,
  velocity,
}: {
  style: PlaybackStyle;
  instrument: Tone.Sampler;
  notes: string[];
  duration: Tone.Unit.Time;
  startTime?: Tone.Unit.Time;
  attack?: number;
  decay?: number;
  velocity?: number;
}): void => {
  if (attack !== undefined) {
    instrument.attack = attack;
  }
  if (decay !== undefined) {
    instrument.release = decay;
  }

  if (style === 'block') {
    triggerBlockChord({ instrument, notes, duration, startTime, velocity });
    return;
  }

  triggerStrummedChord({ instrument, notes, duration, startTime, velocity });
};

export const startAudio = async (): Promise<void> => {
  if (Tone.context.state !== 'running') {
    await Tone.start();
  }
};

export const stopAllAudio = (): void => {
  scheduledPlaybackTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  scheduledPlaybackTimeouts = [];

  if (pianoSampler) {
    pianoSampler.releaseAll();
  }

  if (rhodesSampler) {
    rhodesSampler.releaseAll();
  }

  Tone.Transport.stop();
  Tone.Transport.cancel();
};

export const playChordVoicing = async ({
  leftHand,
  rightHand,
  duration,
  tempoBpm,
  playbackStyle = 'strum',
  attack,
  decay,
  velocity,
  humanize = 0,
  gate = 1,
  inversionRegister = 'off',
  instrument = 'piano',
  octaveShift = 0,
}: {
  leftHand: string[];
  rightHand: string[];
  duration?: Tone.Unit.Time;
  tempoBpm?: number;
  playbackStyle?: PlaybackStyle;
  attack?: number;
  decay?: number;
  velocity?: number;
  humanize?: number;
  gate?: number;
  inversionRegister?: PlaybackRegister;
  instrument?: AudioInstrument;
  octaveShift?: number;
}): Promise<void> => {
  await startAudio();
  stopAllAudio();
  
  let audioInstrument: Tone.Sampler;
  if (instrument === 'rhodes') {
    audioInstrument = await ensureRhodesSamplerLoaded();
  } else {
    audioInstrument = await ensurePianoSamplerLoaded();
  }

  const chordDurSeconds = getChordDurationSeconds(tempoBpm);
  const noteDuration =
    gate !== 1 ? applyGate(chordDurSeconds, gate) : (duration ?? chordDurSeconds);

  const shiftedLeftHand = shiftNotesByOctaves(leftHand, octaveShift);
  const shiftedRightHand = shiftNotesByOctaves(rightHand, octaveShift);
  const lockedNotes = applyInversionLock(
    [...shiftedLeftHand, ...shiftedRightHand],
    inversionRegister,
  );

  if (lockedNotes.length > 0) {
    const timingDelay = humanize > 0 ? Math.random() * humanize * MAX_HUMANIZE_TIMING_S : 0;
    const velJitter = humanize > 0 ? (Math.random() * 2 - 1) * humanize * MAX_HUMANIZE_VELOCITY : 0;
    const effectiveVelocity =
      velocity !== undefined
        ? Math.round(Math.max(20, Math.min(127, velocity + velJitter)))
        : undefined;

    triggerChordByStyle({
      style: playbackStyle,
      instrument: audioInstrument,
      notes: lockedNotes,
      duration: noteDuration,
      startTime: timingDelay > 0 ? `+${timingDelay}` : undefined,
      attack,
      decay,
      velocity: effectiveVelocity,
    });
  }
};

export const playProgression = async (
  voicings: Array<{
    leftHand: string[];
    rightHand: string[];
  }>,
  tempoBpm?: number,
  playbackStyle: PlaybackStyle = 'strum',
  attack?: number,
  decay?: number,
  opts?: {
    velocity?: number;
    humanize?: number;
    gate?: number;
    inversionRegister?: PlaybackRegister;
    instrument?: AudioInstrument;
    octaveShift?: number;
  },
): Promise<void> => {
  await startAudio();
  stopAllAudio();

  const {
    velocity,
    humanize = 0,
    gate = 1,
    inversionRegister = 'off',
    instrument = 'piano',
    octaveShift = 0,
  } = opts ?? {};

  let audioInstrument: Tone.Sampler;
  if (instrument === 'rhodes') {
    audioInstrument = await ensureRhodesSamplerLoaded();
  } else {
    audioInstrument = await ensurePianoSamplerLoaded();
  }

  const chordDurationSeconds = getChordDurationSeconds(tempoBpm);
  const noteDuration = applyGate(chordDurationSeconds, gate);

  voicings.forEach((voicing, index) => {
    const shiftedLeftHand = shiftNotesByOctaves(voicing.leftHand, octaveShift);
    const shiftedRightHand = shiftNotesByOctaves(voicing.rightHand, octaveShift);
    const lockedNotes = applyInversionLock(
      [...shiftedLeftHand, ...shiftedRightHand],
      inversionRegister,
    );

    if (lockedNotes.length > 0) {
      const timingJitter =
        humanize > 0 ? (Math.random() * 2 - 1) * humanize * MAX_HUMANIZE_TIMING_S : 0;
      const velJitter =
        humanize > 0 ? (Math.random() * 2 - 1) * humanize * MAX_HUMANIZE_VELOCITY : 0;
      const effectiveVelocity =
        velocity !== undefined
          ? Math.round(Math.max(20, Math.min(127, velocity + velJitter)))
          : undefined;

      const timeoutId = setTimeout(
        () => {
          triggerChordByStyle({
            style: playbackStyle,
            instrument: audioInstrument,
            notes: lockedNotes,
            duration: noteDuration,
            attack,
            decay,
            velocity: effectiveVelocity,
          });
        },
        Math.max(0, (index * chordDurationSeconds + timingJitter) * 1000),
      );

      scheduledPlaybackTimeouts.push(timeoutId);
    }
  });
};
