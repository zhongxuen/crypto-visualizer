/**
 * A 64×64 penguin, four colours, one character per pixel.
 *
 * Own artwork, drawn for this project from overlapping ellipses (body, head, belly,
 * eyes, beak, flippers, feet), so it carries no third-party licence. It stands in for
 * the well-known "ECB penguin" (Tux, by Larry Ewing), which is not reproduced here.
 *
 * `.` sky · `K` black · `W` white · `O` orange
 */

export const PENGUIN_WIDTH = 64;
export const PENGUIN_HEIGHT = 64;

/** RGB for each palette character. */
export const PENGUIN_PALETTE: Readonly<
  Record<string, readonly [number, number, number]>
> = {
  '.': [0xbf, 0xe3, 0xf5],
  K: [0x1a, 0x1a, 0x1a],
  W: [0xfa, 0xfa, 0xfa],
  O: [0xf5, 0xa6, 0x23],
};

// prettier-ignore
export const PENGUIN_ROWS: readonly string[] = [
  '................................................................',
  '................................................................',
  '................................................................',
  '................................................................',
  '................................................................',
  '...........................KKKKKKKKKK...........................',
  '.........................KKKKKKKKKKKKKK.........................',
  '........................KKKKKKKKKKKKKKKK........................',
  '......................KKKKKKKKKKKKKKKKKKKK......................',
  '......................KKKKKKKKKKKKKKKKKKKK......................',
  '.....................KKKKKKKKKKKKKKKKKKKKKK.....................',
  '....................KKKKKWWWWKKKKKKWWWWKKKKK....................',
  '....................KKKKWWWWWWKKKKWWWWWWKKKK....................',
  '....................KKKKWWWWWWKKKKWWWWWWKKKK....................',
  '...................KKKKWWWWWWWWKKWWWWWWWWKKKK...................',
  '...................KKKKWWWWKKWWKKWWKKWWWWKKKK...................',
  '...................KKKKWWWKKKKWKKWKKKKWWWKKKK...................',
  '...................KKKKWWWKKKKWKKWKKKKWWWKKKK...................',
  '...................KKKKKWWWKKWKKKKWKKWWWKKKKK...................',
  '...................KKKKKWWWWWWKKKKWWWWWWKKKKK...................',
  '....................KKKKKWWWWOOOOOOWWWWKKKKK....................',
  '....................KKKKKKKOOOOOOOOOOKKKKKKK....................',
  '....................KKKKKKOOOOOOOOOOOOKKKKKK....................',
  '....................KKKKKKOOOOOOOOOOOOKKKKKK....................',
  '...................KKKKKKKKOOOOOOOOOOKKKKKKKK...................',
  '..................KKKKKKKKKKKOOOOOOKKKKKKKKKKK..................',
  '.................KKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.................',
  '.............KK..KKKKKKKKKKKKWWWWWWKKKKKKKKKKKK..KK.............',
  '............KKKKKKKKKKKKKKKWWWWWWWWWWKKKKKKKKKKKKKKK............',
  '...........KKKKKKKKKKKKKKWWWWWWWWWWWWWWKKKKKKKKKKKKKK...........',
  '...........KKKKKKKKKKKKKWWWWWWWWWWWWWWWWKKKKKKKKKKKKK...........',
  '..........KKKKKKKKKKKKKWWWWWWWWWWWWWWWWWWKKKKKKKKKKKKK..........',
  '..........KKKKKKKKKKKKWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKKK..........',
  '..........KKKKKKKKKKKKWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKKK..........',
  '.........KKKKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKKK.........',
  '.........KKKKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKKK.........',
  '.........KKKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKK.........',
  '.........KKKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKK.........',
  '.........KKKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKKK.........',
  '.........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK.........',
  '.........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK.........',
  '.........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK.........',
  '.........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK.........',
  '.........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK.........',
  '.........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK.........',
  '.........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK.........',
  '..........KKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKK..........',
  '..........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK..........',
  '..........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK..........',
  '...........KKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKK...........',
  '...........KKKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKKK...........',
  '............KKKKKKKKKWWWWWWWWWWWWWWWWWWWWWWKKKKKKKKK............',
  '.............KK..KKKKKWWWWWWWWWWWWWWWWWWWWKKKKK..KK.............',
  '.................KKKKKWWWWWWWWWWWWWWWWWWWWKKKKK.................',
  '..................KKKKKWWWWWWWWWWWWWWWWWWKKKKK..................',
  '...................KKKKKWWWWWWWWWWWWWWWWKKKKK...................',
  '....................KKKKKWWWWWWWWWWWWWWKKKKK....................',
  '.....................KKKKKKWWWWWWWWWWKKKKKK.....................',
  '..................OOOOOOOOKKKWWWWWWKKKOOOOOOOO..................',
  '...............OOOOOOOOOOOOOOKKKKKKOOOOOOOOOOOOOO...............',
  '..............OOOOOOOOOOOOOOOOKKKKOOOOOOOOOOOOOOOO..............',
  '..............OOOOOOOOOOOOOOOO....OOOOOOOOOOOOOOOO..............',
  '...............OOOOOOOOOOOOOO......OOOOOOOOOOOOOO...............',
  '..................OOOOOOOO............OOOOOOOO..................',
];
