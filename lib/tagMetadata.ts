import type { Theme } from '@mui/material/styles';

type TagCategory = 'genre' | 'feeling' | 'custom';

const GENRE_TAGS = [
  'house',
  'piano house',
  'deep house',
  'disco house',
  'tech house',
  'funk / disco',
  'pop',
  'indie pop',
  'r&b / neo soul',
  'jazz',
  'lo-fi',
  'ambient',
  'cinematic',
  'edm',
  'afro house',
  'progressive house',
  'hip-hop',
  'rock',
  'folk',
];

const FEELING_TAGS = [
  'dreamy',
  'emotional',
  'uplifting',
  'moody',
  'dark',
  'melancholic',
  'hopeful',
  'nostalgic',
  'warm',
  'energetic',
  'chill',
  'smooth',
  'aggressive',
  'romantic',
  'atmospheric',
  'euphoric',
];

const normalize = (value: string) => value.trim().toLowerCase();

const GENRE_TAG_SET = new Set(GENRE_TAGS.map(normalize));
const FEELING_TAG_SET = new Set(FEELING_TAGS.map(normalize));

/**
 * Produces a deterministic palette index from text content.
 */
function getColorIndex(tag: string, paletteLength: number): number {
  const normalized = normalize(tag);
  let hash = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) >>> 0;
  }

  return hash % paletteLength;
}

/**
 * Predefined selectable tags shown in progression save/edit flows.
 */
export const PRESET_TAG_OPTIONS = [...GENRE_TAGS, ...FEELING_TAGS];

/**
 * Trims, deduplicates, and normalizes tag input order-preservingly.
 */
export function sanitizeTags(tags: string[]): string[] {
  const seen = new Set<string>();

  return tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => {
      const key = normalize(tag);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

/**
 * Categorizes a tag for palette selection.
 */
export function getTagCategory(tag: string): TagCategory {
  const normalized = normalize(tag);

  if (GENRE_TAG_SET.has(normalized)) {
    return 'genre';
  }

  if (FEELING_TAG_SET.has(normalized)) {
    return 'feeling';
  }

  return 'custom';
}

function getSemanticTagPalette(theme: Theme, category: TagCategory): string[] {
  if (category === 'genre') {
    return theme.palette.appColors.tags.genre;
  }

  if (category === 'feeling') {
    return theme.palette.appColors.tags.feeling;
  }

  return theme.palette.appColors.tags.custom;
}

/**
 * Returns MUI chip styling for general tags.
 */
export function getTagChipSx(tag: string) {
  const category = getTagCategory(tag);

  return {
    backgroundColor: (theme: Theme) => {
      const palette = getSemanticTagPalette(theme, category);
      return palette[getColorIndex(tag, palette.length)];
    },
    color: (theme: Theme) => theme.palette.appColors.tags.chipText,
    borderColor: (theme: Theme) => theme.palette.appColors.tags.chipBorder,
    fontWeight: 600,
  };
}

/**
 * Returns deterministic MUI chip styling for chord labels.
 */
export function getChordChipSx(chord: string) {
  return {
    backgroundColor: (theme: Theme) => {
      const palette = theme.palette.appColors.tags.chord;
      return palette[getColorIndex(chord, palette.length)];
    },
    color: (theme: Theme) => theme.palette.appColors.tags.chipText,
    borderColor: (theme: Theme) => theme.palette.appColors.tags.chipBorder,
    fontWeight: 600,
  };
}

/**
 * Returns deterministic MUI chip styling for mood labels.
 */
export function getMoodChipSx(mood: string) {
  return {
    backgroundColor: (theme: Theme) => {
      const palette = theme.palette.appColors.tags.mood;
      return palette[getColorIndex(mood, palette.length)];
    },
    color: (theme: Theme) => theme.palette.appColors.tags.chipText,
    borderColor: (theme: Theme) => theme.palette.appColors.tags.chipBorder,
    fontWeight: 600,
  };
}
