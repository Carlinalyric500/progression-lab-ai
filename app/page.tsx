import { Suspense } from 'react';
import GeneratorPageContent from '../features/generator/components/GeneratorPageContent';
import PageSuspenseFallback from '../components/ui/PageSuspenseFallback';

export default function HomePage() {
  return (
    <Suspense fallback={<PageSuspenseFallback message="Loading studio..." maxWidth="xl" />}>
      <GeneratorPageContent />
    </Suspense>
  );
}
