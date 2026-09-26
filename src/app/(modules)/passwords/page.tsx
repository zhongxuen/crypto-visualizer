import type { Metadata } from 'next';

import { PASSWORDS_META } from '@/modules/passwords/meta';
import { PasswordsModule } from '@/modules/passwords/PasswordsModule';
import Walkthrough from '@/modules/passwords/walkthrough.mdx';

export const metadata: Metadata = {
  title: PASSWORDS_META.title,
  description: PASSWORDS_META.intro,
};

export default function PasswordsPage() {
  return <PasswordsModule walkthrough={<Walkthrough />} />;
}
