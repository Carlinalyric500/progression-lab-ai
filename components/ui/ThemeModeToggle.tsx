'use client';

import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
// import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import { IconButton, Stack, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { useThemeMode } from '../../lib/themeMode';

/**
 * Header action button that toggles between light and dark mode.
 */
export default function ThemeModeToggle() {
  const { t } = useTranslation('common');
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';
  const toggleTitle = isDark ? t('theme.switchToLightMode') : t('theme.switchToDarkMode');

  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title={toggleTitle}>
        <IconButton aria-label={toggleTitle} onClick={toggleMode}>
          {isDark ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
        </IconButton>
      </Tooltip>
      {/* <Tooltip title={`Preset: ${presetLabel}. Click to cycle presets.`}>
        <IconButton aria-label={`Theme preset ${presetLabel}`} onClick={cyclePreset}>
          <LayersOutlinedIcon />
        </IconButton>
      </Tooltip> */}
    </Stack>
  );
}
