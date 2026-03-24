import { useEffect, useState, useCallback } from 'react';
import * as Tone from 'tone';
import { stopAllAudio } from '../../lib/audio';

/**
 * Hook that provides play/stop toggle functionality with a single active playback state.
 * Automatically resets to play state when audio finishes.
 *
 * Usage:
 *   const { isPlaying, playingId, handlePlayToggle } = usePlaybackToggle();
 *
 *   <Button onClick={() => handlePlayToggle(id, () => playProgression(...))}>
 *     {playingId === id ? 'Stop' : 'Play'}
 *   </Button>
 */
export function usePlaybackToggle() {
  const [playingId, setPlayingId] = useState<string | number | null>(null);

  const handlePlayToggle = useCallback(
    (id: string | number, playCallback: () => void) => {
      if (playingId === id) {
        // Currently playing this ID - stop it
        stopAllAudio();
        setPlayingId(null);
      } else {
        // Not playing or playing different ID - play this one
        playCallback();
        setPlayingId(id);
      }
    },
    [playingId],
  );

  // Listen for when Tone.js Transport stops (audio finishes playing)
  useEffect(() => {
    const handleTransportStop = () => {
      setPlayingId(null);
    };

    Tone.Transport.on('stop', handleTransportStop);

    return () => {
      Tone.Transport.off('stop', handleTransportStop);
    };
  }, []);

  return {
    isPlaying: playingId !== null,
    playingId,
    handlePlayToggle,
  };
}
