import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeByMaterial } from '@/scene/StaticBatch'
import { inkModel } from '@/scene/inkHull'
import { useGLTF } from '@react-three/drei'
import { handOver } from '@/shops/grill/bar'
import { getEdit } from '@/shops/grill/edit'
import { setTip } from '@/scene/hoverTip'
import { getBgmOff, setBgmOff, useBgmOff } from '@/ui/kit/bgmStore'
import { useSfxMuted } from '@/scene/sfx'
import { MusicNotes } from './crates'

/**
 * The speaker (スピーカー) hung high in the room's corner, angled down toward the floor, as the ones over a shop's counter are: the model
 * from blender/speaker.py (a black cabinet with rounded edges, a domed perforated grille over a woofer and a horn tweeter, a U-shaped yoke on
 * an arm out from a wall plate, the cable looping down from the back). Click it (when not editing) to switch the music on, and again to switch it off; its
 * power light shows which.
 */
const SPEAKER_URL = import.meta.env.BASE_URL + 'models/speaker.glb'
/** the parts drawn with an ink line round them (the small ones, the grille and the light, without) */
const SPEAKER_INKED = /^Speaker(Cabinet|Yoke|WallPlate|Arm|Joint|Knob)/
/** the arm's length as the model has it (blender/speaker.py: WALL - YB), stretched from there to reach the corner */
const SPEAKER_ARM = 0.38 - 0.19

