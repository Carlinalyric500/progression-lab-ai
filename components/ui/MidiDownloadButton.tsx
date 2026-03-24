'use client';

import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { Button, type ButtonProps } from '@mui/material';
import { useState } from 'react';

import type { PianoVoicing } from '../../lib/types';

/**
 * Props for the async MIDI download button wrapper.
 */
type MidiDownloadButtonProps = Omit<ButtonProps, 'children' | 'startIcon'> & {
  progressionName?: string;
  voicings?: PianoVoicing[];
  tempoBpm?: number;
  label?: string;
};

/**
 * Button that lazily imports MIDI generator code and downloads a progression file.
 * Can work in two modes:
 * 1. Pass progressionName/voicings for automatic MIDI generation
 * 2. Pass onClick for custom handling (backwards compatibility)
 */
export default function MidiDownloadButton({
  progressionName,
  voicings,
  tempoBpm,
  label = 'MIDI',
  disabled,
  onClick,
  ...rest
}: MidiDownloadButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const isAutoMode = progressionName !== undefined && voicings !== undefined;

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isAutoMode) {
      onClick?.(e);
      return;
    }

    if (isGenerating || voicings.length === 0) return;
    setIsGenerating(true);
    try {
      const { downloadProgressionMidi } = await import('../../lib/midi');
      downloadProgressionMidi(progressionName, voicings, tempoBpm);
    } finally {
      setIsGenerating(false);
    }
  };

  const isDisabled =
    disabled || (isAutoMode && ((isGenerating ?? false) || (voicings?.length ?? 0) === 0));

  return (
    <Button
      startIcon={<FileDownloadOutlinedIcon />}
      disabled={isDisabled}
      onClick={handleClick}
      {...rest}
    >
      {isAutoMode && isGenerating ? 'Generating…' : label}
    </Button>
  );
}
