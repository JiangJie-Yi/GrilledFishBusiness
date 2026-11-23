import { memo, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { whoOver } from './hoverTip'
import { glowOff, glowOn } from './hoverGlow'

const BOX = new THREE.BoxGeometry(1, 1, 1)
const INV = new THREE.Matrix4()
const M = new THREE.Matrix4()
const B = new THREE.Box3()
const ALL = new THREE.Box3()

/**
 * The pointer's way onto a person (the owner's: anyone in the shop named as the pointer's over them): an unseen box round the figure it's
 * put beside (its parent's meshes, measured a few times as they load), so the pointer never has to test the figure's skinned mesh itself
 * (every vertex through its bones: dear); its tag their name in the speakers' yellow. `onPointerDown`: what grabbing them does (customers
 * only: the owner and the staff can't be dragged, they keep to their work).
 */
/** someone being carried just now (GuestBar3D's drag): their glow and the closed hand kept on while the pointer slips off them */
export const GRABBING = { on: false }
/** whether it's a person's box (what the pointer meets first, a person: what's behind them is theirs not to answer, DormRoom, item 540) */
export const isFigureHit = (o: THREE.Object3D | null | undefined) => !!o?.userData.figureHit
const NO_CAST = () => {}
/** whether it and everything it hangs from is shown */
const shownFrom = (o: THREE.Object3D | null) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true }
// (item 374: drawn again only when its callbacks are new ones: a customer's are made once for them, GuestBar3D's hitOf)
export const FigureHit = memo(FigureHitImpl)
function FigureHitImpl({ title, hint, onPointerDown, grabbable, cursor }: { title: () => string; hint?: () => string
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  /** the pointer's own picture over them just now (a CSS cursor, item 624: the owner's hands), or none: the plain one */
  cursor?: () => string | null
  /** whether they can be picked up just now: the open hand over them, and they glow (the owner's), as the things in the room that can */
  grabbable?: () => boolean }) {
  const box = useRef<THREE.Mesh>(null)
  const fits = useRef(0)
  const over = useMemo(() => {
    const w = whoOver(title, hint)
    if (!grabbable && !cursor) return w
    let mine = ''
    return {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        w.onPointerOver(e)
        const el = e.nativeEvent?.target as HTMLElement | null
        // (their own pointer over them (item 624), else the grabbing hand where they can be taken up)
        const own = cursor?.() ?? null
        if (own && el?.style) { el.style.cursor = own; mine = el.style.cursor }
        if (!grabbable?.()) return
        if (!own && el?.style) { el.style.cursor = 'grab'; mine = 'grab' }
        glowOn(e.eventObject.parent)
      },
      onPointerOut: (e: ThreeEvent<PointerEvent>) => {
        w.onPointerOut(e)
        if (GRABBING.on) return
        const el = e.nativeEvent?.target as HTMLElement | null
        if (el?.style && mine && el.style.cursor === mine) el.style.cursor = ''
        mine = ''
        glowOff(e.eventObject.parent)
      },
    }
  }, [title, hint, grabbable, cursor])
  useFrame(() => {
    const me = box.current, p = me?.parent
    if (!me || !p) return
    // (a figure not shown (upstairs while at work, gone home) isn't pointed at (item 540): R3F points at hidden meshes too, and its box
    // took the pointer where nobody was, their name over an empty cushion and nothing behind it answering)
    const on = shownFrom(p)
    if (on !== me.userData.on) { me.userData.on = on; me.raycast = on ? THREE.Mesh.prototype.raycast : NO_CAST }
    if (fits.current > 3) return
    // (its parent's meshes in the parent's own frame, the box itself and the ink apart)
    p.updateWorldMatrix(true, true)
    INV.copy(p.matrixWorld).invert()
    ALL.makeEmpty()
    p.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh || m === me || !m.visible || (m.material as THREE.Material)?.side === THREE.BackSide) return
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
      ALL.union(B.copy(m.geometry.boundingBox!).applyMatrix4(M.multiplyMatrices(INV, m.matrixWorld)))
    })
    if (ALL.isEmpty()) return
    fits.current++
    // (a little narrower than the figure: its neighbour at the bar is theirs to point at)
    ALL.getCenter(me.position)
    ALL.getSize(me.scale)
    me.scale.x *= 0.8
    me.scale.z *= 0.8
  })
  return <mesh ref={box} geometry={BOX} visible={false} userData={{ figureHit: true }} {...over} onPointerDown={onPointerDown} />
}
