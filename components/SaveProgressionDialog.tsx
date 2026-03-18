'use client';

import { useState } from 'react';
import {
  Autocomplete,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';

import { createProgression } from '../lib/api/progressions';
import { getTagChipSx, PRESET_TAG_OPTIONS, sanitizeTags } from '../lib/tagMetadata';
import type { ChordItem, PianoVoicing } from '../lib/types';

type SaveProgressionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  chords: ChordItem[];
  pianoVoicings?: PianoVoicing[];
  feel?: string;
  scale?: string;
};

export default function SaveProgressionDialog({
  open,
  onClose,
  onSuccess,
  chords,
  pianoVoicings,
  feel: defaultFeel,
  scale: defaultScale,
}: SaveProgressionDialogProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await createProgression({
        title: title.trim(),
        chords,
        pianoVoicings,
        feel: defaultFeel,
        scale: defaultScale,
        notes: notes.trim() || undefined,
        tags: sanitizeTags(tags),
        isPublic,
      });

      // Reset form
      setTitle('');
      setNotes('');
      setTags([]);
      setIsPublic(false);

      onSuccess?.();
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to save progression');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Save Progression</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Late Night Groove"
            fullWidth
            disabled={loading}
            error={!!error && !title.trim()}
          />

          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Try with syncopated bass..."
            fullWidth
            multiline
            rows={3}
            disabled={loading}
          />

          <Autocomplete<string, true, false, true>
            multiple
            freeSolo
            options={PRESET_TAG_OPTIONS}
            value={tags}
            onChange={(_, value) => {
              setTags(sanitizeTags(value));
            }}
            filterSelectedOptions
            disabled={loading}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <Chip
                    key={key}
                    label={option}
                    size="small"
                    variant="outlined"
                    sx={getTagChipSx(option)}
                    {...tagProps}
                  />
                );
              })
            }
            renderInput={(params) => (
              <TextField
                {...params}
                label="Tags"
                placeholder="Select or type tags"
                helperText="Choose from preset genre/feeling tags or add your own"
                fullWidth
              />
            )}
          />

          <FormControlLabel
            control={
              <Switch
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={loading}
              />
            }
            label="Make public & shareable"
          />

          {error && <span style={{ color: 'red', fontSize: '0.875rem' }}>{error}</span>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={loading || !title.trim()}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
