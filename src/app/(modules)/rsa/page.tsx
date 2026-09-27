import type { Metadata } from 'next';

import { RsaModule } from '@/modules/rsa/RsaModule';
import { RSA_META } from '@/modules/rsa/meta';
import Walkthrough from '@/modules/rsa/walkthrough.mdx';

export const metadata: Metadata = {
  title: RSA_META.title,
  description: RSA_META.intro,
};

export default function RsaPage() {
  return <RsaModule walkthrough={<Walkthrough />} />;
}
