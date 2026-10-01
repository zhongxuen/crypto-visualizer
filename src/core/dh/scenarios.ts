import type { Scenario } from '../scenarios';
import { dhExchangeRun } from './dh';
import { dhEveRun } from './eavesdropper';
import { DEFAULT_MITM_MESSAGE, dhMitmRun } from './mitm';
import { dhPaintRun } from './paint';
import { DH_DEFAULT_INPUT, DH_MITM_INPUT } from './examples';

export { DH_DEFAULT_INPUT, DH_DEFAULT_SEED, DH_MITM_INPUT } from './examples';

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