export function WallSpeaker() {
  const [lit, setLit] = useState(false)
  // (silent too while the sound's muted at the clock (the owner's): no thump, no notes, its lamp red)
  const bgmOff = useBgmOff(), muted = useSfxMuted()
  const off = bgmOff || muted
  const tag = () => setTip({ title: '音箱', hint: getBgmOff() ? '點一下開啟音樂' : '點一下關閉音樂' })
  const press = (e: { stopPropagation: () => void }) => { e.stopPropagation(); if (getEdit().on) return; setBgmOff(!getBgmOff()); tag() }
  const gltf = useGLTF(SPEAKER_URL) as unknown as { scene: THREE.Group }
  const model = useMemo(() => {
    const root = gltf.scene.clone(true)
    const toon = new Map<THREE.Material, THREE.MeshToonMaterial>()
    let led: THREE.MeshBasicMaterial | null = null
    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const src = m.material as THREE.MeshStandardMaterial
      if (src.name === 'SpeakerLED') {
        led = new THREE.MeshBasicMaterial()
        m.material = led
        return
      }
      let t = toon.get(src)
      if (!t) {
        // (the grille's holes are cut by its alpha: tested, not blended, so what's behind shows sharp and sorts right)
        const grille = src.name === 'SpeakerGrille'
        // (the cabinet, its grille and its arm a charcoal grey, not the model's near-black: in the toon light that came out a flat black slab,
        // a hole in the picture, with nothing of its shape or its grille to show what it was)
        const lift = /^Speaker(Grille|Frame|Steel)$/.test(src.name) ? 2.6 : 1
        const shell = src.name === 'SpeakerABS' || src.name === 'SpeakerBaffle'
        t = new THREE.MeshToonMaterial({ color: shell ? new THREE.Color(src.name === 'SpeakerABS' ? '#45484e' : '#2c2e32') : src.color.clone().multiplyScalar(lift),
          map: shell ? null : src.map, alphaTest: grille ? 0.5 : 0, side: grille ? THREE.DoubleSide : THREE.FrontSide })
        // (the badge's word: a little picture (SpeakerBadgePrint) on a quad a hair proud of it, its letters the picture's alpha)
        if (src.transparent) Object.assign(t, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 })
        t.name = src.name
        toon.set(src, t)
      }
      m.material = t
      m.castShadow = SPEAKER_INKED.test(m.name)
    })
    inkModel(root, (m) => !SPEAKER_INKED.test(m.name), { width: 0.004, weld: true })
    // (drawn a few parts at a time; the arm and its bracket, which reach back to the corner wherever it's put, on their own; the woofer's cone,
    // dust cap and surround on their own too, to thump with the music)
    // (tipped down 12 degrees on its bracket, as a shop's wall speaker hangs (the owner's: 10 to 15))
    const tilt = root.getObjectByName('SpeakerTilt')
    if (tilt) tilt.rotation.x = 0.21
    mergeByMaterial(root, (o) => /^Speaker(Arm|Mount)/.test(o.name) || /^Speaker(Cone|DustCap|Surround)$/.test(o.name))
    const thump = ['SpeakerCone', 'SpeakerDustCap', 'SpeakerSurround'].map((n) => root.getObjectByName(n)).filter((o): o is THREE.Object3D => !!o)
      .map((o) => ({ o, z: o.position.z, s: o.scale.clone() }))
    let grille: THREE.Object3D | null = null
    root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && (m.material as THREE.Material).name === 'SpeakerGrille') grille = m })
    const g = grille as THREE.Object3D | null
    return { root, led: led as THREE.MeshBasicMaterial | null, toon: [...toon.values()], thump, grille: g ? { o: g, z: g.position.z } : null }
  }, [gltf])
  // (the bass while the music plays (the owner's): every half beat at 120 a minute the woofer's cone pushes out along the speaker's face and
  // swells a little, then springs back; the grille in front of it, which hides most of it, nudged out with it)
  const beat = useRef(0)
  useFrame((_, dt) => {
    const k = off ? 0 : Math.exp(-((beat.current = (beat.current + Math.min(dt, 0.1)) % 0.5) / 0.5) * 9)
    for (const t of model.thump) { t.o.position.z = t.z + 0.005 * k; t.o.scale.copy(t.s).multiplyScalar(1 + 0.04 * k) }
    if (model.grille) model.grille.o.position.z = model.grille.z + 0.002 * k
  })
  useEffect(() => { model.led?.color.set(off ? '#d02a2a' : '#3ddc6a') }, [model, off])
  // (the arm reaches back to the room's corner and the bracket sits in it: found by a ray from the arm's joint straight back, so it still fits
  // wherever the speaker's been moved to. Looked for every half second only until two looks agree, and again once it's moved: asked all the
  // time, the ray caught whatever passed behind it (the notes it plays drifting by among them) and the arm went in and out, on and on)
  const { scene: room, camera } = useThree()
  const outer = useRef<THREE.Group>(null)
  const reachAt = useRef(0)
  const found = useRef({ at: new THREE.Vector3(Infinity, 0, 0), dir: new THREE.Vector3(), len: -1, sure: false })
  useFrame((st) => {
    if (st.clock.elapsedTime - reachAt.current < 0.5) return
    reachAt.current = st.clock.elapsedTime
    const reach = model.root.getObjectByName('SpeakerArmReach'), mount = model.root.getObjectByName('SpeakerMount')
    if (!reach || !mount) return
    // (an arm left broken by a look gone wrong (its stretch not a number) put back to as it's made first: from it, every look after went
    // wrong the same way, and its mesh, everywhere at once, took every click in the editor (item 213: a click on empty space chose the speaker))
    if (!Number.isFinite(reach.scale.z) || !Number.isFinite(mount.position.z)) { reach.scale.z = 1; mount.position.z = reach.position.z - SPEAKER_ARM; found.current.sure = false }
    reach.updateWorldMatrix(true, false)
    const from = reach.getWorldPosition(new THREE.Vector3())
    // (straight back in the arm's parent's frame, not its own: its own has its stretch in it, and squashed to nothing as it's first laid out (the
    // editor's pieces are), the way back came out of it as no way at all)
    const back = new THREE.Vector3(0, 0, -1).transformDirection((reach.parent ?? reach).matrixWorld)
    if (![from.x, from.y, from.z, back.x, back.y, back.z].every(Number.isFinite) || back.lengthSq() < 0.5) return
    const f = found.current
    const still = from.distanceToSquared(f.at) < 1e-6 && back.dot(f.dir) > 0.99999
    if (still && f.sure) return
    const ray = new THREE.Raycaster(from, back, 0.03, 2)
    ray.camera = camera
    ray.params.Line = { threshold: 0 }
    ray.params.Points = { threshold: 0 }
    const mine = (o: THREE.Object3D | null) => {
      for (; o; o = o.parent) if (o === model.root || o === outer.current || o.userData.fadeOccluder || o.userData.fade || o.userData.editHandle) return true
      return false
    }
    const hit = ray.intersectObjects(room.children, true).find((h) => (h.object as THREE.Mesh).isMesh && !mine(h.object))
    if (!hit) return
    // (the distance in the arm's own units: by its parent's scale, not its own, which is the stretch itself: by its own, each look undid the
    // last, the arm long, then short, then long again every half second)
    const k = (reach.parent ?? reach).getWorldScale(new THREE.Vector3()).z || 1
    const len = Math.max(0.05, hit.distance / k)
    if (!Number.isFinite(len)) return
    // (sure once the same wall's found twice from the same place)
    f.sure = still && Math.abs(len - f.len) < 0.002
    f.at.copy(from); f.dir.copy(back); f.len = len
    reach.scale.z = len / SPEAKER_ARM
    mount.position.z = reach.position.z - len
  })
  // (pointed at, it lifts a little out of the dark, to say it can be clicked)
  useEffect(() => { for (const t of model.toon) t.emissive.set(lit ? '#2a2a30' : '#000000') }, [model, lit])
  return (
    <group ref={outer} name="look-speaker" onClick={press} onPointerOver={(e: { stopPropagation: () => void }) => { e.stopPropagation(); if (getEdit().on) return; setLit(true); handOver.onPointerOver(e as never); tag() }}
      onPointerOut={(e: { stopPropagation: () => void }) => { setLit(false); handOver.onPointerOut(e as never); setTip(null) }} >
      <MusicNotes playing={!off} />
      {/* (the handlers on a group round it: a primitive's own aren't attached) */}
      <primitive object={model.root} />
    </group>
  )
}
useGLTF.preload(SPEAKER_URL)
