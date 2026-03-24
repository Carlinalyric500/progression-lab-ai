'use client';

import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import { Button, IconButton } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

type PlaybackToggleButtonProps = {
  isPlaying: boolean;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  playTitle?: string;
  stopTitle?: string;
};

const getPlayToggleButtonSx = (theme: Theme) => ({
  borderWidth: 1.5,
  borderStyle: 'solid',
  color: theme.palette.primary.main,
  borderColor: alpha(theme.palette.primary.main, 0.9),
  backgroundColor: 'transparent',
  '&:hover': {
    borderColor: theme.palette.primary.main,
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    borderWidth: 1.5,
  },
});

/**
 * Shared play/stop button that supports icon-only mode or an optional text label.
 */
export default function PlaybackToggleButton({
  isPlaying,
  onClick,
  disabled = false,
  label,
  playTitle = 'Play',
  stopTitle = 'Stop',
}: PlaybackToggleButtonProps) {
  const icon = isPlaying ? <StopIcon /> : <PlayArrowIcon />;
  const title = isPlaying ? stopTitle : playTitle;

  if (label) {
    return (
      <Button
        variant="outlined"
        size="small"
        title={title}
        onClick={onClick}
        disabled={disabled}
        startIcon={icon}
        sx={(theme) => ({
          ...getPlayToggleButtonSx(theme),
          textTransform: 'none',
          fontWeight: 600,
        })}
      >
        {label}
      </Button>
    );
  }

  return (
    <IconButton
      title={title}
      onClick={onClick}
      disabled={disabled}
      size="small"
      sx={(theme) => ({
        ...getPlayToggleButtonSx(theme),
        p: 0.625,
        borderRadius: 1,
      })}
    >
      {icon}
    </IconButton>
  );
}
