import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import PageSuspenseFallback from '../../../components/ui/PageSuspenseFallback';
import BillingPageContent from '../../../features/billing/components/BillingPageContent';
import { parseSessionToken } from '../../../lib/auth';

export default async function BillingSettingsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('progressionlab_session')?.value;
  const session = parseSessionToken(sessionToken);

  if (!session) {
    redirect('/auth?reason=settings-billing');
  }

  return (
    <Suspense fallback={<PageSuspenseFallback message="Loading billing..." maxWidth="lg" />}>
      <BillingPageContent />
    </Suspense>
  );
}
