import { deflateSync } from "node:zlib"
import { mkdir, writeFile } from "node:fs/promises"
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1
  return n >>> 0
})
function chunk(type, data) {
  const name = Buffer.from(type),
    body = Buffer.concat([name, data])
  let crc = 0xffffffff
  for (const byte of body) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8)
  const result = Buffer.alloc(data.length + 12)
  result.writeUInt32BE(data.length, 0)
  body.copy(result, 4)
  result.writeUInt32BE((crc ^ 0xffffffff) >>> 0, result.length - 4)
  return result
}
const size = 192,
  pixels = Buffer.alloc((size * 4 + 1) * size)
let seed = 74191
for (let y = 0; y < size; y++) {
  const row = y * (size * 4 + 1)
  for (let x = 0; x < size; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const value = 88 + ((seed >>> 24) % 81),
      offset = row + 1 + x * 4
    pixels[offset] = value
    pixels[offset + 1] = value
    pixels[offset + 2] = value
    pixels[offset + 3] = 88
  }
}
const header = Buffer.alloc(13)
header.writeUInt32BE(size, 0)
header.writeUInt32BE(size, 4)
header[8] = 8
header[9] = 6
await mkdir("public/references/brand-v4", { recursive: true })
await writeFile(
  "public/references/brand-v4/grain.png",
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
)
console.log("Generated deterministic 192px RGBA film grain")
