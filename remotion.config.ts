import { Config } from "@remotion/cli/config"

// Finn's native 4K frames exceed this workspace's memory with x264's auto threads.
// Leave the archived Discord and Figma render settings unchanged.
if (
  process.argv.some(
    (argument) => argument.startsWith("Finn-") || argument.startsWith("Study-"),
  )
) {
  Config.setConcurrency(1)
  Config.setX264Preset("veryfast")
  Config.setDisableSharedMemoryCapture(process.argv.includes("--width=2160"))
  Config.overrideFfmpegCommand(({ args }) => [
    ...args.slice(0, -1),
    "-threads",
    "1",
    args[args.length - 1],
  ])
}
