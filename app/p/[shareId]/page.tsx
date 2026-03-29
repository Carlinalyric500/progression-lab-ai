'use client';

import { Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Button, Container, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import Link from 'next/link';

import ProgressionCard from '../../../features/progressions/components/ProgressionCard';
import { getSharedProgression } from '../../../features/progressions/api/progressionsApi';
import { playProgression } from '../../../domain/audio/audio';
import type { AudioInstrument } from '../../../domain/audio/audio';
import type { Progression } from '../../../lib/types';
import {
  getProgressionAutoResetMs,
  usePlaybackToggle,
} from '../../../features/generator/hooks/usePlaybackToggle';
import PlaybackToggleButton from '../../../features/generator/components/PlaybackToggleButton';
import PageSuspenseFallback from '../../../components/ui/PageSuspenseFallback';

type SharedProgressionResource = {
  read: () => Progression;
};

const sharedProgressionResourceCache = new Map<string, SharedProgressionResource>();

function createSharedProgressionResource(shareId: string): SharedProgressionResource {
  let status: 'pending' | 'success' | 'error' = 'pending';
  let result: Progression | Error;

  const suspender = getSharedProgression(shareId).then(
    (data) => {
      status = 'success';
      result = data;
    },
    (err) => {
      status = 'error';
      result = err instanceof Error ? err : new Error('Progression not found');
    },
  );

  return {
    read() {
      if (status === 'pending') {
        throw suspender;
      }
      if (status === 'error') {
        throw result;
      }
      return result as Progression;
    },
  };
}

function getSharedProgressionResource(shareId: string): SharedProgressionResource {
  const existing = sharedProgressionResourceCache.get(shareId);
  if (existing) {
    return existing;
  }

  const created = createSharedProgressionResource(shareId);
  sharedProgressionResourceCache.set(shareId, created);
  return created;
}

function SharedProgressionContent({ shareId }: { shareId: string }) {
  const progression = getSharedProgressionResource(shareId).read();
  const router = useRouter();
  const instrument: AudioInstrument = 'piano';
  const { playingId, initializingId, handlePlayToggle } = usePlaybackToggle();

  const handleOpen = () => {
    sessionStorage.setItem('loadedProgression', JSON.stringify(progression));
    router.push('/');
  };

  const handlePlay = async () => {
    const voicings = progression.pianoVoicings;
    if (!voicings?.length) {
      return;
    }

    await handlePlayToggle(
      `shared-page-${progression.id}`,
      () =>
        playProgression(voicings, undefined, undefined, undefined, undefined, {
          instrument,
        }),
      getProgressionAutoResetMs(voicings.length, 100),
    );
  };

  return (
    <Stack spacing={3}>
      <ProgressionCard
        progression={progression}
        canEdit={false}
        canDelete={false}
        onOpen={handleOpen}
        instrument={instrument}
      />

      {progression.pianoVoicings && progression.pianoVoicings.length > 0 ? (
        <Box sx={{ width: '100%' }}>
          <PlaybackToggleButton
            playTitle="Play progression"
            stopTitle="Stop progression"
            isPlaying={playingId === `shared-page-${progression.id}`}
            isInitializing={initializingId === `shared-page-${progression.id}`}
            onClick={() => {
              void handlePlay();
            }}
          />
        </Box>
      ) : null}

      <Button
        variant="contained"
        size="large"
        startIcon={<OpenInNewIcon />}
        onClick={handleOpen}
        fullWidth
        sx={{ py: 2 }}
      >
        Load into Lab
      </Button>
    </Stack>
  );
}

export default function SharedProgressionPage() {
  const params = useParams();
  const shareId = params?.shareId as string;

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={4}>
        <Box>
          <Link href="/" passHref>
            <Button variant="text">← Back to Lab</Button>
          </Link>
          <Typography variant="h3" component="h1" sx={{ mt: 2 }}>
            Shared Progression
          </Typography>
        </Box>
        <Suspense
          fallback={
            <PageSuspenseFallback
              message="Loading shared progression..."
              maxWidth="lg"
              padded={false}
            />
          }
        >
          <SharedProgressionContent shareId={shareId} />
        </Suspense>
      </Stack>
    </Container>
  );
}
