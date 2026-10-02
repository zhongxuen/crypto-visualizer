import type { DhEvent, DhParty } from '@/core/dh/events';

/**
 * Who knows what, so far. The lanes read the run's events up to the current step and put
 * each value in the lane of whoever holds it. Nothing here computes: every value is one
 * a core event carried.
 */

export type LaneId = 'alice' | 'public' | 'bob' | 'malloryA' | 'malloryB' | 'eve';

/**
 * - `private`: only its owner knows it (a, b, Mallory's keys).
 * - `share`: a public key share, safe to send.
 * - `secret`: a shared secret.
 * - `fake`: a share that isn't what its receiver thinks (Mallory's swap).
 * - `check`: a validation result or a decrypted message.
 */
export type ItemTone = 'private' | 'share' | 'secret' | 'fake' | 'check' | 'public';

export interface BoardItem {
  key: string;
  /** The item's element id in the lanes, for `<Travel from>`. */
  id: string;
  /** The element id of the item this one came from, when it crossed lanes. */
  source?: string;
  /**
   * Which of the two MITM secrets this is: `alice` for the Alice–Mallory pair, `bob` for
   * Mallory–Bob. Each pair gets its own colour and glyph.
   */
  pair?: DhParty;
  name: string;
  /** A decimal integer or short text. Absent: unknown to this lane (shown as "?"). */
  value?: string;
  /** A paint colour, `#rrggbb`. */
  colour?: string;
  note?: string;
  tone: ItemTone;
  /** The step that added it. */
  step: number;
}

export type Board = Record<LaneId, BoardItem[]>;

const WHO: Record<DhParty, string> = { alice: 'Alice', bob: 'Bob' };

function emptyBoard(): Board {
  return { alice: [], public: [], bob: [], malloryA: [], malloryB: [], eve: [] };
}

