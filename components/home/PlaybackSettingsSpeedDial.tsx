'use client';

import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import PianoIcon from '@mui/icons-material/Piano';
import SettingsIcon from '@mui/icons-material/Settings';
import TuneIcon from '@mui/icons-material/Tune';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Slider,
  SpeedDial,
  SpeedDialAction,
  Stack,
  Switch,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useState } from 'react';

import { playChordVoicing } from '../../lib/audio';
import type { PlaybackStyle } from '../../lib/audio';
import EnvelopeControls from './EnvelopeControls';

type PreviewVoicing = {
  leftHand: string[];
  rightHand: string[];
};

type PlaybackSettingsSpeedDialProps = {
  playbackStyle: PlaybackStyle;
  onPlaybackStyleChange: (value: PlaybackStyle) => void;
  attack: number;
  onAttackChange: (value: number) => void;
  decay: number;
  onDecayChange: (value: number) => void;
  padVelocity: number;
  onPadVelocityChange: (value: number) => void;
  padSwing: number;
  onPadSwingChange: (value: number) => void;
  padLatchMode: boolean;
  onPadLatchModeChange: (value: boolean) => void;
  tempoBpm: number;
  previewVoicing?: PreviewVoicing;
  position?: 'inline' | 'modal';
};

export default function PlaybackSettingsSpeedDial({
  playbackStyle,
  onPlaybackStyleChange,
  attack,
  onAttackChange,
  decay,
  onDecayChange,
  padVelocity,
  onPadVelocityChange,
  padSwing,
  onPadSwingChange,
  padLatchMode,
  onPadLatchModeChange,
  tempoBpm,
  previewVoicing,
  position = 'inline',
}: PlaybackSettingsSpeedDialProps) {
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<'playback' | 'envelope' | 'pads' | null>(null);

  const closeDialog = () => setActiveDialog(null);
  const canPreview = Boolean(previewVoicing);

  const previewSound = () => {
    if (!previewVoicing) {
      return;
    }

    void playChordVoicing({
      leftHand: previewVoicing.leftHand,
      rightHand: previewVoicing.rightHand,
      tempoBpm,
      playbackStyle,
      attack,
      decay,
      velocity: padVelocity,
    });
  };

  return (
    <>
      <Box
        sx={{
          position: 'relative',
          width: 44,
          height: 44,
          alignSelf: position === 'modal' ? 'flex-end' : 'auto',
        }}
      >
        <SpeedDial
          ariaLabel="Playback settings"
          icon={<SettingsIcon />}
          direction="down"
          open={isSpeedDialOpen}
          onOpen={() => setIsSpeedDialOpen(true)}
          onClose={() => setIsSpeedDialOpen(false)}
          FabProps={{
            size: 'small',
            color: 'default',
            sx: {
              bgcolor: 'transparent',
              color: '#60a5fa',
              border: '1px solid rgba(96, 165, 250, 0.9)',
              boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.14), 0 8px 20px rgba(15, 23, 42, 0.18)',
              backdropFilter: 'blur(6px)',
              '&:hover': {
                bgcolor: 'rgba(96, 165, 250, 0.08)',
                borderColor: 'rgba(147, 197, 253, 1)',
                boxShadow: '0 0 0 1px rgba(37, 99, 235, 0.24), 0 10px 22px rgba(15, 23, 42, 0.22)',
              },
            },
          }}
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            '& .MuiSpeedDial-actions': {
              pr: 0.25,
            },
          }}
        >
          <SpeedDialAction
            icon={<GraphicEqIcon />}
            tooltipTitle="Playback"
            onClick={() => {
              setActiveDialog('playback');
              setIsSpeedDialOpen(false);
            }}
          />
          <SpeedDialAction
            icon={<TuneIcon />}
            tooltipTitle="Envelope"
            onClick={() => {
              setActiveDialog('envelope');
              setIsSpeedDialOpen(false);
            }}
          />
          <SpeedDialAction
            icon={<PianoIcon />}
            tooltipTitle="Pads"
            onClick={() => {
              setActiveDialog('pads');
              setIsSpeedDialOpen(false);
            }}
          />
        </SpeedDial>
      </Box>

      <Dialog open={activeDialog === 'playback'} onClose={closeDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Playback Settings</DialogTitle>
        <DialogContent>
          <ToggleButtonGroup
            size="small"
            color="primary"
            exclusive
            value={playbackStyle}
            onChange={(_, nextValue: PlaybackStyle | null) => {
              if (nextValue) {
                onPlaybackStyleChange(nextValue);
              }
            }}
            aria-label="Playback style"
            fullWidth
          >
            <ToggleButton value="strum" aria-label="Strum playback">
              Strum
            </ToggleButton>
            <ToggleButton value="block" aria-label="Block playback">
              Block
            </ToggleButton>
          </ToggleButtonGroup>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="contained" onClick={previewSound} disabled={!canPreview}>
              Test sound
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'envelope'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Envelope Settings</DialogTitle>
        <DialogContent>
          <EnvelopeControls
            attack={attack}
            onAttackChange={onAttackChange}
            decay={decay}
            onDecayChange={onDecayChange}
            direction="column"
          />
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button variant="contained" onClick={previewSound} disabled={!canPreview}>
              Test sound
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      <Dialog open={activeDialog === 'pads'} onClose={closeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Pad Settings</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Velocity: {Math.round(padVelocity)}%
              </Typography>
              <Slider
                size="small"
                value={padVelocity}
                onChange={(_, value) => onPadVelocityChange(value as number)}
                min={20}
                max={127}
                step={1}
                aria-label="Pad velocity"
              />
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Swing: {padSwing}%
              </Typography>
              <Slider
                size="small"
                value={padSwing}
                onChange={(_, value) => onPadSwingChange(value as number)}
                min={0}
                max={100}
                step={1}
                aria-label="Pad swing"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={padLatchMode}
                  onChange={(event) => onPadLatchModeChange(event.target.checked)}
                />
              }
              label="Latch mode"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="contained" onClick={previewSound} disabled={!canPreview}>
                Test sound
              </Button>
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
}
