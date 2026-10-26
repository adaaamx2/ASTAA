import { useState, type ReactNode } from "react"
import {
  activeKinds,
  kinds,
  labels,
  type AudioState,
  type Kind,
} from "./engine"
import type { DownloadFile } from "../media/files"
import { validVoiceId } from "../motion-lab/voice-tools"
import MixedVideo from "./MixedVideo"
import Export4kButton from "../media/Export4kButton"
import { sfxDuration, sfxPrompt } from "./sound-design"
import { SFX_TEXT_LIMIT } from "../../supabase/functions/server/audio-provider.mjs"
import {
  Box,
  Button,
  Disclosure,
  Field,
  Heading,
  Input,
  Option,
  Sample,
  Section,
  Select,
  Strong,
  Text,
  Textarea,
} from "./controls"

export type CatalogVoice = {
  id: string
  name: string
  labels: Record<string, string>
  previewUrl?: string | null
}
type Props = {
  projectId: string
  state: AudioState
  voices: CatalogVoice[]
  busy: string
  status: Record<string, string>
  message: string
  technical: string
  dirty: boolean
  playing: boolean
  sources: DownloadFile[]
  selectedVideo: number
  setSelectedVideo: (index: number) => void
  update: (fn: (previous: AudioState) => AudioState) => void
  strip: (kind: Kind, patch: Partial<AudioState["strips"][Kind]>) => void
  generateAll: (only?: Kind) => Promise<void>
  resolveVoice: (id: string) => Promise<void>
  check: () => Promise<void>
  listen: () => Promise<void>
  persist: () => Promise<void>
  saveChannel: () => Promise<void>
  upload: (kind: Kind, file?: File) => Promise<void>
  exportFile: (kind?: Kind, mp4?: boolean) => Promise<void>
  wave: (kind: Kind) => ReactNode
  guide: string[]
}

