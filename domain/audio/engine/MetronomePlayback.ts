import * as Tone from 'tone';
import type { MetronomeSource, PlayMetronomePulseOptions } from '../audioEngine';
import type { TimeSignature } from '../../music/padPattern';
import { TIME_SIGNATURE_BEATS_PER_BAR } from '../../music/padPattern';
import {
  clampUnitValue,
  getBeatDurationSeconds,
  inferFallbackDrumDurationBeats,
  normalizeTempoBpm,
} from './AudioMath';
import type { DrumPattern } from './DrumPatternRepository';
import type { MetronomeSynthBank } from './MetronomeSynthBank';

type LoopState = {
  getMetronomeLoop: () => Tone.Loop | null;
  setMetronomeLoop: (loop: Tone.Loop | null) => void;
  getMetronomeClickBeat: () => number;
  setMetronomeClickBeat: (beat: number) => void;
  getActiveMetronomePulseTimeouts: () => ReturnType<typeof setTimeout>[];
  setActiveMetronomePulseTimeouts: (timeouts: ReturnType<typeof setTimeout>[]) => void;
};

type CreateMetronomePlaybackParams = {
  startAudio: () => Promise<void>;
  synthBank: MetronomeSynthBank;
  normalizeDrumPatternPath: (path: string | null | undefined) => string | null;
  loadPattern: (path: string) => Promise<DrumPattern | null>;
  loopState: LoopState;
};

export type MetronomePlayback = {
  playMetronomePulse: (
    volume: number,
    isDownbeat: boolean,
    opts?: PlayMetronomePulseOptions,
  ) => Promise<void>;
  playMetronomeClick: (volume: number, isDownbeat: boolean) => Promise<void>;
  startMetronomeLoop: (
    tempoBpm: number,
    timeSignature: TimeSignature,
    volume: number,
    totalDurationSeconds: number,
    source: MetronomeSource,
    drumPath: string | null,
  ) => void;
};

export const createMetronomePlayback = ({
  startAudio,
  synthBank,
  normalizeDrumPatternPath,
  loadPattern,
  loopState,
}: CreateMetronomePlaybackParams): MetronomePlayback => {
  const playMetronomePulse = async (
    volume: number,
    isDownbeat: boolean,
    opts?: PlayMetronomePulseOptions,
  ): Promise<void> => {
    await startAudio();

    const source: MetronomeSource = opts?.source ?? 'click';
    const normalizedVolume = clampUnitValue(volume);
    if (normalizedVolume <= 0) {
      return;
    }

    if (source === 'click') {
      const synth = synthBank.getClickSynth();
      synth.volume.value = Tone.gainToDb(normalizedVolume * 0.45);
      synth.triggerAttackRelease(isDownbeat ? 'C6' : 'A5', '32n', Tone.now());
      return;
    }

    const drumPath = normalizeDrumPatternPath(opts?.drumPath);
    if (!drumPath) {
      const synth = synthBank.getClickSynth();
      synth.volume.value = Tone.gainToDb(normalizedVolume * 0.45);
      synth.triggerAttackRelease(isDownbeat ? 'C6' : 'A5', '32n', Tone.now());
      return;
    }

    const pattern = await loadPattern(drumPath);
    if (!pattern) {
      const synth = synthBank.getClickSynth();
      synth.volume.value = Tone.gainToDb(normalizedVolume * 0.45);
      synth.triggerAttackRelease(isDownbeat ? 'C6' : 'A5', '32n', Tone.now());
      return;
    }

    const tempo = normalizeTempoBpm(opts?.tempoBpm);
    const beatDurationSeconds = getBeatDurationSeconds(tempo);
    const beatIndex = Math.max(0, opts?.beatIndex ?? 0);
    const patternDuration = Math.max(
      pattern.durationBeats,
      inferFallbackDrumDurationBeats(opts?.timeSignature ?? '4/4'),
    );
    const beatStartInPattern = beatIndex % patternDuration;
    const now = Tone.now();

    pattern.events.forEach((event) => {
      const eventBeatInPattern =
        ((event.beat % patternDuration) + patternDuration) % patternDuration;
      if (eventBeatInPattern < beatStartInPattern || eventBeatInPattern >= beatStartInPattern + 1) {
        return;
      }

      const offsetBeats = eventBeatInPattern - beatStartInPattern;
      const eventTime = now + offsetBeats * beatDurationSeconds;
      const eventDurationSeconds = Math.max(0.02, event.durationBeats * beatDurationSeconds);
      synthBank.triggerDrumHit(
        event.midi,
        eventTime,
        eventDurationSeconds,
        event.velocity * normalizedVolume,
      );
    });
  };

  const playMetronomeClick = async (volume: number, isDownbeat: boolean): Promise<void> => {
    await playMetronomePulse(volume, isDownbeat, { source: 'click' });
  };

  const startMetronomeLoop = (
    tempoBpm: number,
    timeSignature: TimeSignature,
    volume: number,
    totalDurationSeconds: number,
    source: MetronomeSource,
    drumPath: string | null,
  ): void => {
    const singleBeatSeconds = getBeatDurationSeconds(tempoBpm);
    const beatsPerBar = TIME_SIGNATURE_BEATS_PER_BAR[timeSignature];
    const totalBeats = Math.ceil(totalDurationSeconds / singleBeatSeconds);
    loopState.setMetronomeClickBeat(0);

    if (source === 'drum' && drumPath) {
      void loadPattern(drumPath);
    }

    const metronomeLoop = new Tone.Loop((time) => {
      const currentBeat = loopState.getMetronomeClickBeat();
      if (currentBeat >= totalBeats) {
        return;
      }

      const isDownbeat = currentBeat % beatsPerBar === 0;
      if (source === 'click') {
        const synth = synthBank.getClickSynth();
        synth.volume.value = volume > 0 ? Tone.gainToDb(volume * 0.45) : -Infinity;
        synth.triggerAttackRelease(isDownbeat ? 'C6' : 'A5', '32n', time);
      } else {
        const beatIndex = currentBeat;
        const delayMs = Math.max(0, (time - Tone.now()) * 1000);
        const timeoutId = setTimeout(() => {
          loopState.setActiveMetronomePulseTimeouts(
            loopState.getActiveMetronomePulseTimeouts().filter((id) => id !== timeoutId),
          );
          void playMetronomePulse(volume, isDownbeat, {
            source,
            drumPath,
            timeSignature,
            tempoBpm,
            beatIndex,
          });
        }, delayMs);

        loopState.setActiveMetronomePulseTimeouts([
          ...loopState.getActiveMetronomePulseTimeouts(),
          timeoutId,
        ]);
      }

      loopState.setMetronomeClickBeat(currentBeat + 1);
    }, singleBeatSeconds);

    loopState.setMetronomeLoop(metronomeLoop);
    metronomeLoop.start(0);
  };

  return {
    playMetronomePulse,
    playMetronomeClick,
    startMetronomeLoop,
  };
};
