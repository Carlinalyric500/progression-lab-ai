'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
  IconButton,
  InputAdornment,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useTranslation } from 'react-i18next';

import AppTextField from '../../../components/ui/TextField';
import { useAppSnackbar } from '../../../components/providers/AppSnackbarProvider';
import { useAuth } from '../../../components/providers/AuthProvider';
import { getRandomTitleSuggestion } from '../../../lib/titlePhrases';

import { createProgression } from '../api/progressionsApi';
import type { ChordItem, GeneratorSnapshot, PianoVoicing } from '../../../lib/types';

type SaveProgressionDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  generatorSnapshot?: GeneratorSnapshot;
  chords?: ChordItem[];
  pianoVoicings?: PianoVoicing[];
  feel?: string;
  scale?: string;
  genre?: string;
};

type SaveProgressionFormData = {
  title: string;
  isPublic: boolean;
};

export default function SaveProgressionDialog({
  open,
  onClose,
  onSuccess,
  generatorSnapshot,
  chords,
  pianoVoicings,
  feel,
  scale,
  genre,
}: SaveProgressionDialogProps) {
  const { t } = useTranslation('common');
  const { showError, showSuccess } = useAppSnackbar();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<SaveProgressionFormData>({
    defaultValues: {
      title: '',
      isPublic: false,
    },
    mode: 'onChange',
  });

  // Generate random title and reset form when dialog state changes
  useEffect(() => {
    if (open) {
      setValue('title', getRandomTitleSuggestion());
    } else {
      reset();
    }
  }, [open, reset, setValue]);

  const handleRefreshTitle = () => {
    setValue('title', getRandomTitleSuggestion());
  };

  const onSubmit = async (data: SaveProgressionFormData) => {
    try {
      await createProgression({
        title: data.title.trim() || undefined,
        isPublic: isAdmin ? data.isPublic : false,
        ...(generatorSnapshot
          ? { generatorSnapshot }
          : { chords, pianoVoicings, feel, scale, genre }),
      });

      showSuccess(t('progressions.saveDialog.messages.saved'));
      onSuccess?.();
      onClose();
    } catch (err) {
      showError((err as Error).message || t('progressions.saveDialog.messages.saveFailed'));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('progressions.saveDialog.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }} component="form">
          <Controller
            name="title"
            control={control}
            rules={{
              maxLength: {
                value: 100,
                message: t('progressions.saveDialog.form.titleMaxLength'),
              },
            }}
            render={({ field, fieldState: { error } }) => (
              <AppTextField
                label={t('progressions.saveDialog.form.titleLabel')}
                {...field}
                placeholder={t('progressions.saveDialog.form.titlePlaceholder')}
                disabled={isSubmitting}
                error={!!error}
                helperText={error?.message}
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={handleRefreshTitle}
                          disabled={isSubmitting}
                          edge="end"
                          size="small"
                          aria-label={t('progressions.saveDialog.form.regenerateTitleAriaLabel')}
                        >
                          <RefreshIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            )}
          />

          {isAdmin ? (
            <Controller
              name="isPublic"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Stack spacing={0.5}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                        disabled={isSubmitting}
                      />
                    }
                    label={t('progressions.saveDialog.form.addToExamplesLabel')}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {t('progressions.saveDialog.form.addToExamplesHelperText')}
                  </Typography>
                </Stack>
              )}
            />
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          {t('progressions.saveDialog.actions.cancel')}
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isSubmitting || Object.keys(errors).length > 0}
        >
          {isSubmitting
            ? t('progressions.saveDialog.actions.saving')
            : t('progressions.saveDialog.actions.save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
