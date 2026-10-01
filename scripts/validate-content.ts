/**
 * npm run validate-content
 * Falha (código 1) se houver qualquer inconsistência no conteúdo.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BuildIssue } from '../src/data/build'
import { LANGUAGES, SOURCES, loadBundle } from '../src/data/index'
import { validateBundle, type Problem } from '../src/data/validate'
import type { AudioManifest } from '../src/types/content'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const manifest: AudioManifest = JSON.parse(readFileSync(join(ROOT, 'content/audio/manifest.json'), 'utf8'))

const problems: Problem[] = []

for (const a of manifest.assets)
  if (!existsSync(join(ROOT, 'public', a.path))) problems.push({ level: 'error', where: `audio ${a.key}`, message: `arquivo de áudio inexistente: public/${a.path}` })

const mediaPath = join(ROOT, 'content/media/manifest.json')
if (existsSync(mediaPath)) {
  const media: { id: string; file: string; license: string; author: string; sourceUrl: string }[] = JSON.parse(readFileSync(mediaPath, 'utf8'))
  for (const m of media) {
    if (!existsSync(join(ROOT, 'public', m.file))) problems.push({ level: 'error', where: `imagem ${m.id}`, message: `arquivo inexistente: public/${m.file}` })
    for (const f of ['license', 'author', 'sourceUrl'] as const)
      if (!m[f]) problems.push({ level: 'error', where: `imagem ${m.id}`, message: `campo obrigatório ausente: ${f}` })
  }
}

for (const s of SOURCES)
  if (!s.license || !s.purpose) problems.push({ level: 'error', where: `fonte ${s.id}`, message: 'fonte sem licença ou finalidade' })

for (const language of LANGUAGES) {
  const issues: BuildIssue[] = []
  const bundle = await loadBundle(language.id, issues)
  for (const i of issues) problems.push({ level: 'error', ...i })
  problems.push(...validateBundle(bundle, SOURCES, manifest))
  const words = bundle.texts.reduce((n, t) => n + t.verses.reduce((m, v) => m + v.words.length, 0), 0)
  console.log(
    `${language.name}: ${bundle.glyphs.length} sinais, ${bundle.lexemes.length} lexemas, ${bundle.lessons.length} lições, ` +
      `${bundle.texts.length} textos (${words} palavras analisadas), ${bundle.secrets.length} segredos, ${bundle.windows.length} janelas`,
  )
}

const errors = problems.filter((p) => p.level === 'error')
const warnings = problems.filter((p) => p.level === 'warning')
for (const p of warnings) console.warn(`aviso  [${p.where}] ${p.message}`)
for (const p of errors) console.error(`ERRO   [${p.where}] ${p.message}`)
console.log(`\n${errors.length} erro(s), ${warnings.length} aviso(s).`)
process.exit(errors.length ? 1 : 0)
