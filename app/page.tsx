import { Suspense } from 'react';
import GeneratorPageContent from '../features/generator/components/layout/GeneratorPageContent';
import PageSuspenseFallback from '../components/ui/PageSuspenseFallback';

export default function HomePage() {
  return (
    <Suspense fallback={<PageSuspenseFallback messageKey="settings.loadingStudio" maxWidth="xl" />}>
      <GeneratorPageContent />
    </Suspense>
  );
}
