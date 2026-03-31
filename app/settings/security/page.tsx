import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import PageSuspenseFallback from '../../../components/ui/PageSuspenseFallback';
import SecuritySettingsContent from '../../../features/auth/components/SecuritySettingsContent';
import { parseSessionToken } from '../../../lib/auth';

export const metadata = {
  title: 'Security Keys',
};

export default async function SecuritySettingsPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('progressionlab_session')?.value;
  const session = parseSessionToken(sessionToken);

  if (!session) {
    redirect('/auth?reason=settings-security');
  }

  return (
    <Suspense
      fallback={<PageSuspenseFallback messageKey="settings.loadingSecurity" maxWidth="md" />}
    >
      <SecuritySettingsContent />
    </Suspense>
  );
}
