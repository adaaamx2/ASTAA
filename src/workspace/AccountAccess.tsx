import { useState, type FormEvent } from "react"
import { useStudioSession } from "./Session"
import { ownerGrantSql } from "../motion-lab/voice-tools"
import { supabaseSqlUrl } from "../motion-lab/api"
export default function AccountAccess() {
  const { token, session, checking, error, login, logout, refresh } =
    useStudioSession()
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("")
  const sql = ownerGrantSql(session?.userId || null)
  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setMessage("")
    try {
      await login(email, password)
      setPassword("")
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No se pudo iniciar sesión.",
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <details
      className="ml-session"
      open={Boolean(token && !session?.authorized)}
    >
      <summary>
        {checking
          ? "Comprobando sesión…"
          : session?.authorized
            ? "Sesión autorizada · nube privada"
            : token
              ? "Sesión iniciada · permiso pendiente"
              : "Iniciar sesión / recuperar mis archivos"}
      </summary>
      {(error || message) && <p role="status">{error || message}</p>}
      {token ? (
        <div className="ml-owner-status">
          <p>
            {session?.message ||
              "Sesión sin verificar. No se pueden guardar ni generar archivos privados todavía."}
          </p>
          {session?.authenticated && !session.authorized && sql && (
            <>
              <p>
                El administrador debe autorizar esta cuenta una vez. No hay que
                compartir ninguna API key.
              </p>
              <button
                className="ml-button ml-button-quiet"
                onClick={() => void navigator.clipboard.writeText(sql).then(
                    () => setMessage("SQL copiado."),
                    () => setMessage("Selecciona y copia el código inferior."),
                  )}
              >
                Copiar SQL para autorizar mi cuenta
              </button>
              <a href={supabaseSqlUrl} target="_blank" rel="noreferrer">
                Abrir SQL Editor de tu proyecto ↗
              </a>
              <label className="ml-field">
                <span>SQL de autorización · cuenta actual</span>
                <textarea readOnly value={sql} rows={6} />
              </label>
            </>
          )}
          <button
            className="ml-button ml-button-quiet"
            disabled={checking}
            onClick={() => void refresh()}
          >
            Comprobar permisos de mi sesión
          </button>
          <button className="ml-text-button" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p>
            Usa la misma cuenta en cada equipo para recuperar los proyectos y
            sus archivos de Supabase. La API key de ElevenLabs no se introduce
            aquí.
          </p>
          <label className="ml-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="ml-field">
            <span>Contraseña</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="ml-button" disabled={busy}>
            {busy ? "Conectando…" : "Iniciar sesión"}
          </button>
        </form>
      )}
    </details>
  )
}
