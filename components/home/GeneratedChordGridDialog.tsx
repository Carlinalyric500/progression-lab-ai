'use client';

import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

import { playChordVoicing, stopAllAudio } from '../../lib/audio';

type ChordGridEntry = {
  key: string;
  chord: string;
  source: string;
  leftHand: string[];
  rightHand: string[];
};

type GeneratedChordGridDialogProps = {
  open: boolean;
  onClose: () => void;
  tempoBpm: number;
  chords: ChordGridEntry[];
};

export default function GeneratedChordGridDialog({
  open,
  onClose,
  tempoBpm,
  chords,
}: GeneratedChordGridDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Generated chord grid</DialogTitle>
      <DialogContent dividers>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, minmax(0, 1fr))',
              sm: 'repeat(3, minmax(0, 1fr))',
              lg: 'repeat(4, minmax(0, 1fr))',
            },
            gap: 1.5,
          }}
        >
          {chords.map((entry) => (
            <Button
              key={entry.key}
              variant="outlined"
              onClick={() =>
                playChordVoicing({
                  leftHand: entry.leftHand,
                  rightHand: entry.rightHand,
                  tempoBpm,
                })
              }
              sx={{
                aspectRatio: '1 / 1',
                minHeight: { xs: 84, sm: 96 },
                borderRadius: 2,
                fontWeight: 700,
                fontSize: { xs: '0.95rem', sm: '1rem' },
                textTransform: 'none',
              }}
            >
              {entry.chord}
            </Button>
          ))}
        </Box>

        {chords.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            No generated piano voicings available.
          </Typography>
        ) : null}
      </DialogContent>

      <DialogActions>
        <Button onClick={stopAllAudio}>Stop audio</Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
