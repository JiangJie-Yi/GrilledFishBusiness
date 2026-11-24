import { memo } from 'react'
import { StaticBatch } from '@/scene/render/StaticBatch'
import { EditBlock } from '@/shops/grill/editor/Movable'
import { BAR_GATES, GRILL_COUNTERS, GRILL_OFFSET, GRILL_SCALE } from '@/shops/grill/bar'
import { BarGate } from './barGate'
import { BarTop, LIP_TRIM, lipCorner, BarLip } from './barTop'
import { BarCounter } from './barCounter'
import { BarTableware, BarDrawers, BarChopsticks } from './barTableware'

/**
 * The bar (カウンター) the customers sit at while the shop is open, behind the fire: a long plank of pale hinoki on
 * a dark base, a raised lip on the customers' side, and a little plate with chopsticks on a rest at every seat —
 * the chef serves each piece onto it straight off the grill.
 */
function BarImpl() {
  // (where the second counter butts against the first, the first's lip stops short of it, so nothing runs through)
  // (and a way through for the staff at the outer end of each: the first counter's far end by the till, the side
  // counter's near end)
  // (and one top over both, in one piece round the corner, its edges rounded and flush where they meet)
  return (
    <group position={GRILL_OFFSET} scale={GRILL_SCALE}>
      {/* (the counters, their top and their drawers stand in edit mode's way: a press on them doesn't go on through to the kitchen floor
          behind (the owner's, 2026-11-15: the bar top beside a pair of chopsticks chose the charcoal sack)) */}
      <EditBlock>
        <StaticBatch plain>
          {GRILL_COUNTERS.map((c, i) => <BarCounter key={i} c={c} first={GRILL_COUNTERS.slice(0, i).reduce((s, x) => s + x.seats, 0)}
            trim={i === 0 && GRILL_COUNTERS.length > 1 ? LIP_TRIM : 0} butt={i > 0}
            gate={BAR_GATES[i]} noTop={GRILL_COUNTERS.length > 1} noLip={!!lipCorner()} />)}
          {GRILL_COUNTERS.length > 1 && <BarTop />}
          {lipCorner() && <BarLip />}
        </StaticBatch>
        {GRILL_COUNTERS.map((c, i) => <BarDrawers key={`drawers-${i}`} c={c} first={GRILL_COUNTERS.slice(0, i).reduce((s, x) => s + x.seats, 0)} />)}
      </EditBlock>
      {GRILL_COUNTERS.map((c, i) => BAR_GATES[i] && <BarGate key={i} c={c} gate={BAR_GATES[i]} />)}
      <BarTableware />
      <BarChopsticks />
    </group>
  )
}

// (drawn again only when their own props change, not each time the page above them redraws: while the shop's open that's many times a second)
export const Bar = memo(BarImpl)
