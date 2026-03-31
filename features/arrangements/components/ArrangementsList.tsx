'use client';

import { useCallback, useEffect, useState } from 'react';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import RefreshIcon from '@mui/icons-material/Refresh';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AudioFileIcon from '@mui/icons-material/AudioFile';
import { Box, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

import { useAppSnackbar } from '../../../components/providers/AppSnackbarProvider';
import type { Arrangement } from '../../../lib/types';
import { downloadSessionPdf } from '../../../lib/pdf';
import {
  arrangementToPdfOptions,
  downloadArrangementMidi,
} from '../utils/arrangementDownloadUtils';
import { deleteArrangement, getMyArrangements } from '../api/arrangementsApi';

type Props = {
  onLoad: (arrangement: Arrangement) => void;
  refreshSignal?: number;
  onAvailabilityChange?: (hasAny: boolean) => void;
};

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'AbortError'
    : (error as { name?: string })?.name === 'AbortError';
}

function timeAgo(dateStr: string | Date, t: (key: string, options?: Record<string, unknown>) => string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return t('arrangements.list.meta.relative.justNow');
  if (minutes < 60) return t('arrangements.list.meta.relative.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('arrangements.list.meta.relative.hoursAgo', { count: hours });
  const days = Math.floor(hours / 24);
  return t('arrangements.list.meta.relative.daysAgo', { count: days });
}

export default function ArrangementsList({ onLoad, refreshSignal, onAvailabilityChange }: Props) {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const { showError, showSuccess } = useAppSnackbar();
  const isDarkMode = theme.palette.mode === 'dark';
  const [arrangements, setArrangements] = useState<Arrangement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null);
  const [downloadingMidiId, setDownloadingMidiId] = useState<string | null>(null);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setFetchError(null);
      try {
        const data = (await getMyArrangements(signal)) as Arrangement[];
        setArrangements(data);
        onAvailabilityChange?.(data.length > 0);
      } catch (err) {
        if (isAbortError(err)) {
          return;
        }

        setFetchError((err as Error).message || t('arrangements.list.errors.load'));
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [onAvailabilityChange],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);

    return () => {
      controller.abort();
    };
  }, [load, refreshSignal]);

  const handleDelete = useCallback(
    async (id: string, title: string) => {
      setDeletingId(id);
      try {
        await deleteArrangement(id);
        setArrangements((prev) => {
          const next = prev.filter((a) => a.id !== id);
          onAvailabilityChange?.(next.length > 0);
          return next;
        });
        showSuccess(t('arrangements.list.messages.deleted', { title }));
      } catch (err) {
        showError((err as Error).message || t('arrangements.list.errors.delete'));
      } finally {
        setDeletingId(null);
      }
    },
    [onAvailabilityChange, showError, showSuccess, t],
  );

  const handleDownloadPdf = useCallback(
    async (arrangement: Arrangement) => {
      setDownloadingPdfId(arrangement.id);
      try {
        const pdfOptions = arrangementToPdfOptions(arrangement);
        await downloadSessionPdf(pdfOptions);
      } catch (err) {
        showError((err as Error).message || t('arrangements.list.errors.downloadPdf'));
      } finally {
        setDownloadingPdfId(null);
      }
    },
    [showError, t],
  );

  const handleDownloadMidi = useCallback(
    (arrangement: Arrangement) => {
      setDownloadingMidiId(arrangement.id);
      try {
        downloadArrangementMidi(arrangement);
      } catch (err) {
        showError((err as Error).message || t('arrangements.list.errors.downloadMidi'));
      } finally {
        setDownloadingMidiId(null);
      }
    },
    [showError, t],
  );

  if (isLoading) {
    return (
      <Stack spacing={1}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} variant="rounded" height={52} sx={{ borderRadius: 1.5 }} />
        ))}
      </Stack>
    );
  }

  if (fetchError) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="error.main">
          {fetchError}
        </Typography>
        <Tooltip title={t('arrangements.list.actions.retry')}>
          <IconButton size="small" onClick={() => void load()}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    );
  }

  if (arrangements.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        {t('arrangements.list.empty')}
      </Typography>
    );
  }

  const rowBg = isDarkMode
    ? alpha(theme.palette.common.white, 0.04)
    : alpha(theme.palette.common.black, 0.03);
  const rowBorder = isDarkMode
    ? alpha(theme.palette.common.white, 0.08)
    : alpha(theme.palette.common.black, 0.08);
  const rowHoverBg = isDarkMode
    ? alpha(theme.palette.common.white, 0.07)
    : alpha(theme.palette.common.black, 0.06);

  return (
    <Stack spacing={0.75}>
      {arrangements.map((arr) => {
        const isDeleting = deletingId === arr.id;
        const meta = [
          t('arrangements.list.meta.tempoBpm', { value: arr.playbackSnapshot.tempoBpm }),
          arr.playbackSnapshot.timeSignature,
          t('arrangements.list.meta.bars', { count: arr.timeline.loopLengthBars }),
          t('arrangements.list.meta.events', { count: arr.timeline.events.length }),
        ].join(' · ');

        return (
          <Box
            key={arr.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 1,
              borderRadius: 1.5,
              border: `1px solid ${rowBorder}`,
              backgroundColor: rowBg,
              opacity: isDeleting ? 0.5 : 1,
              transition: 'background-color 120ms ease, opacity 150ms ease',
              '&:hover': { backgroundColor: rowHoverBg },
            }}
          >
            <MusicNoteIcon
              fontSize="small"
              sx={{
                color: alpha(theme.palette.common.white, isDarkMode ? 0.35 : 0.4),
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {arr.title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
                {meta} · {timeAgo(arr.updatedAt, t)}
              </Typography>
            </Box>
            <Tooltip title={t('arrangements.list.actions.downloadPdfTitle')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => void handleDownloadPdf(arr)}
                  disabled={deletingId === arr.id || downloadingPdfId === arr.id}
                  aria-label={t('arrangements.list.actions.downloadPdfAriaLabel', { title: arr.title })}
                  sx={{
                    color: theme.palette.info.main,
                    '&:hover': { backgroundColor: alpha(theme.palette.info.main, 0.1) },
                  }}
                >
                  {downloadingPdfId === arr.id ? (
                    <Box
                      component="span"
                      sx={{
                        display: 'block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: 'currentColor',
                        opacity: 0.55,
                      }}
                    />
                  ) : (
                    <FileDownloadIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('arrangements.list.actions.downloadMidiTitle')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => handleDownloadMidi(arr)}
                  disabled={deletingId === arr.id || downloadingMidiId === arr.id}
                  aria-label={t('arrangements.list.actions.downloadMidiAriaLabel', { title: arr.title })}
                  sx={{
                    color: theme.palette.success.main,
                    '&:hover': { backgroundColor: alpha(theme.palette.success.main, 0.1) },
                  }}
                >
                  {downloadingMidiId === arr.id ? (
                    <Box
                      component="span"
                      sx={{
                        display: 'block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: 'currentColor',
                        opacity: 0.55,
                      }}
                    />
                  ) : (
                    <AudioFileIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('arrangements.list.actions.loadTitle')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => onLoad(arr)}
                  disabled={isDeleting}
                  aria-label={t('arrangements.list.actions.loadAriaLabel', { title: arr.title })}
                  sx={{
                    color: theme.palette.primary.main,
                    '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.1) },
                  }}
                >
                  <PlayCircleOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={t('arrangements.list.actions.deleteTitle')}>
              <span>
                <IconButton
                  size="small"
                  onClick={() => void handleDelete(arr.id, arr.title)}
                  disabled={isDeleting}
                  aria-label={t('arrangements.list.actions.deleteAriaLabel', { title: arr.title })}
                  sx={{
                    color: theme.palette.error.main,
                    '&:hover': { backgroundColor: alpha(theme.palette.error.main, 0.1) },
                  }}
                >
                  {isDeleting ? (
                    <Box
                      component="span"
                      sx={{
                        display: 'block',
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        bgcolor: 'currentColor',
                        opacity: 0.55,
                      }}
                    />
                  ) : (
                    <DeleteOutlineIcon fontSize="small" />
                  )}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        );
      })}
    </Stack>
  );
}
