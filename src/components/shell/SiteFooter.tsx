import Link from 'next/link';

import { SITE } from '@/lib/site';

export function SiteFooter() {
  return (
    <footer className="border-border text-fg-muted border-t text-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6">
        <p>{SITE.disclaimer}</p>
        <p className="flex flex-wrap gap-4">
          <Link href="/learn" className="underline underline-offset-2">
            Learning path
          </Link>
          <Link href="/glossary" className="underline underline-offset-2">
            Glossary
          </Link>
          <Link href="/about" className="underline underline-offset-2">
            About and accuracy
          </Link>
          <a href={SITE.repoUrl} className="underline underline-offset-2">
            Source
          </a>
        </p>
      </div>
    </footer>
  );
}
