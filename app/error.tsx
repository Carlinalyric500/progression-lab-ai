'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Box, Button, Container, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation('common');

  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <Typography variant="h1" component="h1">
          {t('errors.boundary.title')}
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {t('errors.boundary.description')}
        </Typography>
        {process.env.NODE_ENV === 'development' && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'error.light', borderRadius: 1, width: '100%' }}>
            <Typography variant="caption" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
              {error.message}
            </Typography>
          </Box>
        )}
        <Button variant="contained" onClick={() => reset()}>
          {t('errors.boundary.tryAgain')}
        </Button>
      </Box>
    </Container>
  );
}
