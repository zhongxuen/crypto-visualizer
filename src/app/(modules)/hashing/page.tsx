import type { Metadata } from 'next';

import { HashingModule } from '@/modules/hashing/HashingModule';
import { HASHING_META } from '@/modules/hashing/meta';
import Walkthrough from '@/modules/hashing/walkthrough.mdx';

export const metadata: Metadata = {
  title: HASHING_META.title,
  description: HASHING_META.intro,
};

export default function HashingPage() {
  return <HashingModule walkthrough={<Walkthrough />} />;
}
