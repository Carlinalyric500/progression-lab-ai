import type * as Tone from 'tone';
import type { PlaybackStyle } from '../audioEngine';
import { triggerChordByStyle } from './ChordTrigger';

type ScheduledChordVelocityParams = {
  velocity?: number;
  velocityScale?: number;
  velocityJitter: number;
};

type TriggerScheduledChordEventParams = {
  style: PlaybackStyle;
  instrument: Tone.Sampler;
  notes: string[];
  duration: Tone.Unit.Time;
  eventTime: number;
  attack?: number;
  decay?: number;
  velocity?: number;
  velocityScale?: number;
  humanize: number;
  symmetricTiming: boolean;
  getTimingOffset: (params: { humanize: number; symmetric: boolean }) => number;
  getVelocityJitter: (humanize: number) => number;
  toEffectiveVelocity: (params: ScheduledChordVelocityParams) => number | undefined;
};

export const triggerScheduledChordEvent = ({
  style,
  instrument,
  notes,
  duration,
  eventTime,
  attack,
  decay,
  velocity,
  velocityScale,
  humanize,
  symmetricTiming,
  getTimingOffset,
  getVelocityJitter,
  toEffectiveVelocity,
}: TriggerScheduledChordEventParams): void => {
  if (notes.length === 0) {
    return;
  }

  const timingOffset = getTimingOffset({ humanize, symmetric: symmetricTiming });
  const effectiveVelocity = toEffectiveVelocity({
    velocity,
    velocityScale,
    velocityJitter: getVelocityJitter(humanize),
  });

  const startTime =
    symmetricTiming && timingOffset !== 0
      ? eventTime + timingOffset
      : !symmetricTiming && timingOffset > 0
        ? eventTime + timingOffset
        : eventTime;

  triggerChordByStyle({
    style,
    instrument,
    notes,
    duration,
    startTime,
    attack,
    decay,
    velocity: effectiveVelocity,
  });
};
