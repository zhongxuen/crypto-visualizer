import type { Metadata } from 'next';

import { DemoView } from './DemoView';

/** Every building block, driven by a fake run. Not linked, not indexed. */
export const metadata: Metadata = {
  title: 'Building blocks',
  robots: { index: false, follow: false },
};

export default function DemoPage() {
  return <DemoView />;
}
