# YT Automation

`videos.ts` is the persistent, repository-backed catalog for the archived projects.
The application opens on Finn Lab; `#library` opens this library and
`#video/discord` opens the original Discord editor. Both archived editors are
also directly linked from the Finn workspace sidebar.

For each future finished project:

1. Keep its animation in its own component, without changing older videos.
2. Register a uniquely named composition in `src/remotion/Root.tsx`.
3. Add its stable id, title, tags, duration, format, composition id and export URL
   to `videos.ts`.
4. Render its MP4 into `public/exports/` and keep it as a project asset so the
   library's download works in subsequent sessions and deployments.
5. Add its editor route and preview in `App.tsx` when the project is implemented.

Pending references must use `status: "reference"` and must not have a fake
composition or download. Project 002 is now the 36-second Figma manifesto;
see `PROJECT-002.md` for its specification, source attribution and render command.
The old YouTube reference was not accessible; the user supplied a new visual brief.

There is no backend or upload service. The catalog is shared through source code,
not browser local storage. Supply reference videos through the conversation.
