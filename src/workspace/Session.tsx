import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { api, StudioRequestError, type StudioSession } from "../motion-lab/api"
import { authRequest, credentials, type Credentials } from "./auth"
interface Access {
  token: string
  session: StudioSession | null
  checking: boolean
  error: string
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
}
const Context = createContext<Access | null>(null)
export default function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("yt-owner-auth") || "null")
          ?.access_token ||
        sessionStorage.getItem("yt-studio-session") ||
        ""
      )
    } catch {
      return ""
    }
  })
  const [session, setSession] = useState<StudioSession | null>(null),
    [checking, setChecking] = useState(false),
    [error, setError] = useState("")
  const verify = useCallback(async (value: string, signal?: AbortSignal) => {
    setChecking(true)
    setError("")
    try {
      setSession(await api<StudioSession>("/session", undefined, value, signal))
    } catch (error) {
      if (signal?.aborted) return
      setSession(null)
      setError(
        error instanceof Error
          ? error.message
          : "No se pudo comprobar la sesión.",
      )
      if (error instanceof StudioRequestError && error.status === 401)
        setToken("")
    } finally {
      if (!signal?.aborted) setChecking(false)
    }
  }, [])
  useEffect(() => {
    let running = false
    const renew = async () => {
      if (running) return
      let saved: Credentials | null = null
      try {
        saved = JSON.parse(localStorage.getItem("yt-owner-auth") || "null")
      } catch {}
      if (!saved || saved.expires_at > Date.now() + 120000) return
      running = true
      try {
        const next = credentials(
          await authRequest("token?grant_type=refresh_token", {
            refresh_token: saved.refresh_token,
          }),
        )
        localStorage.setItem("yt-owner-auth", JSON.stringify(next))
        setToken(next.access_token)
      } catch {
        setSession(null)
        setError("La sesión ha caducado. Inicia sesión de nuevo.")
      } finally {
        running = false
      }
    }
    void renew()
    const timer = setInterval(() => void renew(), 60000)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    const abort = new AbortController()
    setSession(null)
    try {
      if (token) sessionStorage.setItem("yt-studio-session", token)
      else sessionStorage.removeItem("yt-studio-session")
    } catch {}
    if (token) void verify(token, abort.signal)
    else {
      setChecking(false)
      setError("")
    }
    return () => abort.abort()
  }, [token, verify])
  const login = async (email: string, password: string) => {
    const next = credentials(
      await authRequest("token?grant_type=password", { email, password }),
    )
    localStorage.setItem("yt-owner-auth", JSON.stringify(next))
    setToken(next.access_token)
  }
  const logout = () => {
    void authRequest("logout", {}, token).catch(() => {})
    localStorage.removeItem("yt-owner-auth")
    setToken("")
    setSession(null)
  }
  const refresh = async () => {
    if (token) await verify(token)
  }
  return (
    <Context.Provider
      value={{ token, session, checking, error, login, logout, refresh }}
    >
      {children}
    </Context.Provider>
  )
}
export function useStudioSession() {
  const value = useContext(Context)
  if (!value) throw new Error("El workspace necesita SessionProvider.")
  return value
}
