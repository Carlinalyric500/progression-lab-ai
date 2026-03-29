import { Suspense } from 'react';
import { Container } from '@mui/material';
import AuthPageContent from '../../features/auth/components/AuthPageContent';
import PageSuspenseFallback from '../../components/ui/PageSuspenseFallback';

export default function AuthPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Suspense
        fallback={
          <PageSuspenseFallback message="Loading sign-in..." maxWidth="sm" padded={false} />
        }
      >
        <AuthPageContent />
      </Suspense>
    </Container>
  );
}
