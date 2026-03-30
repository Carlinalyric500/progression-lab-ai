import * as Tone from 'tone';
import type { AudioEngine } from './audioEngine';
import { loadDrumPattern, normalizeDrumPatternPath } from './engine/DrumPatternRepository';
import { createEffectsChain } from './engine/EffectsChain';
import { createAudioEngineRegistry, type AudioEngineScope } from './engine/AudioEngineRegistry';
import { createAudioTimelineState } from './engine/AudioTimelineState';
import { createMetronomePlayback } from './engine/MetronomePlayback';
import { createMetronomeSynthBank } from './engine/MetronomeSynthBank';
import { createProgressionPlayback } from './engine/ProgressionPlayback';
import { createSamplerBank } from './engine/SamplerBank';
import { ensureAudioStarted, stopAllAudioPlayback } from './engine/TransportLifecycle';

export type {
  AudioEngine,
  AudioInstrument,
  MetronomeSource,
  PlayChordVoicingParams,
  PlayChordPatternParams,
  PlayMetronomePulseOptions,
  PlaybackRegister,
  PlaybackStyle,
  PlayProgressionOptions,
  ProgressionVoicing,
} from './audioEngine';
export type { PadPattern, TimeSignature } from '../music/padPattern';
export { PAD_PATTERN_LABELS, TIME_SIGNATURE_LABELS } from '../music/padPattern';

export const createToneAudioEngine = (): AudioEngine => {
  const timelineState = createAudioTimelineState();
  const metronomeSynthBank = createMetronomeSynthBank();
  const effectsChain = createEffectsChain();
  const samplerBank = createSamplerBank({
    connectSamplerToCurrentOutput: effectsChain.connectSamplerToCurrentOutput,
    ensureReverbReady: effectsChain.ensureReverbReady,
  });

  const { ensurePianoSamplerLoaded, ensureRhodesSamplerLoaded } = samplerBank;

  const startAudio = async (): Promise<void> => {
    await ensureAudioStarted();
  };

  const stopAllAudio = (): void => {
    const { pianoSampler, rhodesSampler } = samplerBank.getSamplerRefs();

    stopAllAudioPlayback({
      scheduledPlaybackTimeouts: timelineState.getScheduledPlaybackTimeouts(),
      setScheduledPlaybackTimeouts: timelineState.setScheduledPlaybackTimeouts,
      activeMetronomePulseTimeouts: timelineState.getActiveMetronomePulseTimeouts(),
      setActiveMetronomePulseTimeouts: timelineState.setActiveMetronomePulseTimeouts,
      activePart: timelineState.getActivePart(),
      setActivePart: timelineState.setActivePart,
      metronomeLoop: timelineState.getMetronomeLoop(),
      setMetronomeLoop: timelineState.setMetronomeLoop,
      setMetronomeClickBeat: timelineState.setMetronomeClickBeat,
      pianoSampler,
      rhodesSampler,
      releaseMetronomeSynths: metronomeSynthBank.releaseAll,
    });
  };

  const metronomePlayback = createMetronomePlayback({
    startAudio,
    synthBank: metronomeSynthBank,
    normalizeDrumPatternPath,
    loadPattern: loadDrumPattern,
    loopState: {
      getMetronomeLoop: timelineState.getMetronomeLoop,
      setMetronomeLoop: timelineState.setMetronomeLoop,
      getMetronomeClickBeat: timelineState.getMetronomeClickBeat,
      setMetronomeClickBeat: timelineState.setMetronomeClickBeat,
      getActiveMetronomePulseTimeouts: timelineState.getActiveMetronomePulseTimeouts,
      setActiveMetronomePulseTimeouts: timelineState.setActiveMetronomePulseTimeouts,
    },
  });

  const { playMetronomePulse, playMetronomeClick, startMetronomeLoop } = metronomePlayback;

  const progressionPlayback = createProgressionPlayback({
    startAudio,
    stopAllAudio,
    ensureRhodesSamplerLoaded,
    ensurePianoSamplerLoaded,
    startMetronomeLoop,
    partState: {
      getActivePart: timelineState.getActivePart,
      setActivePart: timelineState.setActivePart,
    },
    timeoutState: {
      getScheduledPlaybackTimeouts: timelineState.getScheduledPlaybackTimeouts,
      setScheduledPlaybackTimeouts: timelineState.setScheduledPlaybackTimeouts,
    },
  });

  const { playChordVoicing, playProgression, playChordPattern } = progressionPlayback;

  return {
    ...effectsChain,
    startAudio,
    playMetronomeClick,
    playMetronomePulse,
    stopAllAudio,
    playChordVoicing,
    playProgression,
    playChordPattern,
  };
};

export type { AudioEngineScope };

const audioEngineRegistry = createAudioEngineRegistry(createToneAudioEngine);

export const getAudioEngine = (): AudioEngine => audioEngineRegistry.getAudioEngine();

export const setAudioEngine = (engine: AudioEngine): void => {
  audioEngineRegistry.setAudioEngine(engine);
};

export const resetAudioEngine = (): void => {
  audioEngineRegistry.resetAudioEngine();
};

