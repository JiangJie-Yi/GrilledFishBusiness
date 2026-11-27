import { memo, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { signTexture } from './signFont'
import { goldSakura, navyWaves, sakuraStream, tealWaves } from './wafuMats'

/**
 * A mat on the floor or a cloth on a table with one of the owner's four 和風 pictures (item 763, scene/props/wafuMats): a thin board `w` by `d`
 * (its long side along x), `t` thick, its picture on its top inside a border band `edge` wide (a rubber mat's or a cloth's hem: `rim` its
 * colour, a stitched line along its inner edge), its sides the border's colour. Its bottom at its origin. One draw, toon with its picture
 * (one program with the gravel's); each picture made once and shared (module-level), sized to the mat's own shape
 */
export type MatArt = 'sakuraStream' | 'navyWaves' | 'tealWaves' | 'goldSakura'
const PAINT = { sakuraStream, navyWaves, tealWaves, goldSakura }
const LOOKS = new Map<string, THREE.MeshToonMaterial>()
function look(art: MatArt, w: number, d: number, edge: number, rim: string, stitch: string) {
  const key = `${art}|${w.toFixed(3)}|${d.toFixed(3)}|${edge}|${rim}|${stitch}`
  const had = LOOKS.get(key)
  if (had) return had
  // (about 600 pixels along its longer side; its border in proportion)
  const k = 600 / Math.max(w, d), cw = Math.round(w * k), ch = Math.round(d * k), e = Math.max(4, Math.round(edge * k))
  const tex = signTexture(cw, ch, (g) => {
    g.fillStyle = rim; g.fillRect(0, 0, cw, ch)
    PAINT[art](g, e, e, cw - 2 * e, ch - 2 * e)
    // (the stitches along the border's inner edge, and a shade where the picture meets it)
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1.5; g.strokeRect(e + 0.75, e + 0.75, cw - 2 * e - 1.5, ch - 2 * e - 1.5)
    g.setLineDash([5, 4]); g.strokeStyle = stitch; g.lineWidth = 1.4
    g.strokeRect(e * 0.5, e * 0.5, cw - e, ch - e)
    g.setLineDash([])
  })
  if (tex) tex.anisotropy = 8
  const m = new THREE.MeshToonMaterial({ map: tex })
  m.name = `PatternMat-${art}`
  LOOKS.set(key, m)
  return m
}
export const PatternMat = memo(function PatternMat({ art, w, d, t = 0.004, edge = 0.025, rim = '#2a2622', stitch = 'rgba(220,210,190,0.7)', castShadow = false }: {
  art: MatArt; w: number; d: number; t?: number; edge?: number; rim?: string; stitch?: string; castShadow?: boolean
}) {
  const geo = useMemo(() => new THREE.BoxGeometry(w, t, d).translate(0, t / 2, 0), [w, t, d])
  useEffect(() => () => geo.dispose(), [geo])
  const mat = useMemo(() => look(art, w, d, edge, rim, stitch), [art, w, d, edge, rim, stitch])
  return <mesh geometry={geo} material={mat} receiveShadow castShadow={castShadow} />
})
