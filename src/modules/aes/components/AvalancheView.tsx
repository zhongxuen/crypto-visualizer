'use client';

import { memo } from 'react';

import { BitDiffStrip, ByteGrid, type ByteFormat } from '@/components/blocks';
import type { AesAvalancheEvent } from '@/core/aes/events';

import { Label, ROW_LABELS } from './parts';

/**
 * Two blocks one bit apart, compared after each round. `history` is every avalanche
 * step up to this one, for the running count of differing bits.
 */
export const AvalancheView = memo(function AvalancheView({
  event,
  history,
  format,
}: {
  event: AesAvalancheEvent;
  history: readonly AesAvalancheEvent[];
  format: ByteFormat;
}) {
  const stage = event.stage === 'flip' ? 'Plaintexts' : `After round ${event.round}`;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex flex-col gap-2">
          <Label>{stage}: original</Label>
          <ByteGrid
            label={`${stage}, original`}
            bytes={event.stateA}
            format={format}
            columnMajor
            rowLabels={ROW_LABELS}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label>{stage}: one bit flipped</Label>
          <ByteGrid
            label={`${stage}, one bit flipped`}
            bytes={event.stateB}
            format={format}
            columnMajor
            changed={event.changed}
          />
        </div>
      </div>
      <BitDiffStrip
        label={`${stage}: the two states bit by bit`}
        a={event.stateA}
        b={event.stateB}
        perRow={32}
      />
      <div className="max-w-full overflow-x-auto">
        <table className="text-sm tabular-nums">
          <caption className="text-fg-muted mb-1 text-left text-xs">
            Bits that differ, of 128. Half is 64.
          </caption>
          <thead>
            <tr className="text-fg-muted text-xs">
              <th scope="col" className="pr-3 text-left font-normal">
                After
              </th>
              <th scope="col" className="pr-3 text-right font-normal">
                Bits
              </th>
              <th scope="col" className="font-normal">
                <span className="sr-only">Bar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((step) => (
              <tr key={step.id}>
                <th scope="row" className="pr-3 text-left font-normal">
                  {step.stage === 'flip' ? 'the flip' : `round ${step.round}`}
                </th>
                <td className="pr-3 text-right font-mono">{step.flipped}</td>
                <td className="w-48">
                  <span
                    aria-hidden="true"
                    className="bg-diff-on block h-2.5 rounded-sm"
                    style={{ width: `${(step.flipped / 128) * 100}%` }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
