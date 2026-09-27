import type { Metadata } from 'next';

import { DhModule } from '@/modules/dh/DhModule';
import { DH_META } from '@/modules/dh/meta';
import Walkthrough from '@/modules/dh/walkthrough.mdx';

export const metadata: Metadata = {
  title: DH_META.title,
  description: DH_META.intro,
};

export default function DhPage() {
  return <DhModule walkthrough={<Walkthrough />} />;
}
