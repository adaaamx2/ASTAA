import "@fontsource-variable/manrope"
import "./library/library.css"
import SessionProvider from "./workspace/Session"
import VideoWorkspace from "./workspace/VideoWorkspace"
import OwnerGate from "./workspace/OwnerGate"
import { lazy, Suspense, useEffect, useState } from "react"
import { Text } from "./audio/controls"
const VoiceLabPage = lazy(() => import("./voice-lab/VoiceLabPage"))

export default function App() {
  const [voiceLab, setVoiceLab] = useState(() =>
    location.hash.startsWith("#characters"),
  )
  useEffect(() => {
    const route = () => setVoiceLab(location.hash.startsWith("#characters"))
    window.addEventListener("hashchange", route)
    return () => window.removeEventListener("hashchange", route)
  }, [])
  return (
    <SessionProvider>
      <OwnerGate>
        {voiceLab ? (
          <Suspense
            fallback={<Text role="status">Cargando personajes y voces…</Text>}
          >
            <VoiceLabPage />
          </Suspense>
        ) : (
          <VideoWorkspace />
        )}
      </OwnerGate>
    </SessionProvider>
  )
}
