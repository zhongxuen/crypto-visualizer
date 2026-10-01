import { ImageResponse } from 'next/og';

import { SITE } from '@/lib/site';
import { MODULES } from '@/modules/registry';

/**
 * The card a shared link unfurls into. One image at the root, which every route
 * inherits; each route's own title and description come from its `metadata`.
 *
 * Drawn in the site's dark palette (`src/styles/tokens.css`, restated here because
 * Satori can't read CSS custom properties). The grid is real data, not decoration: the
 * FIPS 197 Appendix B plaintext as the 4×4 AES state, filled column by column, with the
 * first column picked out the way the AES module highlights the column MixColumns is
 * working on.
 */

export const alt = `${SITE.name}: ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const PALETTE = {
  bg: '#0f1115',
  surface: '#161a20',
  fg: '#eceef2',
  fgSecondary: '#c4c8d0',
  fgMuted: '#9aa1ad',
  border: '#2d333d',
  accent: '#7fb0ff',
  diffOn: '#fb923c',
  diffOnFg: '#1a0d02',
} as const;

// FIPS 197 Appendix B input, in byte order; the state is filled column-major.
const FIPS197_INPUT = '3243f6a8885a308d313198a2e0370734'.match(/../g) ?? [];
const ROWS = [0, 1, 2, 3].map((row) =>
  [0, 1, 2, 3].map((col) => FIPS197_INPUT[col * 4 + row] ?? ''),
);

export default function OpengraphImage() {
  const ready = MODULES.filter((entry) => entry.status === 'ready');

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        backgroundColor: PALETTE.bg,
        padding: 72,
        fontFamily: 'sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          flex: 1,
          paddingRight: 56,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              letterSpacing: -1.5,
              whiteSpace: 'nowrap',
              color: PALETTE.fg,
            }}
          >
            {SITE.name}
          </div>
          <div style={{ fontSize: 32, lineHeight: 1.35, color: PALETTE.fgSecondary }}>
            {SITE.tagline}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {ready.map((entry) => (
              <div
                key={entry.slug}
                style={{
                  display: 'flex',
                  padding: '5px 14px',
                  borderRadius: 999,
                  border: `2px solid ${PALETTE.border}`,
                  color: PALETTE.fgSecondary,
                  fontSize: 20,
                }}
              >
                {entry.title}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', fontSize: 22, color: PALETTE.fgMuted }}>
            Checked against node:crypto and the published test vectors
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 12,
        }}
      >
        {ROWS.map((row, r) => (
          <div key={r} style={{ display: 'flex', gap: 12 }}>
            {row.map((byte, c) => {
              const active = c === 0;
              return (
                <div
                  key={c}
                  style={{
                    width: 76,
                    height: 76,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    fontSize: 30,
                    fontFamily: 'monospace',
                    backgroundColor: active ? PALETTE.diffOn : PALETTE.surface,
                    color: active ? PALETTE.diffOnFg : PALETTE.accent,
                    border: `2px solid ${active ? PALETTE.diffOn : PALETTE.border}`,
                  }}
                >
                  {byte}
                </div>
              );
            })}
          </div>
        ))}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 8,
            fontSize: 20,
            color: PALETTE.fgMuted,
          }}
        >
          AES state · FIPS 197 Appendix B
        </div>
      </div>
    </div>,
    size,
  );
}
