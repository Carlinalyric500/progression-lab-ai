'use client';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';

import type { CircleOfFifthsSuggestionMode } from '../../../../domain/music/circleOfFifths';

type CircleOfFifthsAccordionProps = {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  suggestionMode: CircleOfFifthsSuggestionMode;
  onSuggestionModeChange: (mode: CircleOfFifthsSuggestionMode) => void;
};

/**
 * Collapsible accordion containing the Circle of Fifths suggestion mode selector.
 * SRP: changes when the CoF suggestion UI or available modes change.
 */
export default function CircleOfFifthsAccordion({
  expanded,
  onExpandedChange,
  suggestionMode,
  onSuggestionModeChange,
}: CircleOfFifthsAccordionProps) {
  const { t } = useTranslation('generator');
  const theme = useTheme();
  const { appColors } = theme.palette;

  return (
    <Accordion
      disableGutters
      expanded={expanded}
      onChange={(_event, isExpanded) => onExpandedChange(isExpanded)}
      sx={{
        mt: 1.5,
        borderRadius: 1.5,
        bgcolor: appColors.surface.translucentPanel,
        border: `1px solid ${appColors.surface.translucentPanelBorder}`,
        '&:before': { display: 'none' },
        overflow: 'hidden',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-label={t('ui.chordGrid.suggestionModeAccordionLabel')}
        sx={{
          px: 1.25,
          minHeight: 0,
          '& .MuiAccordionSummary-content': { my: 1 },
        }}
      >
        <Typography variant="subtitle2">
          {t('ui.chordGrid.suggestionModeAccordionLabel')}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ px: 1.25, pb: 1.25, pt: 0.25 }}>
        <ToggleButtonGroup
          exclusive
          size="small"
          color="primary"
          fullWidth
          value={suggestionMode}
          onChange={(_event, mode: CircleOfFifthsSuggestionMode | null) => {
            if (mode) {
              onSuggestionModeChange(mode);
            }
          }}
          aria-label={t('ui.chordGrid.suggestionModeLabel')}
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: { xs: '0.72rem', sm: '0.8rem' },
              px: { xs: 0.75, sm: 1.25 },
              py: 0.7,
              whiteSpace: 'nowrap',
            },
          }}
        >
          <ToggleButton
            value="none"
            aria-label={t('ui.chordGrid.suggestionModeOff')}
          >
            {t('ui.chordGrid.suggestionModeOff')}
          </ToggleButton>
          <ToggleButton
            value="neighbors"
            aria-label={t('ui.chordGrid.suggestionModeCurrent')}
          >
            {t('ui.chordGrid.suggestionModeCurrent')}
          </ToggleButton>
          <ToggleButton
            value="clockwise"
            aria-label={t('ui.chordGrid.suggestionModeClockwise')}
          >
            {t('ui.chordGrid.suggestionModeClockwise')}
          </ToggleButton>
          <ToggleButton
            value="counterclockwise"
            aria-label={t('ui.chordGrid.suggestionModeCounterclockwise')}
          >
            {t('ui.chordGrid.suggestionModeCounterclockwise')}
          </ToggleButton>
        </ToggleButtonGroup>
      </AccordionDetails>
    </Accordion>
  );
}
