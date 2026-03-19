import { Suspense } from 'react';
import { Card, CardContent, CircularProgress, Container, Stack, Typography } from '@mui/material';
import AuthPageContent from './AuthPageContent';

function AuthPageFallback() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
          <CircularProgress />
          <Typography color="text.secondary">Loading...</Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}

export default function AuthPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Suspense fallback={<AuthPageFallback />}>
        <AuthPageContent />
      </Suspense>
    </Container>
  );
}
