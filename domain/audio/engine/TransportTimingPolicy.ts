import { TIME_SIGNATURE_NUMERATOR } from '../../music/padPattern';
import type { TimeSignature } from '../../music/padPattern';
import { normalizeTempoBpm } from './AudioMath';

type BuildTransportTimingParams = {
  tempoBpm?: number;
  timeSignature: TimeSignature;
};

export type TransportTiming = {
  normalizedTempo: number;
  transportTimeSignature: number;
  singleBeatSeconds: number;
};

export const buildTransportTiming = ({
  tempoBpm,
  timeSignature,
}: BuildTransportTimingParams): TransportTiming => {
  const normalizedTempo = normalizeTempoBpm(tempoBpm);
  return {
    normalizedTempo,
    transportTimeSignature: TIME_SIGNATURE_NUMERATOR[timeSignature],
    singleBeatSeconds: 60 / normalizedTempo,
  };
};
