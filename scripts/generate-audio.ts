/**
 * npm run generate-audio
 *
 * Pipeline local de áudio: gera um MP3 por letra, palavra e versículo e registra
 * tudo em content/audio/manifest.json. Não exige instalar nada no sistema: usa o
 * eSpeak NG compilado para WebAssembly (dependência de desenvolvimento).
 *
 * O eSpeak NG é um sintetizador por regras: a voz é robótica, mas roda offline, é
 * determinística, e a transcrição que ele produz pode ser conferida. No app, o
 * áudio gerado fica ABAIXO de uma gravação humana e da voz natural do aparelho:
 *   gravação → voz do aparelho → áudio gerado → sem áudio.
 *
 * O que é gerado, por modelo de pronúncia:
 *   gr-erasmian → voz "grc" (grego antigo do eSpeak; conferida por transcrição
 *                 fonética: λόγος [lóɡos], ἀρχή [arkhɛ́ː], υἱός [hyiós])
 *   gr-koine    → voz "el" (grego moderno: a mesma aproximação da voz do aparelho)
 *
 * O que NÃO é gerado, e por quê:
 *   hebraico — a voz "he" do eSpeak NG não lê texto com niqqud corretamente
 *   (soletra sinais que não conhece e lê o qamats como "o"). Gerar áudio errado
 *   seria pior do que não ter áudio. O hebraico usa a voz he-IL do aparelho,
 *   quando existe; gravações humanas entram pelo mesmo manifesto (ver docs/GUIA.md).
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Mp3Encoder } from '@breezystack/lamejs'
import createESpeak from '@echogarden/espeak-ng-emscripten'
import { LANGUAGES, loadBundle } from '../src/data/index'
import { speakableText } from '../src/features/audio/engine'
import type { AudioAsset, AudioManifest, LanguageId } from '../src/types/content'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = join(ROOT, 'content/audio/manifest.json')
const SOURCE_ID = 'local-espeak'
const SAMPLE_RATE = 22050
const KBPS = 48

/** modelo → voz do eSpeak; `raw` = envia o texto politônico original */
const VOICES: Record<string, { voice: string; rate: number; raw: boolean }> = {
  'gr-erasmian': { voice: 'grc', rate: 125, raw: true },
  'gr-koine': { voice: 'el', rate: 125, raw: false },
}

interface ESpeakWorker {
  set_voice(v: string): void
  set_rate(r: number): void
  synthesize(text: string, cb: (samples: Int16Array | null) => boolean): void
}

const espeak = await (createESpeak as unknown as () => Promise<{ eSpeakNGWorker: new () => ESpeakWorker }>)()
const worker = new espeak.eSpeakNGWorker()

function toMp3(text: string): Buffer {
  const chunks: Int16Array[] = []
  worker.synthesize(text, (samples) => {
    if (samples) chunks.push(samples.slice(0))
    return false
  })
  const enc = new Mp3Encoder(1, SAMPLE_RATE, KBPS)
  const out: Buffer[] = []
  const push = (b: ArrayLike<number>) => b.length && out.push(Buffer.from(Uint8Array.from(b)))
  for (const c of chunks) push(enc.encodeBuffer(c))
  push(enc.flush())
  return Buffer.concat(out)
}

const manifest: AudioManifest = JSON.parse(readFileSync(MANIFEST, 'utf8'))
// registros de outras fontes (gravações) são preservados; os gerados são refeitos
const assets = new Map(manifest.assets.filter((a) => a.sourceId !== SOURCE_ID).map((a) => [`${a.modelId}|${a.key}`, a]))
let made = 0
let bytes = 0

function synth(languageId: LanguageId, modelId: string, key: string, text: string, level: AudioAsset['level']): void {
  const v = VOICES[modelId]
  const name = createHash('sha1').update(`${v.voice}|${text}`).digest('hex').slice(0, 16)
  const path = `audio/${languageId}/${modelId}/${name}.mp3`
  const file = join(ROOT, 'public', path)
  if (!existsSync(file)) {
    mkdirSync(dirname(file), { recursive: true })
    const mp3 = toMp3(v.raw ? text.normalize('NFC') : speakableText(languageId, text))
    writeFileSync(file, mp3)
    made++
    bytes += mp3.length
  }
  if (!assets.has(`${modelId}|${key}`)) assets.set(`${modelId}|${key}`, { key, languageId, modelId, level, path, sourceId: SOURCE_ID })
}

for (const language of LANGUAGES) {
  const bundle = await loadBundle(language.id)
  const models = language.pronunciationModels.filter((m) => VOICES[m.id])
  if (!models.length) console.log(`– ${language.name}: sem voz sintética confiável; usa a voz do aparelho (veja o cabeçalho deste script).`)
  for (const model of models) {
    worker.set_voice(VOICES[model.id].voice)
    worker.set_rate(VOICES[model.id].rate)
    for (const g of bundle.glyphs) synth(language.id, model.id, g.id, g.speakBy?.[model.id] ?? g.speak, 'phoneme')
    for (const l of bundle.lexemes) synth(language.id, model.id, l.id, l.speak ?? l.lemma, 'word')
    for (const t of bundle.texts)
      for (const v of t.verses) {
        const phrase = v.words.map((w) => w.surface).join(' ')
        synth(language.id, model.id, `text:${phrase}`, phrase, 'phrase')
        for (const w of v.words) synth(language.id, model.id, `text:${w.plain}`, w.plain, 'word')
      }
    console.log(`✓ ${language.name} · ${model.name}`)
  }
}

// arquivos gerados que ninguém mais referencia (texto mudou) são removidos
const used = new Set([...assets.values()].map((a) => a.path))
for (const language of LANGUAGES)
  for (const modelId of Object.keys(VOICES)) {
    const dir = join(ROOT, 'public/audio', language.id, modelId)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) if (!used.has(`audio/${language.id}/${modelId}/${f}`)) rmSync(join(dir, f))
  }

manifest.assets = [...assets.values()].sort((a, b) => `${a.modelId}|${a.key}`.localeCompare(`${b.modelId}|${b.key}`))
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 1) + '\n')
console.log(`${made} arquivo(s) novo(s) (${(bytes / 1e6).toFixed(1)} MB); ${manifest.assets.length} registro(s) no manifesto.`)
