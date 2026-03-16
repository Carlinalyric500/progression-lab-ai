/** @jest-environment node */

var mockCreate = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    responses: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  }));
});

import { POST } from './route';

const validModelPayload = {
  inputSummary: {
    seedChords: ['Fmaj7', 'F#m7'],
    mood: 'dreamy',
    mode: 'lydian',
    genre: 'piano house',
    instrument: 'both',
    adventurousness: 'balanced',
  },
  nextChordSuggestions: [
    {
      chord: 'G7',
      romanNumeral: 'II7',
      functionExplanation: 'Secondary dominant that points to C.',
      tensionLevel: 3,
      confidence: 4,
      voicingHint: 'Use a tight top voice.',
      pianoVoicing: {
        leftHand: ['G2', 'D3'],
        rightHand: ['F3', 'B3', 'D4'],
      },
      guitarVoicing: {
        title: 'G7',
        position: 1,
        fingers: [
          { string: 6, fret: 3, finger: '2' },
          { string: 5, fret: 2, finger: '1' },
          { string: 1, fret: 1, finger: '1' },
        ],
        barres: [],
      },
    },
  ],
  progressionIdeas: [
    {
      label: 'Lifted loop',
      chords: ['Fmaj7', 'G7', 'Am7', 'Cmaj7'],
      feel: 'Airy movement',
      performanceTip: 'Slightly delay the last chord.',
    },
  ],
  structureSuggestions: [
    {
      section: 'verse',
      bars: 8,
      harmonicIdea: 'Keep bass sparse in the first 4 bars.',
    },
  ],
};

describe('POST /api/chord-suggestions', () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalConsoleError = console.error;

  beforeEach(() => {
    mockCreate.mockReset();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;

    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  it('returns 500 when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;

    const response = await POST({ json: async () => ({}) } as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: 'Missing OPENAI_API_KEY' });
  });

  it('returns parsed model response when OpenAI responds with valid JSON', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockResolvedValue({
      output_text: JSON.stringify(validModelPayload),
    });

    const response = await POST(
      {
        json: async () => ({
          seedChords: ['Fmaj7', 'F#m7'],
          mood: 'dreamy',
          mode: 'lydian',
          genre: 'piano house',
          instrument: 'both',
          adventurousness: 'balanced',
        }),
      } as never
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual(validModelPayload);
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('returns 500 when the model returns invalid JSON', async () => {
    process.env.OPENAI_API_KEY = 'test-key';
    mockCreate.mockResolvedValue({
      output_text: '{invalid json',
    });

    const response = await POST({ json: async () => ({}) } as never);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Model returned invalid JSON');
  });
});
