/**
 * The paint analogy: a public common colour, one secret colour each, and mixing that is
 * easy to do and hard to undo by eye.
 *
 * A mixture is a recipe (how many parts of each base paint), and its colour is the
 * part-weighted average of the base colours in OKLab (Ottosson 2020), a perceptual space
 * where averages look like mixed paint more than averaging RGB does. The colour depends
 * only on the recipe, summed in name order, so "common + Alice's, then Bob's" and "common
 * + Bob's, then Alice's" are the same pot, bit for bit.
 *
 * This models the look of mixing, not the chemistry of pigments.
 */

import { createRun } from '../events/builder';
import type { SimResult } from '../sim/result';
import type { DhEvent, DhParty, PaintPart } from './events';

export type Oklab = readonly [L: number, a: number, b: number];

/** A mixture: parts of each base paint, by name. */
export type Recipe = Readonly<Record<string, number>>;

function hexByte(hex: string, i: number): number {
  return parseInt(hex.slice(1 + 2 * i, 3 + 2 * i), 16);
}

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;

/** `#rrggbb` → OKLab, through linear sRGB. */
export function hexToOklab(hex: string): Oklab {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) throw new RangeError(`Not a #rrggbb colour: ${hex}`);
  const [r, g, b] = [0, 1, 2].map((i) => toLinear(hexByte(hex, i) / 255));
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** OKLab → `#rrggbb`, clamped to the sRGB gamut and rounded to 8 bits. */
export function oklabToHex([L, a, b]: Oklab): string {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    '#' +
    rgb
      .map((c) => Math.round(Math.min(1, Math.max(0, toGamma(c))) * 255))
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Euclidean distance in OKLab: about 0.02 is the smallest difference people notice. */
export function oklabDistance(x: Oklab, y: Oklab): number {
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

/** Pour two mixtures together. */
export function combine(x: Recipe, y: Recipe): Recipe {
  const out: Record<string, number> = { ...x };
  for (const [name, parts] of Object.entries(y)) out[name] = (out[name] ?? 0) + parts;
  return out;
}

/** The colour of a recipe: the part-weighted OKLab average, summed in name order. */
export function recipeOklab(
  recipe: Recipe,
  pots: Readonly<Record<string, string>>,
): Oklab {
  const names = Object.keys(recipe).sort();
  let total = 0;
  const sum = [0, 0, 0];
  for (const name of names) {
    const parts = recipe[name];
    const colour = pots[name];
    if (colour === undefined) throw new RangeError(`No paint called "${name}"`);
    const lab = hexToOklab(colour);
    for (let i = 0; i < 3; i += 1) sum[i] += parts * lab[i];
    total += parts;
  }
  if (total <= 0) throw new RangeError('An empty pot has no colour');
  return [sum[0] / total, sum[1] / total, sum[2] / total];
}

export function recipeHex(
  recipe: Recipe,
  pots: Readonly<Record<string, string>>,
): string {
  return oklabToHex(recipeOklab(recipe, pots));
}

function parts(recipe: Recipe, pots: Readonly<Record<string, string>>): PaintPart[] {
  return Object.keys(recipe)
    .sort()
    .map((name) => ({ name, colour: pots[name], parts: recipe[name] }));
}

export interface PaintColours {
  common: string;
  alice: string;
  bob: string;
}

/** Yellow in public, red for Alice, blue for Bob. */
export const DEFAULT_PAINTS: PaintColours = {
  common: '#f2c230',
  alice: '#d7263d',
  bob: '#1b6ca8',
};

const POT_NAMES = { common: 'common', alice: 'alice-secret', bob: 'bob-secret' } as const;

/** The paint chapter: pots, first mix, swap, second mix, Eve's attempt, the limit. */
export function dhPaintRun(colours: PaintColours = DEFAULT_PAINTS): SimResult<DhEvent> {
  const pots: Record<string, string> = {
    [POT_NAMES.common]: colours.common,
    [POT_NAMES.alice]: colours.alice,
    [POT_NAMES.bob]: colours.bob,
  };
  const one = (name: string): Recipe => ({ [name]: 1 });
  const common = one(POT_NAMES.common);
  const secret: Record<DhParty, Recipe> = {
    alice: one(POT_NAMES.alice),
    bob: one(POT_NAMES.bob),
  };
  const mixed: Record<DhParty, Recipe> = {
    alice: combine(common, secret.alice),
    bob: combine(common, secret.bob),
  };
  const final: Record<DhParty, Recipe> = {
    alice: combine(mixed.bob, secret.alice),
    bob: combine(mixed.alice, secret.bob),
  };
  const who = { alice: 'Alice', bob: 'Bob' } as const;
  const other = (p: DhParty): DhParty => (p === 'alice' ? 'bob' : 'alice');
  const run = createRun<DhEvent>();

  run.group(
    'Pots',
    () => {
      run.step({
        kind: 'dh.paintPot',
        id: 'dh.paint.common',
        label: `A common colour everyone can see (${colours.common}).`,
        detail: 'Stands for the public numbers p and g.',
        citation: 'ottosson2020.oklab',
        actor: 'public',
        name: POT_NAMES.common,
        colour: colours.common,
        role: 'public',
      });
      for (const p of ['alice', 'bob'] as const) {
        run.step({
          kind: 'dh.paintPot',
          id: `dh.paint.${p}.secret`,
          label: `${who[p]} picks a secret colour (${colours[p]}) and keeps it.`,
          detail: `Stands for ${who[p]}'s private number ${p === 'alice' ? 'a' : 'b'}.`,
          citation: 'ottosson2020.oklab',
          actor: p,
          name: POT_NAMES[p],
          colour: colours[p],
          role: 'secret',
        });
      }
    },
    { id: 'pots', description: 'One public colour and two secret ones.' },
  );

  run.group(
    'Mix',
    () => {
      for (const p of ['alice', 'bob'] as const) {
        run.step({
          kind: 'dh.paintMix',
          id: `dh.paint.${p}.mix`,
          label: `${who[p]} mixes the common colour with their secret one and gets ${recipeHex(mixed[p], pots)}.`,
          detail: `Stands for ${p === 'alice' ? 'A = gᵃ' : 'B = gᵇ'} mod p. The mix is the average of the two colours in OKLab, a perceptual colour space.`,
          citation: 'ottosson2020.oklab',
          actor: p,
          inputs: [colours.common, colours[p]],
          colour: recipeHex(mixed[p], pots),
          recipe: parts(mixed[p], pots),
        });
      }
    },
    { id: 'mix', description: 'Each side mixes the public colour with its secret.' },
  );

  run.group(
    'Swap',
    () => {
      for (const p of ['alice', 'bob'] as const) {
        run.step({
          kind: 'dh.paintSend',
          id: `dh.paint.${p}.send`,
          label: `${who[p]} sends their mixture to ${who[other(p)]} in the open.`,
          detail:
            'Everyone can see this pot. Nobody can pour the secret colour back out of it.',
          citation: 'ottosson2020.oklab',
          actor: 'public',
          from: p,
          to: other(p),
          colour: recipeHex(mixed[p], pots),
        });
      }
    },
    { id: 'swap', description: 'The mixtures cross the public channel.' },
  );

  const aliceFinal = recipeHex(final.alice, pots);
  const bobFinal = recipeHex(final.bob, pots);
  run.group(
    'Mix again',
    () => {
      for (const p of ['alice', 'bob'] as const) {
        run.step({
          kind: 'dh.paintMix',
          id: `dh.paint.${p}.final`,
          label: `${who[p]} adds their secret colour to ${who[other(p)]}'s mixture and gets ${recipeHex(final[p], pots)}.`,
          detail: `Stands for ${p === 'alice' ? 'Bᵃ' : 'Aᵇ'} mod p.`,
          citation: 'ottosson2020.oklab',
          actor: p,
          inputs: [recipeHex(mixed[other(p)], pots), colours[p]],
          colour: recipeHex(final[p], pots),
          recipe: parts(final[p], pots),
        });
      }
      run.step({
        kind: 'dh.paintShared',
        id: 'dh.paint.shared',
        label:
          aliceFinal === bobFinal
            ? `Both pots hold one part of each colour, so both are ${aliceFinal}.`
            : 'The two pots differ.',
        detail:
          'Order of pouring doesn’t matter: common + red + blue is the same paint however you add it. That is the gᵃᵇ = gᵇᵃ of the real thing.',
        citation: 'ottosson2020.oklab',
        alice: aliceFinal,
        bob: bobFinal,
        same: aliceFinal === bobFinal,
        recipe: parts(final.alice, pots),
      });
    },
    { id: 'mix-again', description: 'Each side adds its secret to the other’s mixture.' },
  );

  const eve = combine(mixed.alice, mixed.bob);
  run.group(
    'Eve',
    () => {
      run.step({
        kind: 'dh.paintEve',
        id: 'dh.paint.eve',
        label: `Eve mixes the two pots she saw and gets ${recipeHex(eve, pots)}, too much of the common colour.`,
        detail:
          'Eve has the common colour and both mixtures, but combining them gives two parts common to one of each secret. To match, she would have to take the common colour out again.',
        citation: 'ottosson2020.oklab',
        actor: 'eve',
        colour: recipeHex(eve, pots),
        recipe: parts(eve, pots),
        shared: aliceFinal,
        distance: oklabDistance(recipeOklab(eve, pots), recipeOklab(final.alice, pots)),
      });
      run.step({
        kind: 'dh.paintLimit',
        id: 'dh.paint.limit',
        label: 'Where the analogy breaks: paint can be un-mixed, in principle.',
        detail:
          'Knowing the common colour, some algebra on the colour values gets the secret back: mixing is an average, and averages can be undone. What really can’t be undone is modular exponentiation: from g, p and gᵃ mod p, finding a is the discrete logarithm problem, with no known fast method for large p.',
        citation: 'rfc2631.2.1.1',
      });
    },
    { id: 'eve', description: 'What an eavesdropper can do with the pots she saw.' },
  );

  return run.finish();
}
