// The level of detail a device starts at, from what it says of itself (item 568): its graphics chip's name, memory, cores, a touch
// screen, a Mac. Pure, so it can be tested (BDD gpu-tier); scene/quality reads the browser and keeps the step down after a lost view.
//
// (a desktop or laptop used to get the best whatever it had: sharp shadows of 2048 and the canvas at twice the screen's pixels on a
// laptop's own graphics too, where most of the world plays: Intel's UHD and Iris, AMD's built-in Radeon. The frame pacer then dropped the
// resolution once it was lagging, but the shadows and the antialiasing it can't change once the view's made. Now those start a level
// lower; a separate card, or a strong built-in one (Intel Arc, Radeon 680M/780M), still the best)

export type GpuTier = 'low' | 'medium' | 'high'

export type DeviceInfo = {
  /** the graphics chip as WebGL names it (unmasked when it can be; '' when it's not told) */
  gpu: string
  /** a touch screen with no mouse (hover: none) */
  touch: boolean
  mac: boolean
  /** navigator.deviceMemory (GB; Chrome tells at most 8), when it's told */
  mem?: number
  /** navigator.hardwareConcurrency, when it's told */
  cores?: number
}

/** drawn by the processor, not a graphics chip: the lightest, whatever else it is */
const SOFTWARE = /SwiftShader|llvmpipe|softpipe|Microsoft Basic Render|Software Rasterizer/i

/** old phone and tablet chips */
const OLD_MOBILE = /Mali-[4T]|Mali-G(31|51|52|57)|Adreno \(TM\) [3-5]\d\d|PowerVR|Adreno \(TM\) 6[0-1]\d/i
const STRONG_MOBILE = /Adreno \(TM\) (7[3-9]\d|8\d\d)|Apple GPU|Immortalis/i

/** a laptop's or desktop's built-in graphics, old: Intel's HD Graphics before UHD (HD 4000, 520, 620…) */
const OLD_BUILT_IN = /Intel.*\bHD Graphics\b/i
/** a built-in one of now: Intel UHD and Iris, AMD's Radeon on the processor (named "Radeon Graphics", Vega, R-series); NVIDIA's MX and old
 * laptop GeForces */
const BUILT_IN = /Intel.*(UHD|Iris)|Intel\(R\) Graphics|Radeon(\(TM\))? (Graphics|Vega|R[2-7]\b)|GeForce (MX|\d{3}MX?\b|GT \d|9\d\dM?\b)/i
/** built in but strong enough for the best */
const STRONG_BUILT_IN = /Intel.*Arc|Radeon(\(TM\))? (6[5-9]0M|7[4-9]0M|8\d0M)/i

export function gpuTier(d: DeviceInfo): GpuTier {
  if (SOFTWARE.test(d.gpu)) return 'low'
  if (d.touch) {
    // (as it was before: a phone or tablet judged by its chip, memory and cores)
    const mem = d.mem ?? 4
    const cores = d.cores ?? 4
    if (OLD_MOBILE.test(d.gpu)) return 'low'
    if (mem <= 3 || cores <= 4) return 'low'
    return mem >= 8 && STRONG_MOBILE.test(d.gpu) ? 'high' : 'medium'
  }
  // a desktop or laptop
  if ((d.cores ?? 8) <= 2) return 'low'
  if (OLD_BUILT_IN.test(d.gpu) && !BUILT_IN.test(d.gpu)) return 'low'
  // (a Mac one level less, the owner's: a MacBook with 8 GB, its graphics sharing that memory, lost the 3D view with everything at its finest)
  if (d.mac) return 'medium'
  if (STRONG_BUILT_IN.test(d.gpu)) return 'high'
  if (BUILT_IN.test(d.gpu)) return 'medium'
  if ((d.mem ?? 8) <= 4) return 'medium'
  return 'high'
}
