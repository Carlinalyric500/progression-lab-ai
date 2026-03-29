'use client';

import { Box, LinearProgress, Stack, Typography } from '@mui/material';

import GeneratorHeader from './GeneratorHeader';

/**
 * Placeholder screen shown while session state is being restored.
 */
export default function RestoringState() {
  return (
    <Stack spacing={3}>
      <GeneratorHeader />
      <Box
        sx={{
          width: '100%',
          maxWidth: 760,
          mx: 'auto',
          py: 10,
          px: { xs: 1, sm: 2 },
        }}
      >
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Restoring your last generator session...
        </Typography>
        <LinearProgress />
      </Box>
    </Stack>
  );
}
