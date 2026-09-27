import type { Metadata } from 'next';

import { AesModule } from '@/modules/aes/AesModule';
import { AES_META } from '@/modules/aes/meta';
import Walkthrough from '@/modules/aes/walkthrough.mdx';

export const metadata: Metadata = {
  title: AES_META.title,
  description: AES_META.intro,
};

export default function AesPage() {
  return <AesModule walkthrough={<Walkthrough />} />;
}
