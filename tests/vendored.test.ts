import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The vendored files stay byte-identical to Internet Visualizer at 59ae4ad (VENDORED.md).
 *
 * Each hash is the git blob id upstream (`git rev-parse 59ae4ad:<path>`), recomputed
 * here the way git does: SHA-1 over `blob <length>\0<content>`. An accidental edit, or a
 * formatter pass, fails this test instead of quietly forking the kernel.
 */
const VENDORED: Record<string, string> = {
  'src/core/sim/playback.ts': '23968126049cacd75d1a642a3090dff44ff04021',
  'src/core/sim/rng.ts': '7572d51d34ba5a86cd27624c20d56bf9561214bc',
  'src/core/sim/__tests__/playback.test.ts': '80457dc157a899521bb3747428eebc3cc2c14cf5',
  'src/core/sim/__tests__/rng.test.ts': '3ad5ed2c857edbe7bb601498df89248d0a918ecb',
};

function gitBlobId(content: Buffer): string {
  return createHash('sha1')
    .update(`blob ${content.length}\0`)
    .update(content)
    .digest('hex');
}

describe('vendored files', () => {
  it.each(Object.entries(VENDORED))('%s is unchanged from upstream', (path, blobId) => {
    expect(gitBlobId(readFileSync(path))).toBe(blobId);
  });
});
