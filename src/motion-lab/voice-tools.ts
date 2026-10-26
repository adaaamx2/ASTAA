import type { Voice } from "./api"

export function voiceCategory(voice: Pick<Voice, "labels">) {
  const labels = Object.values(voice.labels).join(" ").toLowerCase()
  if (/españa|spain|peninsular|castilian|castellano/.test(labels))
    return "España"
  if (/\bes\b|español|spanish/.test(labels))
    return "Español · otros o sin acento"
  return "Otros idiomas / sin verificar"
}
export function validVoiceId(value: string) {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(value) && !/^(sk_|xi_)/i.test(value)
}
export function ownerGrantSql(userId: string | null) {
  if (
    !userId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userId,
    )
  )
    return null
  return `-- Ejecutar solo desde el SQL Editor del propietario del proyecto.\n-- Autoriza únicamente la cuenta con la que acabas de iniciar sesión.\nupdate auth.users\nset raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"studio_owner":true}'::jsonb\nwhere id = '${userId}'::uuid;\n\nselect id, raw_app_meta_data->>'studio_owner' as studio_owner\nfrom auth.users where id = '${userId}'::uuid;`
}
