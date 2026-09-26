import type { Metadata } from 'next';

import Walkthrough from '@/modules/xor/walkthrough.mdx';
import { XorModule } from '@/modules/xor/XorModule';
import { XOR_META } from '@/modules/xor/meta';

export const metadata: Metadata = {
  title: XOR_META.title,
  description: XOR_META.intro,
};

export default function XorPage() {
  return <XorModule walkthrough={<Walkthrough />} />;
}
