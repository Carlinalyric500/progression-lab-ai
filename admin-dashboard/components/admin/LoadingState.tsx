'use client';

import { Container, LinearProgress, Stack, Typography } from '@mui/material';

type LoadingStateProps = {
  message: string;
};

export default function LoadingState({ message }: LoadingStateProps) {
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Stack spacing={2} alignItems="center">
        <Typography color="text.secondary">{message}</Typography>
        <LinearProgress sx={{ width: '100%', maxWidth: 320 }} />
      </Stack>
    </Container>
  );
}
