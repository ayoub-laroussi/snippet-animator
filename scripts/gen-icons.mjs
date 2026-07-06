import { readFile, writeFile } from 'fs/promises'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import pngToIco from 'png-to-ico'

// ---------------------------------------------------------------------------
// Rasterize build/icon.svg into the icons Electron / electron-builder need:
//   - build/icon.png  (512, the base app icon)
//   - build/icon.ico  (multi-size Windows icon: 16→256)
// ---------------------------------------------------------------------------

const here = dirname(fileURLToPath(import.meta.url))
const buildDir = resolve(here, '..', 'build')
const svgPath = resolve(buildDir, 'icon.svg')

const svg = await readFile(svgPath)

// Base 512 PNG used by electron-builder for macOS/Linux and as a fallback.
await sharp(svg, { density: 384 })
  .resize(512, 512)
  .png()
  .toFile(resolve(buildDir, 'icon.png'))

// Individual PNGs for the .ico container.
const icoSizes = [16, 24, 32, 48, 64, 128, 256]
const pngBuffers = await Promise.all(
  icoSizes.map((size) =>
    sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()
  )
)

const ico = await pngToIco(pngBuffers)
await writeFile(resolve(buildDir, 'icon.ico'), ico)

console.log('Icons generated: icon.png (512), icon.ico (16-256)')
