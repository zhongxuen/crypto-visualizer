import type { Scenario } from '../scenarios';
import { dhExchangeRun, type DhInput } from './dh';
import { dhEveRun } from './eavesdropper';
import { DEFAULT_MITM_MESSAGE, dhMitmRun } from './mitm';
import { dhPaintRun } from './paint';

/** The default seed for private keys. */
export const DH_DEFAULT_SEED = 1;

/** The default exchange: the smallest group, small enough for the modular clock. */
export const DH_DEFAULT_INPUT: DhInput = { group: 'p23', seed: DH_DEFAULT_SEED };

/** MITM and Eve default to p = 467: big enough that a lucky collision is unlikely. */
export const DH_MITM_INPUT: DhInput = { group: 'p467', seed: DH_DEFAULT_SEED };

export const DH_SCENARIOS: readonly Scenario[] = [
  { id: 'dh.paint', run: () => dhPaintRun() },
  { id: 'dh.exchange-p23', run: () => dhExchangeRun(DH_DEFAULT_INPUT) },
  {
    id: 'dh.exchange-p23-user',
    run: () => dhExchangeRun({ ...DH_DEFAULT_INPUT, a: 6n, b: 9n }),
  },
  { id: 'dh.exchange-p2039', run: () => dhExchangeRun({ group: 'p2039', seed: 7 }) },
  {
    id: 'dh.exchange-modp2048',
    run: () => dhExchangeRun({ group: 'modp2048', seed: 1 }),
  },
  { id: 'dh.eve-p23', run: () => dhEveRun(DH_DEFAULT_INPUT) },
  { id: 'dh.eve-p2039', run: () => dhEveRun({ group: 'p2039', seed: 7 }) },
  { id: 'dh.eve-modp2048', run: () => dhEveRun({ group: 'modp2048', seed: 1 }) },
  { id: 'dh.mitm-p467', run: () => dhMitmRun(DH_MITM_INPUT, DEFAULT_MITM_MESSAGE) },
  { id: 'dh.mitm-modp2048', run: () => dhMitmRun({ group: 'modp2048', seed: 1 }) },
];
