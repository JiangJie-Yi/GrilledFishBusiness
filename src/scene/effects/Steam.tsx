import { memo, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { snoise as noise } from '@/scene/shaders/noise'
import { sameProps } from '@/scene/kit/sameProps'
import { crossedSheets } from './sheets'

// (item 804: a steam's sheets in one geometry, drawn at once: each vertex with its sheet's seed (aSeed) and its sheet's turn about the upright
// (aTurn, its cos and sin), already turned by it; the twist is about the upright too, so it comes out the same either side of the turn, and
// the drift, in the sheet's own frame as each sheet was drawn by itself, is turned with it)
const vertexShader = /* glsl */ `
uniform float uTime;
attribute float aSeed;
attribute vec2 aTurn;
varying vec2 vUv;
varying float vSeed;
${noise}
void main() {
  vUv = uv;
  vSeed = aSeed;
  vec3 p = position;
  float h = uv.y;
  // twist and drift more the higher the steam rises
  float twist = snoise(vec2(h * 0.6 - uTime * 0.05, aSeed)) * 2.5 * h;
  float s = sin(twist);
  float c = cos(twist);
  p.xz = mat2(c, -s, s, c) * p.xz;
  vec2 drift = vec2(snoise(vec2(h * 0.8 - uTime * 0.12, aSeed + 10.0)), snoise(vec2(h * 0.8 - uTime * 0.12, aSeed + 20.0))) * 0.3 * h * h;
  p.xz += mat2(aTurn.x, -aTurn.y, aTurn.y, aTurn.x) * drift;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;
uniform vec3 uShade;
uniform float uSpeed;
varying vec2 vUv;
varying float vSeed;
${noise}
void main() {
  vec2 uv = vec2(vUv.x * 0.6, vUv.y * 0.35 - uTime * uSpeed);
  float n = (snoise(uv * 3.0 + vSeed) * 0.5 + 0.5)
          + (snoise(uv * 7.0 - vSeed) * 0.5 + 0.5) * 0.5;
  n /= 1.5;
  float steam = smoothstep(0.45, 1.0, n);
  steam *= smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
  steam *= smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.4, vUv.y);
  // soft-edged puffs: a wide ramp at the rim so they melt into the air
  float puff = smoothstep(0.12, 0.42, steam);
  float core = smoothstep(0.4, 0.62, steam);
  vec3 col = mix(uShade, uColor, core);
  gl_FragColor = vec4(col, puff * uOpacity);
}
`

type SteamProps = ThreeElements['group'] & {
  layers?: number
  width?: number
  height?: number
  opacity?: number
  /** puff colour and the shadow band inside it; defaults are white steam with a blue shade */
  color?: string
  shade?: string
  /** how fast the puffs rise */
  speed?: number
  /** 0..1, read every frame and multiplied into the opacity (e.g. how hard the soup is boiling) */
  level?: RefObject<number>
  /** turned about the upright to face the camera, its sheets fanned a little either side of facing it, not crossed all round (item 242: the
   * grill's smoke, seen from above in the grill view, was its crossed sheets edge-on, near nothing even with the fire smoking hard) */
  face?: boolean
}
const FACE_AT = new THREE.Vector3()
const FACE_Q = new THREE.Quaternion()
const FACE_E = new THREE.Euler()

/** the turn of a steam's sheet `i` of `layers` about the upright: fanned a little either side of facing (face), or crossed all round */
const turnOf = (i: number, layers: number, face: boolean) => (face ? (i / Math.max(1, layers - 1) - 0.5) * 0.8 : (i * Math.PI) / layers)

/** each kind of steam's sheets, made once and shared by every steam of that kind (each dish's had its own, let go as it went: in development,
 * where React makes each twice and keeps one, the other was never let go); its `layers` planes turned as the separate sheets were, in one
 * geometry (item 804: one draw for the lot; the grill's smoke was 7, its black smoke 5, a dish's 2 or 3), each vertex with its sheet's seed and
 * turn (the vertex shader's aSeed, aTurn) */
const SHEETS = new Map<string, THREE.BufferGeometry>()
function sheetsOf(width: number, height: number, layers: number, face: boolean) {
  const key = `${width}|${height}|${layers}|${face ? 1 : 0}`
  let g = SHEETS.get(key)
  if (!g) {
    const plane = new THREE.PlaneGeometry(width, height, 8, 28)
    plane.translate(0, height / 2, 0)
    g = crossedSheets(plane, layers, (i) => turnOf(i, layers, face), (i) => i * 7.31)
    plane.dispose()
    SHEETS.set(key, g)
  }
  return g
}

/** steam's materials put by when a steam goes, for the next: disposed, the last of them let their program go and the next steam (a dish
 * served every few seconds) linked it again, a hitch each time; as many as were ever up at once, no more (one a steam: its sheets' seeds are
 * in its geometry) */
const SPARE: THREE.ShaderMaterial[] = []
function steamMaterial() {
  const m = SPARE.pop() ?? new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color() },
      uShade: { value: new THREE.Color() },
      uSpeed: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  m.uniforms.uOpacity.value = 0
  return m
}

/** Rising steam (or smoke) built from a few crossed, noise-animated planes. */
// (drawn again only when its props change: a position handed down as a new [x, y, z] with the same numbers is the same place)
export const Steam = memo(SteamImpl, sameProps)
function SteamImpl({ layers = 4, width = 1.1, height = 1.6, opacity = 0.55, color = '#ffffff', shade = '#e6f0fc',
  speed = 0.07, level, face = false, ...props }: SteamProps) {
  const geometry = useMemo(() => sheetsOf(width, height, layers, face), [width, height, layers, face])

  // (taken as it's shown and put by as it goes: made while drawing, a copy React makes and drops (in development) would never come back)
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null)
  useLayoutEffect(() => {
    const m = steamMaterial()
    setMaterial(m)
    return () => { SPARE.push(m) }
  }, [])
  const time = useRef(0)
  const group = useRef<THREE.Group>(null)
  useFrame(({ camera }, delta) => {
    time.current += delta
    // gentle steam is also lower: wisps hug the surface, a full boil rises its whole height
    if (group.current && level) group.current.scale.y = 0.35 + 0.65 * level.current
    // (none at all: not drawn (item 227: the grill's black smoke, at nothing but while something burns, and its pale smoke between batches,
    // were their sheets drawn see-through every frame, a dozen draws for nothing); the same program as the rest of the steam, made at load)
    if (group.current && level) group.current.visible = level.current > 0.004
    // (facing the camera: its turn in the world toward it, less what its parent's turned)
    if (face && group.current?.parent) {
      const g = group.current
      g.getWorldPosition(FACE_AT)
      const yaw = Math.atan2(camera.position.x - FACE_AT.x, camera.position.z - FACE_AT.z)
      g.parent!.getWorldQuaternion(FACE_Q)
      g.rotation.y = yaw - FACE_E.setFromQuaternion(FACE_Q, 'YXZ').y
    }
    if (material) {
      const u = material.uniforms
      u.uTime.value = time.current
      u.uOpacity.value = opacity * (level ? level.current : 1)
      u.uColor.value.set(color)
      u.uShade.value.set(shade)
      u.uSpeed.value = speed
    }
  })

  return (
    <group ref={group} {...props}>
      {material && <mesh geometry={geometry} material={material} renderOrder={1} />}
    </group>
  )
}
