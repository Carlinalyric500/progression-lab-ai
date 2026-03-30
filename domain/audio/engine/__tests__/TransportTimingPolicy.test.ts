import { buildTransportTiming } from '../TransportTimingPolicy';

describe('TransportTimingPolicy', () => {
  it('normalizes tempo and maps time signature for transport', () => {
    const timing = buildTransportTiming({ tempoBpm: 127.6, timeSignature: '3/4' });

    expect(timing.normalizedTempo).toBe(128);
    expect(timing.transportTimeSignature).toBe(3);
    expect(timing.singleBeatSeconds).toBeCloseTo(60 / 128, 8);
  });

  it('falls back to default tempo when input is invalid', () => {
    const timing = buildTransportTiming({ tempoBpm: Number.NaN, timeSignature: '6/8' });

    expect(timing.normalizedTempo).toBe(100);
    expect(timing.transportTimeSignature).toBe(6);
    expect(timing.singleBeatSeconds).toBeCloseTo(0.6, 8);
  });
});
