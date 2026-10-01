/** Key expansion (FIPS 197 §5.2), stepped: `expandKey` with a trace attached. */

import { createRun, type RunBuilder } from '../events/builder';
import type { SimResult } from '../sim/result';
import type { AesEvent } from './events';
import { expandKey, ROUNDS, type KeyWordTrace } from './keyExpansion';

const hex32 = (word: number) => word.toString(16).padStart(8, '0');

/** Key expansion, stepped: one event per word, grouped by round key. */
export function keyExpansionRun(key: Uint8Array): SimResult<AesEvent> {
  const traces: KeyWordTrace[] = [];
  const w = expandKey(key, (step) => traces.push(step));
  const run = createRun<AesEvent>();
  for (let r = 0; r <= ROUNDS; r += 1) {
    run.group(
      `Round key ${r}`,
      () => {
        for (const t of traces.slice(4 * r, 4 * r + 4)) emitKeyWord(run, t, w);
      },
      {
        id: `key-${r}`,
        description:
          r === 0
            ? 'The key itself is w0 to w3.'
            : `w${4 * r} to w${4 * r + 3}: the first uses RotWord, SubWord and Rcon.`,
      },
    );
  }
  return run.finish();
}

function emitKeyWord(run: RunBuilder<AesEvent>, t: KeyWordTrace, w: Uint32Array): void {
  const base = {
    kind: 'aes.keyWord' as const,
    id: `aes.key.w${t.i}`,
    citation: 'fips197.5.2',
    i: t.i,
    word: t.word,
    temp: t.temp,
    back: t.back,
    words: Array.from(w.subarray(0, t.i + 1)),
  };
  if (t.i < 4) {
    run.step({
      ...base,
      label: `w${t.i} = ${hex32(t.word)}: key bytes ${4 * t.i}–${4 * t.i + 3}.`,
    });
  } else if (t.rot !== undefined) {
    run.step({
      ...base,
      rot: t.rot,
      sub: t.sub,
      rcon: t.rcon,
      afterRcon: t.afterRcon,
      label: `w${t.i} = w${t.i - 4} ⊕ SubWord(RotWord(w${t.i - 1})) ⊕ Rcon[${t.i / 4}] = ${hex32(t.word)}.`,
      detail: `RotWord(${hex32(t.temp)}) = ${hex32(t.rot)}; SubWord = ${hex32(t.sub ?? 0)}; ⊕ Rcon ${hex32(t.rcon ?? 0)} = ${hex32(t.afterRcon ?? 0)}. Without this twist every round key would be a linear function of the key.`,
    });
  } else {
    run.step({
      ...base,
      label: `w${t.i} = w${t.i - 4} ⊕ w${t.i - 1} = ${hex32(t.back)} ⊕ ${hex32(t.temp)} = ${hex32(t.word)}.`,
    });
  }
}
