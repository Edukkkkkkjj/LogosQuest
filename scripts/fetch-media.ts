/**
 * npm run fetch-media
 * Baixa do Wikimedia Commons as imagens listadas em content/media/manifest.json,
 * confere a licença declarada pelo próprio Commons e gera versões WebP otimizadas
 * em public/media (duas larguras, para carregamento responsivo).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, 'data-sources/media')
const OUT = join(ROOT, 'public/media')
const UA = { 'User-Agent': 'LogosQuest/0.1 (projeto educacional; fetch-media)' }
const OPEN = /^(public domain|cc0|pdm)/i

interface Entry {
  id: string
  commonsTitle: string
  /** recorte em frações da imagem original (remove molduras de álbum) */
  crop?: { left: number; top: number; width: number; height: number }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main(): Promise<void> {
  const entries: Entry[] = JSON.parse(readFileSync(join(ROOT, 'content/media/manifest.json'), 'utf8'))
  mkdirSync(CACHE, { recursive: true })
  mkdirSync(OUT, { recursive: true })
  for (const e of entries) {
    const original = join(CACHE, `${e.id}.jpg`)
    if (!existsSync(original)) {
      const api = `https://commons.wikimedia.org/w/api.php?action=query&format=json&titles=${encodeURIComponent(e.commonsTitle)}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=2000`
      const json = await (await fetch(api, { headers: UA })).json()
      const info = (Object.values(json.query.pages)[0] as { imageinfo?: { thumburl: string; extmetadata: Record<string, { value: string }> }[] }).imageinfo?.[0]
      if (!info) throw new Error(`${e.id}: arquivo não encontrado no Commons`)
      const license = info.extmetadata.LicenseShortName?.value ?? ''
      if (!OPEN.test(license)) throw new Error(`${e.id}: licença não é domínio público/CC0 (${license})`)
      console.log(`baixando ${e.id} (${license})`)
      const res = await fetch(info.thumburl, { headers: UA })
      if (!res.ok) throw new Error(`${e.id}: download falhou (${res.status})`)
      writeFileSync(original, Buffer.from(await res.arrayBuffer()))
      await sleep(1500)
    }
    const meta = await sharp(original).metadata()
    const w = meta.width!
    const h = meta.height!
    const region = e.crop && {
      left: Math.round(e.crop.left * w), top: Math.round(e.crop.top * h),
      width: Math.round(e.crop.width * w), height: Math.round(e.crop.height * h),
    }
    for (const [suffix, width] of [['', 1600], ['-sm', 800]] as const) {
      const img = region ? sharp(original).extract(region) : sharp(original)
      await img.resize({ width, withoutEnlargement: true }).webp({ quality: 74 }).toFile(join(OUT, `${e.id}${suffix}.webp`))
    }
    console.log(`✓ ${e.id}: ${region?.width ?? w}×${region?.height ?? h}`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
