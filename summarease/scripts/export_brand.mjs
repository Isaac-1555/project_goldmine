#!/usr/bin/env node
// Export PNGs and ICO from the SVG favicons (light/dark)
// Requires: npm i -D sharp to-ico
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import toIco from 'to-ico'

const root = new URL('..', import.meta.url).pathname
const brandDir = path.join(root, 'public/brand')
const outBase = path.join(brandDir, 'exports')

const variants = [
  { name: 'light', svg: 'satbrain-favicon-light.svg' },
  { name: 'dark',  svg: 'satbrain-favicon-dark.svg'  },
]

const sizes = [16, 32, 48, 64, 128, 180, 256, 512]

async function exportVariant({ name, svg }) {
  const outDir = path.join(outBase, name)
  fs.mkdirSync(outDir, { recursive: true })
  const baseSvg = path.join(brandDir, svg)

  // PNGs
  for (const size of sizes) {
    const pngPath = path.join(outDir, `satbrain-${name}-${size}.png`)
    await sharp(baseSvg)
      .resize(size, size, { fit: 'contain' })
      .png({ quality: 100 })
      .toFile(pngPath)
    console.log('wrote', pngPath)
  }

  // ICO (16/32/48)
  const bufs = []
  for (const size of [16, 32, 48]) {
    const buf = await sharp(baseSvg).resize(size, size).png().toBuffer()
    bufs.push(buf)
  }
  const ico = await toIco(bufs)
  const icoPath = path.join(outDir, `satbrain-favicon-${name}.ico`)
  fs.writeFileSync(icoPath, ico)
  console.log('wrote', icoPath)
}

async function run() {
  fs.mkdirSync(outBase, { recursive: true })
  for (const v of variants) {
    await exportVariant(v)
  }
}

run().catch((e) => { console.error(e); process.exit(1) })
