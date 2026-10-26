import enbu from "../style-guides/enbu.md?raw"
import blue from "../style-guides/blue-hour.md?raw"
import brand from "../style-guides/brand-strategy.md?raw"
import discord from "../style-guides/discord.md?raw"
import figma from "../style-guides/figma.md?raw"
import finn from "../style-guides/finn.md?raw"
import laboral from "../style-guides/laboral-clothing.md?raw"
import editorialReview from "../../docs/brand-reference-review.md?raw"
import { saveBlob } from "../media/files"
import type { CloudProject } from "./cloud"
import type { Store } from "../production/data"

const guides: Record<string, string> = {
  enbu,
  "blue-hour": blue,
  "laboral-clothing": laboral,
  "brand-strategy": `${brand}\n\n---\n\n${editorialReview}`,
  discord,
  "youtube-reference-002": figma,
  figma,
  finn,
}
export default function StyleGuide({
  id,
  title,
  kind,
  template,
  project,
  production,
}: {
  id: string
  title: string
  kind: string
  template: string
  project: CloudProject | null
  production: Store
}) {
  const family = kind === "finn" ? "finn" : template
  const productionProject =
    kind === "finn"
      ? production.projects.find((row) => row.id === template)
      : null
  // Intentionally omit signed URLs, credentials and session data from the recipe.
  const current = {
    id,
    title,
    family,
    revision: project?.revision ?? null,
    text: project?.text || null,
    settings: project?.settings
      ? Object.fromEntries(
          Object.entries(project.settings).filter(([key]) =>
            [
              "captionPack",
              "captions",
              "soundEnabled",
              "musicEnabled",
              "voiceId",
            ].includes(key),
          ),
        )
      : null,
    tracks: project?.tracks || {},
    renders: project?.renders || {},
    words: project?.media?.voice?.words || [],
    productionProject: productionProject
      ? {
          id: productionProject.id,
          title: productionProject.title,
          pack: productionProject.pack,
          scenes: productionProject.scenes,
        }
      : null,
  }
  const guide = `${guides[family] || finn}\n\n---\n\n# Receta del vídeo: ${title}\n\nIdentificador estable: \`${id}\`.\nPara recuperar este vídeo pide: «Recrea el vídeo ${title}, ID ${id}, usando su estilo ${family} y la versión guardada que indique».\n\n## Estado de esta copia\n${
    project
      ? "Datos de proyecto recuperados de Supabase; las pistas se recuperan por ID con nuevos enlaces."
      : "Sin documento de nube cargado. Los ajustes del editor abierto se incluyen al descargar; las pistas privadas no cargadas no pueden inventarse."
  }\n\n\`\`\`json\n${JSON.stringify(current, null, 2)}\n\`\`\`\n\nEl JSON no incluye claves ni enlaces firmados. Esta receta describe el estado visible/cargado; guarda una versión con nombre para conservar la misma selección de pistas en la nube.\n`
  function download() {
    const detail = { id, settings: {} as Record<string, unknown> }
    window.dispatchEvent(new CustomEvent("studio-capture-settings", { detail }))
    const safe = Object.fromEntries(
      Object.entries(detail.settings).filter(
        ([key]) => key !== "productionStore",
      ),
    )
    const snapshot = `${guide}\n## Ajustes actuales del editor al descargar\n\n\`\`\`json\n${JSON.stringify(safe, null, 2)}\n\`\`\`\n`
    saveBlob(
      new Blob([snapshot], { type: "text/markdown;charset=utf-8" }),
      `${id.replace(/[^a-zA-Z0-9_-]/g, "-")}-guia.md`,
    )
  }
  return (
    <details className="wg-files">
      <summary>Guía del estilo y receta de este vídeo · .md</summary>
      <p>
        Dirección visual, capas, tipografía, montaje, movimiento, sonido,
        captions, archivos fuente y límites de reproducción. Puedes referirte a
        este vídeo por su nombre o ID.
      </p>
      <button className="ml-button" onClick={download}>
        Descargar guía de este vídeo (.md)
      </button>
      <label className="ml-field">
        <span>Documentación completa · {id}</span>
        <textarea
          readOnly
          rows={20}
          value={guide}
          aria-label={`Guía de ${title}`}
        />
      </label>
    </details>
  )
}
