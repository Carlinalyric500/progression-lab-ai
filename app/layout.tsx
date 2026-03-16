import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Music Chord App',
  description: 'AI chord continuation and progression ideas'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}