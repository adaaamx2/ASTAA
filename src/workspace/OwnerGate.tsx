import { useEffect, useState, type ReactNode, type FormEvent } from "react"
import { useStudioSession } from "./Session"
import { authRequest, ownerRequest } from "./auth"
import AccountAccess from "./AccountAccess"
import "./workspace.css"

export default function OwnerGate({ children }: { children: ReactNode }) {
  const { session, login, checking } = useStudioSession()
  const [setup, setSetup] = useState(false)
  const [email, setEmail] = useState("adamlol745@gmai.com")
  const [password, setPassword] = useState("")
  const [message, setMessage] = useState("")
  const [busy, setBusy] = useState(false)
  const recovery = new URLSearchParams(location.hash.slice(1))
  const [recoveryToken, setRecoveryToken] = useState(
    recovery.get("type") === "recovery"
      ? recovery.get("access_token") || ""
      : "",
  )
  useEffect(() => {
    void ownerRequest("status")
      .then((data) => {
        if (typeof data.setup !== "boolean")
          throw new Error(
            "El backend es antiguo. Publica server desde los ajustes de Make.",
          )
        setSetup(data.setup)
      })
      .catch((error) => setMessage(error.message))
  }, [])
  async function create(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    try {
      if (recoveryToken) {
        await authRequest("user", { password }, recoveryToken)
        setRecoveryToken("")
        location.hash = ""
        setMessage("Contraseña actualizada. Inicia sesión.")
      } else {
        await ownerRequest("owner", { email, password })
        setSetup(false)
        await login(email, password)
      }
      setPassword("")
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo crear la cuenta.",
      )
    } finally {
      setBusy(false)
    }
  }
  if (session?.authorized && !recoveryToken) return children
  return (
    <div className="wg-shell">
      <main className="wg-main">
        <section className="wg-account">
          <p className="ml-kicker">YT AUTOMATION · ACCESO PRIVADO</p>
          <h1>
            {recoveryToken
              ? "Nueva contraseña"
              : setup
                ? "Crear cuenta de propietario"
                : "Tu estudio, protegido."}
          </h1>
          <p>
            Se conservan tus proyectos y archivos. El acceso y las generaciones
            requieren la cuenta del propietario.
          </p>
          {checking && <p role="status">Comprobando sesión…</p>}
          {setup || recoveryToken ? (
            <form onSubmit={create}>
              {!recoveryToken && (
                <label className="ml-field">
                  <span>
                    Email del propietario · compruébalo antes de crear
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              )}
              <label className="ml-field">
                <span>Contraseña · mínimo 12 caracteres</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="ml-button" disabled={busy}>
                {busy
                  ? "Guardando…"
                  : recoveryToken
                    ? "Guardar contraseña"
                    : "Crear cuenta de propietario"}
              </button>
            </form>
          ) : (
            <AccountAccess />
          )}
          {!setup && !recoveryToken && (
            <details>
              <summary>Recuperar contraseña</summary>
              <label className="ml-field">
                <span>Email de tu cuenta</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button
                className="ml-button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await authRequest(
                      `recover?redirect_to=${encodeURIComponent(location.origin + location.pathname)}`,
                      { email },
                    )
                    setMessage(
                      "Si la cuenta existe, recibirás un enlace. Revisa también spam.",
                    )
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "No se pudo enviar el correo.",
                    )
                  } finally {
                    setBusy(false)
                  }
                }}
              >
                Enviar enlace de recuperación
              </button>
              <p>
                Si no llega: Supabase → Authentication → Users → tu cuenta →
                Send password recovery. Configura Site URL y Redirect URLs con
                la dirección publicada de la app.
              </p>
            </details>
          )}
          {message && <p role="alert">{message}</p>}
        </section>
      </main>
    </div>
  )
}