export default function AudioPanel(p: Props) {
  const { state, update, busy } = p
  const [query, setQuery] = useState("")
  const voice = p.voices.find((v) => v.id === state.voiceId)
  const voiceText =
    state.drafts?.voice ??
    state.clips
      .filter((c) => c.kind === "voice")
      .map((c) => c.text || c.description)
      .join("\n\n")
  const sfxText = sfxPrompt(state)
  const active = activeKinds(state)
  const hasAudio = state.clips.some((c) => c.asset)
  const catalog = p.voices.filter((v) =>
    `${v.name} ${Object.values(v.labels).join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  const selectVoice = (id: string) => {
    const selected = p.voices.find((v) => v.id === id)
    update((s) => ({
      ...s,
      voiceId: id.trim(),
      voiceName: selected?.name || "Voice ID personalizado",
    }))
  }
  const locked = Boolean(busy)
  const generationBlock = !p.status.key?.startsWith("ok:")
    ? p.status.key || "Comprobando la clave del servidor…"
    : !validVoiceId(state.voiceId)
      ? "Selecciona una voz del catálogo o pega su Voice ID para poder generar."
      : !voiceText.trim()
        ? "Escribe el guion que quieres convertir en voz."
        : ""
  return (
    <Section className="wg-files sound-studio" aria-label="Voz y audio">
      <Box className="sound-heading">
        <Box>
          <Text className="ml-kicker">ESTUDIO DE AUDIO</Text>
          <Heading>Todo el audio, en un clic.</Heading>
          <Text>
            Elige una voz. Genera voz, efectos y música juntos. Después ajusta
            la mezcla.
          </Text>
        </Box>
        <Text className="sound-duration">
          {state.duration.toFixed(1)} s de audio
        </Text>
      </Box>
      {((p.status.key && !p.status.key.startsWith("ok:")) ||
        (p.status.connection && !p.status.connection.startsWith("ok:"))) && (
        <Text className="sound-feedback" role="alert">
          {p.status.key && !p.status.key.startsWith("ok:")
            ? p.status.key
            : p.status.connection}{" "}
          Las pistas locales y el mezclador siguen disponibles.
        </Text>
      )}
      <Box className="sound-layout">
        <Box className="sound-card">
          <Box className="sound-step">
            <Strong>01</Strong>
            <Heading>Elegir voz y generar todo</Heading>
          </Box>
          <Box className="sound-voice">
            <Field label="Buscar una voz">
              <Input
                type="search"
                placeholder="Nombre, idioma o acento…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={locked}
              />
            </Field>
            <Field label="Voz del catálogo">
              <Select
                value={state.voiceId}
                disabled={locked}
                onChange={(e) => selectVoice(e.target.value)}
              >
                <Option value="">Selecciona una voz</Option>
                {state.voiceId &&
                  !catalog.some((v) => v.id === state.voiceId) && (
                    <Option value={state.voiceId}>
                      {state.voiceName || state.voiceId}
                    </Option>
                  )}
                {catalog.map((v) => (
                  <Option key={v.id} value={v.id}>
                    {v.name} · {Object.values(v.labels).join(" / ")}
                  </Option>
                ))}
              </Select>
            </Field>
            <Box className="sound-inline">
              <Field label="O pega un Voice ID">
                <Input
                  aria-label="Voice ID"
                  value={state.voiceId}
                  placeholder="ID de ElevenLabs, no la API key"
                  disabled={locked}
                  autoComplete="off"
                  onChange={(e) => selectVoice(e.target.value)}
                />
              </Field>
              <Button
                disabled={locked || !validVoiceId(state.voiceId)}
                onClick={() => void p.resolveVoice(state.voiceId)}
              >
                Buscar voz por ID
              </Button>
            </Box>
            <Box className="sound-sample">
              <Strong>
                {voice?.name || state.voiceName || "Escucha antes de elegir"}
              </Strong>
              {voice?.previewUrl ? (
                <Sample src={voice.previewUrl} />
              ) : (
                <Text>
                  {state.voiceId
                    ? "Busca la voz por ID para cargar su muestra. Si no tiene muestra pública, no se generará una de pago."
                    : "Selecciona una voz para escuchar su muestra existente."}
                </Text>
              )}
              <Text>
                Muestra gratuita del catálogo. No genera audio ni consume
                créditos de generación.
              </Text>
            </Box>
          </Box>
          <Field label="Guion que se escuchará en el vídeo">
            <Textarea
              rows={6}
              value={voiceText}
              disabled={locked}
              onChange={(e) => {
                const voice = e.target.value
                update((s) => ({ ...s, drafts: { ...s.drafts, voice } }))
              }}
            />
          </Field>
          <Disclosure title="Personalizar música y efecto (opcional)">
            <Field label="Música instrumental">
              <Textarea
                value={state.mood}
                disabled={locked}
                onChange={(e) => {
                  const mood = e.target.value
                  update((s) => ({ ...s, mood }))
                }}
              />
            </Field>
            <Field
              label={`Efecto de sonido · ${sfxText.length}/${SFX_TEXT_LIMIT} caracteres`}
            >
              <Textarea
                value={sfxText}
                maxLength={SFX_TEXT_LIMIT}
                disabled={locked}
                onChange={(e) => {
                  const sfx = e.target.value
                  update((s) => ({ ...s, drafts: { ...s.drafts, sfx } }))
                }}
              />
            </Field>
            <Box className="sound-inline">
              <Field label="Duración del efecto (s)">
                <Input
                  type="number"
                  min={0.5}
                  max={30}
                  step={0.1}
                  value={sfxDuration(state)}
                  disabled={locked}
                  onChange={(e) => {
                    const sfxDuration = +e.target.value
                    update((s) => ({ ...s, sfxDuration }))
                  }}
                />
              </Field>
              <Field label="Colocar el efecto en el segundo">
                <Input
                  type="number"
                  min={0}
                  max={state.duration}
                  step={0.1}
                  value={state.sfxStart ?? 0}
                  disabled={locked}
                  onChange={(e) => {
                    const sfxStart = +e.target.value
                    update((s) => ({ ...s, sfxStart }))
                  }}
                />
              </Field>
            </Box>
          </Disclosure>
          <Text className="sound-hint">
            Un clic prepara las tres pistas: {voiceText.length} caracteres de
            voz, {sfxDuration(state)} s de SFX y música para el vídeo. Hasta
            tres solicitudes facturables según tu plan. Lo que ya está generado
            y no ha cambiado se reutiliza.
          </Text>
          <Button
            className="ml-button-primary sound-generate"
            disabled={locked || Boolean(generationBlock)}
            onClick={() => void p.generateAll()}
          >
            {busy.startsWith("generation-")
              ? "Preparando voz, SFX y música…"
              : "Generar voz + SFX + música"}
          </Button>
          {!locked && generationBlock && (
            <Text role="status" className="sound-feedback">
              {generationBlock}
            </Text>
          )}
          <Text className="sound-hint">
            Después pulsa Reproducir en el vídeo. El mezclador de la derecha
            controla lo que oyes y exportas.
          </Text>
        </Box>
        <Box className="sound-card">
          <Box className="sound-step">
            <Strong>02</Strong>
            <Heading>Ajustar volumen</Heading>
          </Box>
          {p.sources[p.selectedVideo] && (
            <Box className="sound-preview">
              <Text>Vídeo con tu mezcla · pulsa Reproducir aquí</Text>
              <MixedVideo
                projectId={p.projectId}
                src={p.sources[p.selectedVideo].url}
                controls
                playsInline
                preload="metadata"
                aria-label="Vídeo con voz, SFX y música"
              />
            </Box>
          )}
          <Text className="sound-hint">
            Estos controles no consumen créditos. Los cambios también se aplican
            al MP4 y al WAV mezclado.
          </Text>
          <Box className="sound-mixer">
            {kinds.map((k) => {
              const count = state.clips.filter(
                (c) => c.kind === k && c.asset,
              ).length
              return (
                <Box
                  className="sound-track"
                  key={k}
                  data-muted={!active.includes(k)}
                >
                  <Box className="sound-track-heading">
                    <Strong>{labels[k]}</Strong>
                    <Text>
                      {count
                        ? `${count} ${
                            count === 1 ? "audio listo" : "audios listos"
                          }`
                        : "Sin audio todavía"}
                    </Text>
                    <Button
                      aria-label={`${
                        state.strips[k].mute ? "Activar" : "Silenciar"
                      } ${labels[k]}`}
                      aria-pressed={state.strips[k].mute}
                      disabled={locked}
                      onClick={() =>
                        p.strip(k, { mute: !state.strips[k].mute })
                      }
                    >
                      {state.strips[k].mute ? "Silenciada" : "Silenciar"}
                    </Button>
                  </Box>
                  {p.status[`generation:${k}`] && (
                    <Text className="sound-hint" role="status">
                      {p.status[`generation:${k}`]}
                    </Text>
                  )}
                  {count > 0 && !active.includes(k) && (
                    <Text className="sound-hint">
                      Hay audio guardado, pero esta pista está silenciada,
                      excluida, a volumen cero o fuera de la selección Solo.
                    </Text>
                  )}
                  {k !== "voice" && (
                    <Box className="sound-track-tools">
                      <Button
                        disabled={locked || !p.status.key?.startsWith("ok:")}
                        onClick={() => void p.generateAll(k)}
                      >
                        Generar solo {labels[k]}
                      </Button>
                      <Text className="sound-hint">
                        Solo solicita esta pista. Si los parámetros coinciden,
                        recupera la caché sin un cobro nuevo.
                      </Text>
                    </Box>
                  )}
                  {k === "sfx" && count > 0 && (
                    <Text className="sound-hint">
                      {state.clips
                        .filter((c) => c.kind === "sfx" && c.asset)
                        .map(
                          (c) =>
                            `${c.start.toFixed(1)}–${(c.start + c.duration).toFixed(1)} s`,
                        )
                        .join(" · ")}{" "}
                      del vídeo. Los efectos solo suenan en ese tramo.
                    </Text>
                  )}
                  {k === "sfx" &&
                    state.clips.some((c) => c.kind === "sfx" && c.silent) && (
                      <Text className="sound-hint" role="alert">
                        El SFX recibido contiene silencio. Se conserva el
                        archivo; no se ha solicitado ni cobrado otra generación.
                      </Text>
                    )}
                  {p.wave(k)}
                  <Field
                    label={`Volumen ${labels[k]} · ${Math.round(state.strips[k].volume * 100)}%`}
                  >
                    <Input
                      type="range"
                      aria-label={`Volumen ${labels[k]}`}
                      min={0}
                      max={1.5}
                      step={0.01}
                      value={state.strips[k].volume}
                      disabled={locked}
                      onChange={(e) => p.strip(k, { volume: +e.target.value })}
                    />
                  </Field>
                  <Disclosure title="Subir audio propio y opciones">
                    <Box className="sound-track-tools">
                      <Button
                        disabled={locked}
                        aria-pressed={state.strips[k].solo}
                        onClick={() =>
                          p.strip(k, { solo: !state.strips[k].solo })
                        }
                      >
                        Solo
                      </Button>
                      <Field label="Incluir pista">
                        <Input
                          type="checkbox"
                          checked={state.strips[k].enabled}
                          disabled={locked}
                          onChange={(e) =>
                            p.strip(k, { enabled: e.target.checked })
                          }
                        />
                      </Field>
                      <Field label="Subir audio propio">
                        <Input
                          type="file"
                          accept="audio/*"
                          disabled={locked}
                          onChange={(e) => {
                            void p.upload(k, e.target.files?.[0])
                            e.target.value = ""
                          }}
                        />
                      </Field>
                    </Box>
                  </Disclosure>
                </Box>
              )
            })}
          </Box>
          <Field label={`Volumen máster · ${Math.round(state.master * 100)}%`}>
            <Input
              type="range"
              aria-label="Volumen máster"
              min={0}
              max={1.5}
              step={0.01}
              value={state.master}
              disabled={locked}
              onChange={(e) =>
                update((s) => ({ ...s, master: +e.target.value }))
              }
            />
          </Field>
          <Box className="sound-inline">
            <Button
              className="sound-listen"
              disabled={locked || !hasAudio}
              onClick={() => void p.listen()}
            >
              {p.playing ? "Detener escucha" : "Escuchar mezcla"}
            </Button>
            <Button disabled={locked} onClick={() => void p.persist()}>
              {busy === "save"
                ? "Guardando…"
                : p.dirty
                  ? "Guardar ajustes"
                  : "Ajustes guardados"}
            </Button>
          </Box>
        </Box>
      </Box>
      <Box className="sound-card sound-export">
        <Box className="sound-step">
          <Strong>03</Strong>
          <Heading>Exportar tu mezcla</Heading>
        </Box>
        <Text>
          Se escucha:{" "}
          {active
            .filter((k) => state.clips.some((c) => c.kind === k && c.asset))
            .map(
              (k) =>
                `${labels[k]} ${Math.round(state.strips[k].volume * 100)}%`,
            )
            .join(" · ") || "ninguna pista (silencio)"}
          {` · Máster ${Math.round(state.master * 100)}%`}
        </Text>
        <Text className="sound-hint">
          Las pistas silenciadas, desactivadas o a 0% no se incluyen. El audio
          original del MP4 se sustituye, no se suma.
        </Text>
        <Box className="sound-export-actions">
          <Field label="Vídeo para exportar">
            <Select
              aria-label="MP4 visual para recomponer"
              value={p.selectedVideo}
              disabled={locked || !p.sources.length}
              onChange={(e) => p.setSelectedVideo(+e.target.value)}
            >
              {!p.sources.length && (
                <Option value={0}>Sin MP4 disponible</Option>
              )}
              {p.sources.map((s, i) => (
                <Option key={s.url} value={i}>
                  {s.filename}
                </Option>
              ))}
            </Select>
          </Field>
          <Button
            className="ml-button-primary"
            disabled={locked || !p.sources.length}
            onClick={() => void p.exportFile(undefined, true)}
          >
            Exportar MP4
          </Button>
          <Button disabled={locked} onClick={() => void p.exportFile()}>
            Descargar mezcla WAV
          </Button>
        </Box>
        <Text className="sound-hint">
          El MP4 incluye las captions activadas en la vista previa y tu mezcla.
          Grabar captions requiere recodificar el vídeo; sin captions se copia
          la imagen original.
        </Text>
      </Box>
      <Export4kButton
        projectId={p.projectId}
        source={p.sources[p.selectedVideo]}
        disabled={locked}
      />
      {(p.message || busy) && (
        <Text className="sound-feedback" role="status" aria-live="polite">
          {p.message || `Procesando ${busy}…`}
        </Text>
      )}
      {p.technical && (
        <Text className="sound-hint" role="status">
          Código de diagnóstico: {p.technical}
        </Text>
      )}
      <Disclosure title="Conexión y ajustes avanzados">
        <Box className="sound-advanced">
          <Text>
            {p.status.key?.replace(/^ok:/, "") ||
              "Comprobando secreto del servidor…"}
          </Text>
          <Text>
            {p.status.connection?.replace(/^ok:/, "") ||
              "Comprobando conexión…"}
          </Text>
          {p.status.plan && <Text>{p.status.plan}</Text>}
          <Button disabled={locked} onClick={() => void p.check()}>
            Actualizar conexión y catálogo
          </Button>
          <Field label={`Estabilidad · ${state.stability}`}>
            <Input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={state.stability}
              disabled={locked}
              onChange={(e) =>
                update((s) => ({ ...s, stability: +e.target.value }))
              }
            />
          </Field>
          <Field label={`Velocidad · ${state.speed}`}>
            <Input
              type="range"
              min={0.7}
              max={1.2}
              step={0.01}
              value={state.speed}
              disabled={locked}
              onChange={(e) =>
                update((s) => ({ ...s, speed: +e.target.value }))
              }
            />
          </Field>
          <Field label="Diccionario de pronunciación (JSON)">
            <Textarea
              value={state.dictionary}
              disabled={locked}
              onChange={(e) =>
                update((s) => ({ ...s, dictionary: e.target.value }))
              }
            />
          </Field>
          <Button disabled={locked} onClick={() => void p.saveChannel()}>
            Guardar voz y mezcla como valores del canal
          </Button>
          <Disclosure title="Tiempos de las pistas y eventos existentes">
            {state.clips.map((clip) => (
              <Box className="sound-track" key={clip.id}>
                <Strong>
                  {labels[clip.kind]} · {clip.description.slice(0, 70)}
                </Strong>
                <Box className="sound-inline">
                  <Field label="Inicio (s)">
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={clip.start}
                      disabled={locked}
                      onChange={(e) => {
                        const start = Math.max(0, +e.target.value)
                        update((s) => ({
                          ...s,
                          clips: s.clips.map((c) =>
                            c.id === clip.id ? { ...c, start } : c,
                          ),
                        }))
                      }}
                    />
                  </Field>
                  <Field label="Duración (s)">
                    <Input
                      type="number"
                      min={0.1}
                      step={0.01}
                      value={clip.duration}
                      disabled={locked}
                      onChange={(e) => {
                        const duration = Math.max(0.1, +e.target.value)
                        update((s) => ({
                          ...s,
                          clips: s.clips.map((c) =>
                            c.id === clip.id ? { ...c, duration } : c,
                          ),
                        }))
                      }}
                    />
                  </Field>
                </Box>
              </Box>
            ))}
          </Disclosure>
          <Field label="Normalizar exportación a aproximadamente −14 LUFS (modifica el nivel global)">
            <Input
              type="checkbox"
              checked={state.normalize}
              disabled={locked}
              onChange={(e) =>
                update((s) => ({ ...s, normalize: e.target.checked }))
              }
            />
          </Field>
          <Text>
            Descargas individuales originales, sin los volúmenes del mezclador:
          </Text>
          <Box className="sound-inline">
            {kinds.map((k) => (
              <Button
                key={k}
                disabled={
                  locked || !state.clips.some((c) => c.kind === k && c.asset)
                }
                onClick={() => void p.exportFile(k)}
              >
                {labels[k]} original WAV
              </Button>
            ))}
          </Box>
          <Text>
            Los archivos subidos se guardan en este navegador. Conserva los
            originales.
          </Text>
          {p.technical && <Text>Código técnico: {p.technical}</Text>}
          <Disclosure title="Guía de activación">
            {p.guide.map((step, i) => (
              <Text key={i}>
                {i + 1}. {step}
              </Text>
            ))}
          </Disclosure>
        </Box>
      </Disclosure>
    </Section>
  )
}