/** Everything each lane holds after step `index` (0-based) of `events`. */
export function buildBoard(events: readonly DhEvent[], index: number): Board {
  const board = emptyBoard();
  const last = Math.min(index, events.length - 1);
  // The MITM message hops lane to lane: each hop starts where the last one landed.
  let lastMessage: BoardItem | undefined;
  for (let step = 0; step <= last; step += 1) {
    const e = events[step];
    const put = (lane: LaneId, item: Omit<BoardItem, 'key' | 'id' | 'step'>) => {
      const n = board[lane].length;
      const placed = {
        ...item,
        key: `${step}.${n}`,
        id: `dh-${lane}-${step}-${n}`,
        step,
      };
      board[lane].push(placed);
      return placed;
    };
    switch (e.kind) {
      case 'dh.paintPot':
        put(e.actor === 'public' ? 'public' : e.actor === 'bob' ? 'bob' : 'alice', {
          name: e.role === 'public' ? 'Common colour' : 'Secret colour',
          value: e.colour,
          colour: e.colour,
          tone: e.role === 'public' ? 'public' : 'private',
        });
        break;
      case 'dh.paintMix':
        put(e.actor === 'bob' ? 'bob' : 'alice', {
          name: e.recipe.length > 2 ? 'Final pot' : 'Mixture',
          value: e.colour,
          colour: e.colour,
          note: e.recipe.map((part) => `${part.parts} ${part.name}`).join(' + '),
          tone: e.recipe.length > 2 ? 'secret' : 'share',
        });
        break;
      case 'dh.paintSend':
        put('public', {
          source: latest(board[e.from], (i) => i.colour === e.colour)?.id,
          name: `${WHO[e.from]}'s mixture`,
          value: e.colour,
          colour: e.colour,
          note: `${WHO[e.from]} → ${WHO[e.to]}`,
          tone: 'share',
        });
        break;
      case 'dh.paintEve':
        put('eve', {
          name: "Eve's mix",
          value: e.colour,
          colour: e.colour,
          note: e.recipe.map((part) => `${part.parts} ${part.name}`).join(' + '),
          tone: 'fake',
        });
        break;
      case 'dh.params':
        put('public', { name: 'p', value: e.p, tone: 'public' });
        put('public', { name: 'g', value: e.g, tone: 'public' });
        break;
      case 'dh.private': {
        const lane: LaneId =
          e.actor === 'mallory' ? (e.name === 'm₁' ? 'malloryA' : 'malloryB') : e.actor;
        put(lane, { name: e.name, value: e.value, tone: 'private' });
        break;
      }
      case 'dh.publicKey':
        put(e.actor === 'mallory' ? 'malloryA' : e.actor, {
          name: e.name,
          value: e.value,
          tone: 'share',
        });
        break;
      case 'dh.send':
        put('public', {
          source: latest(board[e.from], (i) => i.name === e.name)?.id,
          name: e.name,
          value: e.value,
          note: `${WHO[e.from]} → ${WHO[e.to]}`,
          tone: 'share',
        });
        break;
      case 'dh.validate':
        put(e.actor, {
          name: `${e.name} checked`,
          value: e.ok ? 'in the subgroup' : 'rejected',
          note: `${e.name}^q mod p = ${e.check}`,
          tone: 'check',
        });
        break;
      case 'dh.shared':
        if (e.actor === 'alice' || e.actor === 'bob') {
          put(e.actor, {
            name: 'Secret',
            value: e.value,
            note: e.with === 'mallory' ? 'shared with Mallory' : undefined,
            pair: e.with === 'mallory' ? e.actor : undefined,
            tone: 'secret',
          });
        }
        break;
      case 'dh.eveView':
        put('public', { name: 'A', value: e.A, tone: 'share' });
        put('public', { name: 'B', value: e.B, tone: 'share' });
        put('alice', { name: 'a', tone: 'private' });
        put('bob', { name: 'b', tone: 'private' });
        break;
      case 'dh.eveFound':
        put('eve', {
          name: 'a',
          value: e.x,
          note: `after ${e.tries} guesses`,
          tone: 'private',
        });
        put('eve', {
          name: 'Secret',
          value: e.shared,
          note: 'B^a mod p',
          tone: 'secret',
        });
        break;
      case 'dh.mitmIntercept': {
        const catcher: LaneId = e.from === 'alice' ? 'malloryA' : 'malloryB';
        const caught = put(catcher, {
          source: latest(board[e.from], (i) => i.name === e.name)?.id,
          name: `Caught ${e.name}`,
          value: e.original,
          note: `from ${WHO[e.from]}`,
          tone: 'share',
        });
        put(e.to, {
          source: caught.id,
          name: `“${e.name}”`,
          value: e.replacement,
          note: `really Mallory's ${e.replacementName}`,
          tone: 'fake',
        });
        break;
      }
      case 'dh.mitmKeys':
        put('malloryA', {
          name: 'Secret with Alice',
          value: e.malloryWithAlice,
          pair: 'alice',
          tone: 'secret',
        });
        put('malloryB', {
          name: 'Secret with Bob',
          value: e.malloryWithBob,
          pair: 'bob',
          tone: 'secret',
        });
        break;
      case 'dh.mitmMessage': {
        const lane: LaneId =
          e.actor === 'mallory'
            ? e.action === 'decrypt'
              ? 'malloryA'
              : 'malloryB'
            : e.actor;
        lastMessage = put(lane, {
          source: lastMessage?.id,
          name: e.action === 'encrypt' ? 'Sends c' : 'Reads m',
          value: e.output,
          note: e.action === 'encrypt' ? `m = ${e.input}` : `c = ${e.input}`,
          tone: e.action === 'encrypt' ? 'share' : 'check',
        });
        break;
      }
      default:
        break;
    }
  }
  return board;
}

/** The most recent item in `items` that matches. */
function latest(
  items: readonly BoardItem[],
  match: (item: BoardItem) => boolean,
): BoardItem | undefined {
  for (let i = items.length - 1; i >= 0; i -= 1) if (match(items[i])) return items[i];
  return undefined;
}

/**
 * Where each paint poured into a mix came from: for every input colour, the pot holding
 * it that the mixer can reach (the public channel first, then their own lane). A lookup
 * by colour, nothing computed.
 */
export function pourSources(
  board: Board,
  actor: LaneId,
  inputs: readonly string[],
  before: number,
): (string | undefined)[] {
  return inputs.map((colour) => {
    const match = (i: BoardItem) => i.step < before && i.colour === colour;
    return (latest(board.public, match) ?? latest(board[actor], match))?.id;
  });
}

/** A long decimal as its first and last digits, for a lane. */
export function shortNumber(value: string, keep = 6): string {
  if (value.length <= keep * 2 + 3) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)} (${value.length} digits)`;
}
