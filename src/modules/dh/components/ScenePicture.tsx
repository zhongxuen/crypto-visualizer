import type { DhEvent } from '@/core/dh/events';

import { pourSources, type Board, type LaneId } from '../board';

import { EveFoundView, EveGrowthView, EveSearchView } from './EveView';
import {
  PaintEveView,
  PaintLimitView,
  PaintMixView,
  PaintSendView,
  PaintSharedView,
} from './PaintLater';
import { PowResultView, PowStepView } from './PowView';
import {
  AgreeView,
  InterceptView,
  MitmFixView,
  MitmKeysView,
  MitmMessageView,
  ParamsView,
  PrivateView,
  RealGroupsView,
  ValidateView,
  X25519View,
} from './StepView';

/**
 * The picture for one step of the exchange, Eve and MITM scenes, and of every paint step
 * after the first. Loaded after hydration
 * through `../runs` and rendered from the loaded module, not through `next/dynamic`, so
 * nothing suspends while a learner steps. The paint scene's views are in `./PaintViews`.
 */
export function ScenePicture({
  event,
  events,
  index,
  board,
  groupName,
}: {
  event: DhEvent;
  events: readonly DhEvent[];
  index: number;
  board: Board;
  groupName?: string;
}) {
  switch (event.kind) {
    case 'dh.paintMix': {
      const lane: LaneId = event.actor === 'bob' ? 'bob' : 'alice';
      return (
        <PaintMixView
          event={event}
          sources={pourSources(board, lane, event.inputs, index)}
        />
      );
    }
    case 'dh.paintSend':
      return <PaintSendView event={event} />;
    case 'dh.paintShared':
      return <PaintSharedView event={event} />;
    case 'dh.paintEve': {
      const shared = events.find((e) => e.kind === 'dh.paintShared');
      return (
        <PaintEveView
          event={event}
          sharedRecipe={shared?.kind === 'dh.paintShared' ? shared.recipe : undefined}
        />
      );
    }
    case 'dh.paintLimit':
      return <PaintLimitView />;
    case 'dh.params':
      return <ParamsView event={event} />;
    case 'dh.private':
      return <PrivateView event={event} />;
    case 'dh.powStep':
      return <PowStepView event={event} />;
    case 'dh.publicKey':
    case 'dh.shared':
      return <PowResultView event={event} />;
    case 'dh.validate':
      return <ValidateView event={event} />;
    case 'dh.agree':
      return <AgreeView event={event} />;
    case 'dh.realGroups':
      return <RealGroupsView event={event} />;
    case 'dh.x25519':
      return <X25519View />;
    case 'dh.eveTry':
    case 'dh.eveSkip':
      return <EveSearchView events={events} index={index} />;
    case 'dh.eveFound':
      return <EveFoundView event={event} />;
    case 'dh.eveGrowth':
      return <EveGrowthView event={event} groupName={groupName} />;
    case 'dh.mitmIntercept':
      return <InterceptView event={event} />;
    case 'dh.mitmKeys':
      return <MitmKeysView event={event} />;
    case 'dh.mitmMessage':
      return <MitmMessageView event={event} />;
    case 'dh.mitmFix':
      return <MitmFixView />;
    default:
      return null;
  }
}