export const createAudioEngineScope = (engine?: AudioEngine): AudioEngineScope => {
  return audioEngineRegistry.createAudioEngineScope(engine);
};

// Effects control delegation
export const setReverbWet: AudioEngine['setReverbWet'] = (wet) =>
  getAudioEngine().setReverbWet(wet);
export const setChorusWet: AudioEngine['setChorusWet'] = (wet) =>
  getAudioEngine().setChorusWet(wet);
export const setReverbRoomSize: AudioEngine['setReverbRoomSize'] = (roomSize) =>
  getAudioEngine().setReverbRoomSize(roomSize);
export const setReverbEnabled: AudioEngine['setReverbEnabled'] = (enabled) =>
  getAudioEngine().setReverbEnabled(enabled);
export const setChorusEnabled: AudioEngine['setChorusEnabled'] = (enabled) =>
  getAudioEngine().setChorusEnabled(enabled);
export const setChorusFrequency: AudioEngine['setChorusFrequency'] = (value) =>
  getAudioEngine().setChorusFrequency(value);
export const setChorusDelayTime: AudioEngine['setChorusDelayTime'] = (value) =>
  getAudioEngine().setChorusDelayTime(value);
export const setChorusDepth: AudioEngine['setChorusDepth'] = (value) =>
  getAudioEngine().setChorusDepth(value);
export const setFeedbackDelayEnabled: AudioEngine['setFeedbackDelayEnabled'] = (enabled) =>
  getAudioEngine().setFeedbackDelayEnabled(enabled);
export const setFeedbackDelayWet: AudioEngine['setFeedbackDelayWet'] = (wet) =>
  getAudioEngine().setFeedbackDelayWet(wet);
export const setFeedbackDelayTime: AudioEngine['setFeedbackDelayTime'] = (value) =>
  getAudioEngine().setFeedbackDelayTime(value);
export const setFeedbackDelayFeedback: AudioEngine['setFeedbackDelayFeedback'] = (value) =>
  getAudioEngine().setFeedbackDelayFeedback(value);
export const setTremoloEnabled: AudioEngine['setTremoloEnabled'] = (enabled) =>
  getAudioEngine().setTremoloEnabled(enabled);
export const setTremoloWet: AudioEngine['setTremoloWet'] = (wet) =>
  getAudioEngine().setTremoloWet(wet);
export const setTremoloFrequency: AudioEngine['setTremoloFrequency'] = (value) =>
  getAudioEngine().setTremoloFrequency(value);
export const setTremoloDepth: AudioEngine['setTremoloDepth'] = (value) =>
  getAudioEngine().setTremoloDepth(value);
export const setVibratoEnabled: AudioEngine['setVibratoEnabled'] = (enabled) =>
  getAudioEngine().setVibratoEnabled(enabled);
export const setVibratoWet: AudioEngine['setVibratoWet'] = (wet) =>
  getAudioEngine().setVibratoWet(wet);
export const setVibratoFrequency: AudioEngine['setVibratoFrequency'] = (value) =>
  getAudioEngine().setVibratoFrequency(value);
export const setVibratoDepth: AudioEngine['setVibratoDepth'] = (value) =>
  getAudioEngine().setVibratoDepth(value);
export const setPhaserEnabled: AudioEngine['setPhaserEnabled'] = (enabled) =>
  getAudioEngine().setPhaserEnabled(enabled);
export const setPhaserWet: AudioEngine['setPhaserWet'] = (wet) =>
  getAudioEngine().setPhaserWet(wet);
export const setPhaserFrequency: AudioEngine['setPhaserFrequency'] = (value) =>
  getAudioEngine().setPhaserFrequency(value);
export const setPhaserOctaves: AudioEngine['setPhaserOctaves'] = (value) =>
  getAudioEngine().setPhaserOctaves(value);
export const setPhaserQ: AudioEngine['setPhaserQ'] = (value) => getAudioEngine().setPhaserQ(value);

// Lifecycle delegation
export const startAudio: AudioEngine['startAudio'] = () => getAudioEngine().startAudio();
export const stopAllAudio: AudioEngine['stopAllAudio'] = () => getAudioEngine().stopAllAudio();
export const isAudioInitialized = (): boolean => Tone.context.state === 'running';

// Playback delegation
export const playMetronomeClick: AudioEngine['playMetronomeClick'] = (volume, isDownbeat) =>
  getAudioEngine().playMetronomeClick(volume, isDownbeat);
export const playMetronomePulse: AudioEngine['playMetronomePulse'] = (volume, isDownbeat, opts) =>
  getAudioEngine().playMetronomePulse(volume, isDownbeat, opts);
export const playChordVoicing: AudioEngine['playChordVoicing'] = (params) =>
  getAudioEngine().playChordVoicing(params);
export const playProgression: AudioEngine['playProgression'] = (
  voicings,
  tempoBpm,
  playbackStyle,
  attack,
  decay,
  opts,
) => getAudioEngine().playProgression(voicings, tempoBpm, playbackStyle, attack, decay, opts);
export const playChordPattern: AudioEngine['playChordPattern'] = (params) =>
  getAudioEngine().playChordPattern(params);

export const getAudioClockSeconds = (): number => Tone.now();
