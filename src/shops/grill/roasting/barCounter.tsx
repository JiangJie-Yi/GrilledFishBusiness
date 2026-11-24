import { memo } from 'react'
import * as THREE from 'three'
import { LIP_H, seatAlong, gateCut, type Gate, BAR_BASE_Z, type Counter } from '@/shops/grill/bar'
import { BAR_TOP } from './barPlaces'
import { TRAY_WOOD, BAR_BASE_WOOD, panelBox } from './common'
import { COVE_GLOW, ROUNDED_SLAB, KOSHI_H, RAIL_H, EDO_LATTICE_MAT, EDO_KOSHI_MAT, LIP_INK, lipSpanOf, koshiBox, lipSheet } from './barTop'
import { SEAT_TAG, SeatTag } from './seatTags'
import { DRAWER, BarPiece } from './barTableware'

function BarCounterImpl({ c, first = 0, trim = 0, gate, noTop = false, noLip = false, butt = false }: { c: Counter; first?: number; trim?: number; gate?: Gate
  /** its far end runs into the first counter's side (its lip runs on into the first one's, so they meet with no gap) */
  butt?: boolean
  /** its top drawn with the others' as one piece (BarTop), not its own */
  noTop?: boolean
  /** its lip drawn with the other's as one L (BarLip), not its own */
  noLip?: boolean }) {
  const yaw = Math.atan2(-c.along.z, c.along.x)
  const L = c.length
  const G = gate ? gateCut(gate) : 0
  const end = gate?.end ?? 1
  // (the base, short of the gate)
  const baseL = L + 0.2 - G
  const baseX = -end * G / 2
  // (a counter butting into another runs its base on into the other's, so no slot opens between them at the corner (the owner saw the
  // floor through one: the side counter's base stopped 8 cm short of the long one's back))
  const run = butt ? 0.12 : 0
  const lipSpan = lipSpanOf(c, trim, butt, gate)
  // (where the top starts, on the near end: short of a gate there)
  return (
    <group position={c.at} rotation-y={yaw}>
      {!noTop && (
        <>
          <mesh position-y={BAR_TOP - 0.03} scale={[L + 0.3, 0.06, 0.62]} castShadow receiveShadow geometry={ROUNDED_SLAB}>
            <meshToonMaterial color="#ffffff" map={TRAY_WOOD} />
          </mesh>
          <mesh position-y={BAR_TOP - 0.03} scale={[(L + 0.3) * 1.008, 0.06 * 1.25, 0.62 * 1.035]} geometry={ROUNDED_SLAB}>
            <meshBasicMaterial color="#3b2a20" side={THREE.BackSide} />
          </mesh>
        </>
      )}
      {/* the cove light: a warm strip tucked into the inside corner where the top's underside meets the base, behind a little lip of the
          base's dark wood, so it's the base it lights and not the strip that's seen; its glow washing a little way down the base (it was
          out under the top's front edge, a bright bar in plain sight) */}
      <mesh name="bar-cove" position={[baseX, BAR_TOP - 0.066, BAR_BASE_Z[0] - 0.012]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[baseL, 0.012]} /><meshBasicMaterial color="#ffcf88" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[baseX, BAR_TOP - 0.074, BAR_BASE_Z[0] - 0.022]}>
        <boxGeometry args={[baseL, 0.022, 0.006]} /><meshToonMaterial color="#3a281a" />
      </mesh>
      {/* (held well off the base's face and drawn over it: a hair's breadth off, it fought the face for the same depth and flickered) */}
      <mesh position={[baseX, (BAR_TOP - 0.06) * 0.62, BAR_BASE_Z[0] - 0.007]} rotation-y={Math.PI}>
        <planeGeometry args={[baseL, (BAR_TOP - 0.06) * 0.76]} />
        {/* (laid on as light, added to the boards under it, not painted over them: their grain shows through the glow) */}
        <meshBasicMaterial map={COVE_GLOW} transparent depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {/* the base stands back on the cook's side, so the customers' knees go under the top: dark cedar boards standing in a frame, their
          grain at one scale along it (the table's own panelling, darker), the cove light washing down them */}
      {/* (it stands in the top's shadow, lit by nothing but the cove light: its boards glow a little with it, grain and all, or they'd be black) */}
      {/* (set back from the top's front edge clear of the drawer cases under the top: BAR_BASE_Z) */}
      <mesh position={[baseX + run / 2, (BAR_TOP - 0.06) / 2, (BAR_BASE_Z[0] + BAR_BASE_Z[1]) / 2]} castShadow
        geometry={panelBox(baseL + run, BAR_TOP - 0.06, BAR_BASE_Z[1] - BAR_BASE_Z[0], 0.55)}>
        <meshToonMaterial color="#d4c2b0" map={BAR_BASE_WOOD} emissive="#ffffff" emissiveMap={BAR_BASE_WOOD} emissiveIntensity={0.26} />
      </mesh>
      {/* the raised lip on the cook's side, the step the food is handed over */}
      {/* (stopping short of where the other counter butts on, and of the gate's flap) */}
      {!noLip && (() => {
        // (where the two counters' lips meet at the corner, each runs a little into the other: no notch between their
        // rounded ends)
        // (the first counter's lip starts where the side counter's now stands, drawn in from the wall by SIDE_PULL)
        const [x0, x1] = lipSpan, L = x1 - x0, LAT = LIP_H - KOSHI_H - RAIL_H
        // (in the Edo way, wood and bamboo (item 313): its carved panel at the foot, the bamboo lattice open over it, the rail along its top;
        // the lattice's sheet just behind the customers' face, both its sides seen)
        return (
          <group position={[(x0 + x1) / 2, BAR_TOP, 0.28]}>
            <mesh geometry={koshiBox(L)} position-y={KOSHI_H / 2} castShadow material={EDO_KOSHI_MAT!} />
            <mesh geometry={ROUNDED_SLAB} position-y={KOSHI_H / 2} scale={[L * 1.003, KOSHI_H * 1.1, 0.07]} material={LIP_INK} />
            <mesh geometry={lipSheet(L - 0.01, LAT + 0.004)} position={[0, KOSHI_H + LAT / 2, -0.027]} material={EDO_LATTICE_MAT!} castShadow />
            <mesh geometry={ROUNDED_SLAB} position-y={LIP_H - RAIL_H / 2} scale={[L, RAIL_H, 0.06]} castShadow><meshToonMaterial color="#ffffff" map={TRAY_WOOD} /></mesh>
            <mesh geometry={ROUNDED_SLAB} position-y={LIP_H - RAIL_H / 2} scale={[L * 1.003, RAIL_H * 1.14, 0.07]} material={LIP_INK} />
          </group>
        )
      })()}
      {Array.from({ length: c.seats }, (_, n) => {
        const x = seatAlong(c, n)
        return (
          <group key={n} position={[x, BAR_TOP, 0]}>
            {/* (the case its drawer runs in, under the top's edge on the customer's side, to their right: BarDrawers draws the drawer) */}
            <group position={[DRAWER.x, -0.06, DRAWER.z]}><BarPiece name="BarDrawerCase" grain={n} /></group>
            {/* (each customer's plate is set down a little back of the middle of their place and cleared away by GuestBar3D) in front of it,
                nearest them, the pair of chopsticks laid across, their tips to the customer's left (+x) up on the rest, which lies across
                them; behind on the left the little soy dish (on the right instead at a seat where it'd be off the top, by the gate) */}
            {/* (the chopsticks and their rest, the soy dish, the soy pot and wasabi: pieces of their own now, BarTableware) */}
            {/* (the place's number, on the screen behind it; standing, where there's none) */}
            {/* (on the screen if the board and its skewer's ends (2 cm past it) keep a centimetre in from the screen's ends) */}
            <SeatTag k={first + n} onLip={x - SEAT_TAG.L / 2 - 0.03 > lipSpan[0] && x + SEAT_TAG.L / 2 + 0.03 < lipSpan[1]} />
          </group>
        )
      })}
    </group>
  )
}
export const BarCounter = memo(BarCounterImpl)
