'use client';

import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

type PageSuspenseFallbackProps = {
  message?: string;
  messageKey?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  padded?: boolean;
};

export default function PageSuspenseFallback({
  message,
  messageKey,
  maxWidth = 'lg',
  padded = true,
}: PageSuspenseFallbackProps) {
  const { t } = useTranslation('common');
  const resolvedMessage = messageKey ? t(messageKey) : (message ?? t('settings.loadingDefault'));
  const maxWidthPxBySize = {
    sm: 600,
    md: 900,
    lg: 1200,
    xl: 1536,
  } as const;

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: `${maxWidthPxBySize[maxWidth]}px`,
        mx: 'auto',
        py: padded ? 6 : 0,
        '@keyframes suspenseShimmer': {
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      }}
    >
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2.5} sx={{ py: 4 }}>
            <Typography color="text.secondary">{resolvedMessage}</Typography>
            <Box
              sx={{
                height: 10,
                borderRadius: 999,
                bgcolor: 'action.hover',
                overflow: 'hidden',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  transform: 'translateX(-100%)',
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                  animation: 'suspenseShimmer 1.4s ease-in-out infinite',
                },
              }}
            />
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
              }}
            >
              {[0, 1, 2, 3].map((item) => (
                <Box
                  key={item}
                  sx={{
                    height: 56,
                    borderRadius: 2,
                    bgcolor: 'action.hover',
                    opacity: 0.8,
                  }}
                />
              ))}
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
