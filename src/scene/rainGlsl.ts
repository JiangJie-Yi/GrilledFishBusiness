// Rain falling past a window, for the views in depth through the shop's windows (item 623, the owner's 「有時候窗外會下雨」: the round
// window's (shops/grill/DiningRoom's ROUND_VIEW) and the room upstairs' (scene/alleyView)): a GLSL chunk of their fragment shaders. A layer of
// rain is streaks falling through cells of a grid at a depth: only some cells have one, each its own place across, its own length and
// phase, slanting a little with the wind; the view's colours dulled and greyed under it. Its strength `uRain` (0 dry: nothing of it drawn)
// and its time `uRainT` are uniforms, set each frame from the day's weather (game/weather): no program's made again as it starts or stops.

/** the chunk: its uniforms and its functions; a view's main calls rainLayer at a depth for each layer and rainDull over what's behind */
export const RAIN_GLSL = `
uniform float uRain;
uniform float uRainT;
float rainHash(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
// (a layer of streaks over the point p (the window's units at its depth): falling 'fall' a second through cells 'cell' (across, up), each
// streak 'len' of its cell long and 'width' wide)
float rainLayer(vec2 p, float t, vec2 cell, float fall, float len, float width, float seed) {
  p.x += p.y * 0.09;
  p.y += t * fall;
  vec2 g = p / cell, id = floor(g), f = fract(g);
  float h = rainHash(id + seed), h2 = rainHash(id + seed + 17.0);
  if (h > 0.62) return 0.0;
  float dx = abs(f.x - (0.15 + 0.7 * h2)) * cell.x;
  float y = fract(f.y + h * 3.7);
  float along = smoothstep(0.0, 0.3, y) * (1.0 - smoothstep(len - 0.06, len, y)) * step(y, len);
  return along * (1.0 - smoothstep(width * 0.35, width, dx)) * (0.6 + 0.4 * h2);
}
// (what's out there under the rain: duller, greyer, a little darker)
vec3 rainDull(vec3 c, float k) { return mix(c, c * 0.74 + vec3(0.07, 0.075, 0.085), k * 0.75); }
const vec3 RAIN_INK = vec3(0.72, 0.76, 0.82);
`

/** the uniforms the chunk reads, for a view's material */
export const rainUniforms = () => ({ uRain: { value: 0 }, uRainT: { value: 0 } })
