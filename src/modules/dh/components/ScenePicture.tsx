import type { DhEvent } from '@/core/dh/events';

import { EveFoundView, EveGrowthView, EveSearchView } from './EveView';
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
 * The picture for one step of the exchange, Eve and MITM scenes. Loaded after hydration
 * through `../runs` and rendered from the loaded module, not through `next/dynamic`, so
 * nothing suspends while a learner steps. The paint scene's views are in `./PaintViews`.
 */
export function ScenePicture({
  event,
  events,
  index,
  groupName,
}: {
  event: DhEvent;
  events: readonly DhEvent[];
  index: number;
  groupName?: string;
}) {
  switch (event.kind) {
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
