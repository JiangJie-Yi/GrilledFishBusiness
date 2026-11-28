// (first of all, in development: every texture and shape noted as it's made, to let go of what a hot update leaves behind)
import '@/scene/render/gpuSweep'
// (the site's models and pictures fetched anew as they change: each one's address with its content's hash, item 478)
import '@/scene/render/assetVersions'
// (and a phone fetches none of the 3D shop: it draws it flat)
import '@/scene/render/flatGate'
// (the sun only out of doors (item 721): three's lighting chunk with the shop's indoor boxes in it, before any program's made)
import '@/scene/render/indoorSun'
// (models whose pictures are KTX2 read with a KTX2 loader, item 571)
import '@/scene/render/ktx2'
// (the pictures the game paints, kept off the graphics card: they survive its resets)
import '@/scene/render/canvasKeep'
import '@/scene/render/triProfiler'
// (what's hidden not placed afresh every frame: three's matrix update going into every hidden group's insides, item 804)
import '@/scene/render/hiddenMatrices'
// (every sound effect through one switch: muted together from the clock, top right)
import '@/scene/interact/sfx'
// (every button's press sinks at once and springs back as it's let go, as an iPhone's: item 179)
import '@/ui/kit/pressFeel'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { Crash } from '@/ui/screens/Crash'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Crash>
      <App />
    </Crash>
  </StrictMode>,
)

// started fine: a later failed load (after another deploy) may retry again
try {
  sessionStorage.removeItem('canteen-boot-retry')
} catch {
  // storage blocked
}
