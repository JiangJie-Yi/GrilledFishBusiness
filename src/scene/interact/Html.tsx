import { Html as DreiHtml } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useState, type ComponentProps } from 'react'

/**
 * drei's <Html>, put up a frame after it's mounted, once the scene's pointer events are connected (item 580, the Tester's robust b7). The
 * window shrunk to a phone's width and grown back, the 3D was put up again with every model already loaded, and eight of these were drawn in
 * the canvas's first render, which R3F commits there and then, inside the page's own commit: in development React mounts each new effect,
 * takes it down and mounts it again (StrictMode), and drei's <Html> takes its own React root down as it goes, so eight roots were unmounted
 * while the page's React was still committing ("Attempted to synchronously unmount a root while React was already rendering"). A frame on,
 * it's one of R3F's own commits; and with the events connected, the element it's drawn in is the one it keeps (before, the canvas's parent,
 * then that root made again in the events' element). The first load never met it: its labels came after the models. The same props as drei's
 */
export function Html(props: ComponentProps<typeof DreiHtml>) {
  const connected = useThree((s) => !!s.events.connected)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true))
    return () => cancelAnimationFrame(id)
  }, [])
  return ready && connected ? <DreiHtml {...props} /> : null
}
