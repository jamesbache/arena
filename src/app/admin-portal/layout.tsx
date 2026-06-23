import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Management Portal · ÉlitePitch',
  description: 'Private management dashboard for ÉlitePitch ticket inventory.',
  robots: { index: false, follow: false },
};

export default function ManagementLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
