import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

/**
 * The 404 page. Next's built-in one has no `<main>`, which left the header's "Skip to
 * content" link pointing at nothing and failed axe (`landmark-one-main`).
 */
export default function NotFound() {
  return (
    <main id="main" className="prose-cv mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p>
        Nothing lives at this address. The modules are listed on the{' '}
        <Link href="/">home page</Link>.
      </p>
    </main>
  );
}
