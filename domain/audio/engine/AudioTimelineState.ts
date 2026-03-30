import * as Tone from 'tone';

export type AudioTimelineState = {
  getScheduledPlaybackTimeouts: () => ReturnType<typeof setTimeout>[];
  setScheduledPlaybackTimeouts: (timeouts: ReturnType<typeof setTimeout>[]) => void;
  getActiveMetronomePulseTimeouts: () => ReturnType<typeof setTimeout>[];
  setActiveMetronomePulseTimeouts: (timeouts: ReturnType<typeof setTimeout>[]) => void;
  getActivePart: () => Tone.Part | null;
  setActivePart: (part: Tone.Part | null) => void;
  getMetronomeLoop: () => Tone.Loop | null;
  setMetronomeLoop: (loop: Tone.Loop | null) => void;
  getMetronomeClickBeat: () => number;
  setMetronomeClickBeat: (beat: number) => void;
};

export const createAudioTimelineState = (): AudioTimelineState => {
  let scheduledPlaybackTimeouts: ReturnType<typeof setTimeout>[] = [];
  let activeMetronomePulseTimeouts: ReturnType<typeof setTimeout>[] = [];
  let activePart: Tone.Part | null = null;
  let metronomeLoop: Tone.Loop | null = null;
  let metronomeClickBeat = 0;

  return {
    getScheduledPlaybackTimeouts: () => scheduledPlaybackTimeouts,
    setScheduledPlaybackTimeouts: (timeouts) => {
      scheduledPlaybackTimeouts = timeouts;
    },
    getActiveMetronomePulseTimeouts: () => activeMetronomePulseTimeouts,
    setActiveMetronomePulseTimeouts: (timeouts) => {
      activeMetronomePulseTimeouts = timeouts;
    },
    getActivePart: () => activePart,
    setActivePart: (part) => {
      activePart = part;
    },
    getMetronomeLoop: () => metronomeLoop,
    setMetronomeLoop: (loop) => {
      metronomeLoop = loop;
    },
    getMetronomeClickBeat: () => metronomeClickBeat,
    setMetronomeClickBeat: (beat) => {
      metronomeClickBeat = beat;
    },
  };
};
