export function studioSession(user, ownerId) {
  if (!user || typeof user.id !== "string")
    return {
      authenticated: false,
      authorized: false,
      userId: null,
      reason: "sign_in_required",
      message:
        "Inicia sesión en la aplicación para generar audio. Conectar el proyecto Supabase no inicia una sesión de usuario.",
    }
  const authorized =
    user.is_anonymous !== true &&
    (ownerId ? user.id === ownerId : user.app_metadata?.studio_owner === true)
  return {
    authenticated: true,
    authorized,
    userId: user.id,
    reason: authorized ? "authorized" : "owner_not_authorized",
    message: authorized
      ? "Cuenta autorizada para generar audio."
      : "La sesión está iniciada, pero esta cuenta aún no tiene permiso para gastar créditos. Autorízala desde el proyecto Supabase y vuelve a comprobar la sesión.",
  }
}
