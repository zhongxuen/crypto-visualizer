'use client';

import { useMemo, useState } from 'react';

import {
  BitDiffStrip,
  ByteGrid,
  HexBinToggle,
  ModClock,
  NumberTrace,
  useByteFormat,
} from '@/components/blocks';
import { StepInspector } from '@/components/inspector';
import { ModuleLayout, type ModuleMode } from '@/components/shell';
import { CITATIONS } from '@/core/citations';
import {
  PhaseStepper,
  StepCaption,
  TimelineBar,
  usePhaseIndex,
  usePlayback,
  usePlaybackKeys,
  useStepIndex,
} from '@/components/timeline';

import { buildDemoRun } from './demoRun';

export function DemoView() {
  const result = useMemo(() => buildDemoRun(), []);
  const store = usePlayback({ result });
  usePlaybackKeys(store);
  const index = useStepIndex(store, result);
  const phaseIndex = usePhaseIndex(store, result);
  const event = result.events[Math.max(0, index)];
  const [format, setFormat] = useByteFormat();
  const [mode, setMode] = useState<ModuleMode>('walkthrough');
  const changed = event.bytes.flatMap((byte, i) =>
    byte !== event.previous[i] ? [i] : [],
  );

  return (
    <ModuleLayout
      citations={CITATIONS}
      title="Building blocks"
      intro="Every shared component, driven by a fake run. Keyboard only works end to end."
      mode={mode}
      onModeChange={setMode}
      controls={<HexBinToggle value={format} onChange={setFormat} />}
      inspector={
        <>
          <StepInspector event={event} />
          <PhaseStepper
            phases={result.phases}
            currentIndex={phaseIndex}
            onSeek={(time) => store.getState().seek(time)}
          />
        </>
      }
      timeline={<TimelineBar store={store} result={result} />}
    >
      <StepCaption
        index={index}
        count={result.events.length}
        group={event.group}
        label={event.label}
      />
      <ByteGrid
        label="Bytes"
        bytes={event.bytes}
        format={format}
        changed={changed}
        highlight={[0]}
      />
      <ByteGrid
        label="Bytes as an AES state"
        bytes={event.bytes}
        columnMajor
        format={format}
      />
      <BitDiffStrip label="Before and after" a={event.previous} b={event.bytes} />
      <div className="grid gap-4 sm:grid-cols-2">
        <ModClock
          label="Clock"
          modulus={event.modulus}
          value={event.value}
          from={event.from}
        />
        <ModClock label="Number line" modulus={1009} value={event.value * 40} />
      </div>
      <NumberTrace
        caption="Trace"
        columns={[
          { key: 'step', label: 'Step' },
          { key: 'value', label: 'Value' },
          { key: 'doubled', label: 'Doubled' },
        ]}
        rows={result.events.map((e) => e.row)}
        currentRow={index}
      />
    </ModuleLayout>
  );
}
