import type { AudioEngine } from '../audioEngine';

export type AudioEngineScope = {
  engine: AudioEngine;
  attach: () => void;
  detach: () => void;
  run: <T>(work: () => T) => T;
  runAsync: <T>(work: () => Promise<T>) => Promise<T>;
};

export type AudioEngineRegistry = {
  getAudioEngine: () => AudioEngine;
  setAudioEngine: (engine: AudioEngine) => void;
  resetAudioEngine: () => void;
  createAudioEngineScope: (engine?: AudioEngine) => AudioEngineScope;
};

export const createAudioEngineRegistry = (createEngine: () => AudioEngine): AudioEngineRegistry => {
  let activeAudioEngine: AudioEngine | null = null;

  const getAudioEngine = (): AudioEngine => {
    if (!activeAudioEngine) {
      activeAudioEngine = createEngine();
    }

    return activeAudioEngine;
  };

  const setAudioEngine = (engine: AudioEngine): void => {
    activeAudioEngine = engine;
  };

  const resetAudioEngine = (): void => {
    activeAudioEngine = null;
  };

  const createAudioEngineScope = (engine: AudioEngine = createEngine()): AudioEngineScope => {
    let previousAttachedEngine: AudioEngine | null = null;
    let isAttached = false;

    const attach = (): void => {
      previousAttachedEngine = activeAudioEngine;
      isAttached = true;
      setAudioEngine(engine);
    };

    const detach = (): void => {
      if (!isAttached) {
        return;
      }

      if (activeAudioEngine === engine) {
        activeAudioEngine = previousAttachedEngine;
      }

      previousAttachedEngine = null;
      isAttached = false;
    };

    const run = <T>(work: () => T): T => {
      const previousEngine = activeAudioEngine;
      activeAudioEngine = engine;

      try {
        return work();
      } finally {
        activeAudioEngine = previousEngine;
      }
    };

    const runAsync = async <T>(work: () => Promise<T>): Promise<T> => {
      const previousEngine = activeAudioEngine;
      activeAudioEngine = engine;

      try {
        return await work();
      } finally {
        activeAudioEngine = previousEngine;
      }
    };

    return {
      engine,
      attach,
      detach,
      run,
      runAsync,
    };
  };

  return {
    getAudioEngine,
    setAudioEngine,
    resetAudioEngine,
    createAudioEngineScope,
  };
};
