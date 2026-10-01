/**
 * Extrai passagens das fontes abertas e gera os dados declarativos do app.
 *
 *   OSHB (WLC + morfologia)        → textos hebraicos
 *   MorphGNT (SBLGNT + morfologia) → textos gregos
 *   STEPBible TBESH/TBESG          → forma do lema e número de Strong (somente isso;
 *                                    as definições em inglês NÃO são copiadas)
 *
 * Saída (não editar à mão):
 *   content/texts/generated/<id>.json
 *   content/<idioma>/lexemes.generated.json
 *   content/<idioma>/contexts.generated.json
 *
 * Uso: npm run build-texts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMorphGnt, parseOshb } from '../src/lib/morph/parse'
import { transliterateGreek, transliterateHebrew } from '../src/lib/translit'
import { stripCantillation, stripMaqqef } from '../src/lib/unicode'
import type { Segment, WordOccurrence } from '../src/types/content'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CACHE = join(ROOT, 'data-sources')

const RAW = 'https://raw.githubusercontent.com'
const STEP = `${RAW}/STEPBible/STEPBible-Data/master/Lexicons`
const SOURCES = {
  oshb: (book: string) => [`oshb/${book}.xml`, `${RAW}/openscriptures/morphhb/master/wlc/${book}.xml`],
  gnt: (file: string) => [`morphgnt/${file}-morphgnt.txt`, `${RAW}/morphgnt/sblgnt/master/${file}-morphgnt.txt`],
  tbesh: [
    'step/TBESH.txt',
    `${STEP}/${encodeURIComponent('TBESH - Translators Brief lexicon of Extended Strongs for Hebrew - STEPBible.org CC BY.txt')}`,
  ],
  tbesg: [
    'step/TBESG.txt',
    `${STEP}/${encodeURIComponent('TBESG - Translators Brief lexicon of Extended Strongs for Greek - STEPBible.org CC BY.txt')}`,
  ],
}

const GNT_FILES: Record<string, { file: string; num: string }> = {
  Mt: { file: '61-Mt', num: '01' }, Mk: { file: '62-Mk', num: '02' }, Lk: { file: '63-Lk', num: '03' },
  Jn: { file: '64-Jn', num: '04' }, Ac: { file: '65-Ac', num: '05' }, Ro: { file: '66-Ro', num: '06' },
  Eph: { file: '70-Eph', num: '10' }, Php: { file: '71-Php', num: '11' }, Col: { file: '72-Col', num: '12' },
}
const BOOK_PT: Record<string, string> = {
  Gen: 'Gênesis', Exod: 'Êxodo', Num: 'Números', Deut: 'Deuteronômio', Ps: 'Salmos',
  Mt: 'Mateus', Mk: 'Marcos', Lk: 'Lucas', Jn: 'João', Ac: 'Atos', Ro: 'Romanos',
  Eph: 'Efésios', Php: 'Filipenses', Col: 'Colossenses',
}

/** Prefixos inseparáveis do hebraico, na notação de lema do OSHB. */
const HEB_PREFIX: Record<string, { lemma: string; pos: string }> = {
  b: { lemma: 'בְּ', pos: 'preposition' },
  c: { lemma: 'וְ', pos: 'conjunction' },
  d: { lemma: 'הַ', pos: 'article' },
  i: { lemma: 'הֲ', pos: 'particle' },
  k: { lemma: 'כְּ', pos: 'preposition' },
  l: { lemma: 'לְ', pos: 'preposition' },
  m: { lemma: 'מִן', pos: 'preposition' },
  s: { lemma: 'שֶׁ', pos: 'particle' },
}

interface GenLexeme {
  id: string
  lemma: string
  translit: string
  pos: string
  strong?: string
}

async function source([rel, url]: string[]): Promise<string> {
  const path = join(CACHE, rel)
  if (!existsSync(path)) {
    console.log(`baixando ${url}`)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`falha ao baixar ${url}: ${res.status}`)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  }
  return readFileSync(path, 'utf8')
}

function writeJson(rel: string, data: unknown): void {
  const path = join(ROOT, rel)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 1) + '\n')
}

// ---------- léxicos STEP: somente lema + Strong ----------

function loadStep(raw: string): Map<string, { lemma: string; pos: string }> {
  const map = new Map<string, { lemma: string; pos: string }>()
  for (const line of raw.split(/\r?\n/)) {
    const cols = line.split('\t')
    if (!/^[HG]\d{4}/.test(cols[0] ?? '') || cols.length < 6) continue
    if (!map.has(cols[0])) map.set(cols[0], { lemma: stripCantillation(cols[3]), pos: cols[5] })
  }
  return map
}

const STEP_POS: Record<string, string> = {
  N: 'noun', V: 'verb', A: 'adjective', ADV: 'adverb', PREP: 'preposition', CONJ: 'conjunction',
  PRT: 'particle', PRON: 'pronoun', P: 'pronoun', R: 'preposition', C: 'conjunction', D: 'adverb', T: 'particle',
}
function stepPos(code: string): string {
  const tag = code.split(':')[1]?.split('-')[0]?.toUpperCase() ?? ''
  return STEP_POS[tag] ?? 'noun'
}

/** `1254 a` → `H1254a`; `430` → `H0430` */
function strongKey(part: string): string {
  const m = part.match(/(\d+)\s*([a-z])?/)
  if (!m) throw new Error(`lema OSHB inesperado: ${part}`)
  return `H${m[1].padStart(4, '0')}${m[2] ?? ''}`
}

// ---------- hebraico ----------

const hebLex = new Map<string, GenLexeme>()
const grkLex = new Map<string, GenLexeme>()
let tbesh: Map<string, { lemma: string; pos: string }>
let tbesg: Map<string, { lemma: string; pos: string }>
let tbesgByLemma: Map<string, string>
/** falso ao extrair versículos de contexto: não entram no léxico do curso */
let registering = true

function hebLexeme(part: string, pos: string): string {
  if (HEB_PREFIX[part]) {
    const id = `he:lex:${part}`
    const p = HEB_PREFIX[part]
    if (registering && !hebLex.has(id)) hebLex.set(id, { id, lemma: p.lemma, translit: transliterateHebrew(p.lemma), pos: p.pos })
    return id
  }
  const key = strongKey(part)
  const id = `he:lex:${key}`
  if (registering && !hebLex.has(id)) {
    const entry = tbesh.get(key) ?? tbesh.get(key.replace(/[a-z]$/, ''))
    if (!entry) throw new Error(`Strong ${key} não encontrado no TBESH`)
    hebLex.set(id, { id, lemma: entry.lemma, translit: transliterateHebrew(entry.lemma), pos, strong: key })
  }
  return id
}

function parseHebrewVerse(xml: string, osis: string): WordOccurrence[] {
  const m = xml.match(new RegExp(`<verse osisID="${osis.replace(/\./g, '\\.')}">([\\s\\S]*?)</verse>`))
  if (!m) throw new Error(`versículo não encontrado: ${osis}`)
  const body = m[1].replace(/<note[\s\S]*?<\/note>/g, '')
  const words: WordOccurrence[] = []
  const re = /<w ([^>]*)>([\s\S]*?)<\/w>(\s*<seg type="x-maqqef">[^<]*<\/seg>)?/g
  for (let w = re.exec(body); w; w = re.exec(body)) {
    const attr = (name: string) => w![1].match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? ''
    const text = stripCantillation(w[2].replace(/<[^>]+>/g, ''))
    const pieces = text.split('/')
    const lemmaParts = attr('lemma').split('/')
    const morphs = parseOshb(attr('morph'))
    if (pieces.length !== morphs.length)
      throw new Error(`${osis}: ${pieces.length} segmentos de texto para ${morphs.length} de morfologia (${text})`)
    let li = 0
    const segments: Segment[] = pieces.map((piece, i) => {
      const morph = morphs[i]
      if (morph.pos === 'suffix') return { text: piece, lexemeId: null, role: 'suffix', morph }
      const part = lemmaParts[li++]
      const role = HEB_PREFIX[part] ? 'prefix' : 'stem'
      return { text: piece, lexemeId: hebLexeme(part, morph.pos), role, morph }
    })
    // palavra só com prefixo + sufixo (לְךָ, "para ti"): a preposição é o segmento principal
    if (!segments.some((s) => s.role === 'stem')) {
      const last = segments.filter((s) => s.role === 'prefix').pop()
      if (last) last.role = 'stem'
    }
    const plain = pieces.join('')
    words.push({
      id: `he:w:${attr('id')}`,
      surface: plain + (w[3] ? '־' : ''),
      plain: stripMaqqef(plain),
      translit: transliterateHebrew(plain),
      segments,
    })
  }
  return words
}

// ---------- grego ----------

function grkLexeme(rawLemma: string, pos: string): string {
  // MorphGNT grafa o ν/ς móvel entre parênteses: οὕτω(ς)
  const lemma = rawLemma.replace(/[()]/g, '')
  const id = `gr:lex:${lemma}`
  if (registering && !grkLex.has(id))
    grkLex.set(id, { id, lemma, translit: transliterateGreek(lemma), pos, strong: tbesgByLemma.get(lemma) })
  return id
}

function parseGreekVerse(raw: string, bcv: string): WordOccurrence[] {
  const words: WordOccurrence[] = []
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith(bcv)) continue
    // sinais do aparato crítico do SBLGNT (⸀ ⸂ ⸃ …) não fazem parte do texto
    const [, pos, parse, text, word, , lemma] = line.split(' ').map((c) => c.replace(/[⸀-⸏]/g, '').normalize('NFC'))
    const morph = parseMorphGnt(pos, parse)
    words.push({
      id: `gr:w:${bcv}.${words.length + 1}`,
      surface: text,
      plain: word,
      translit: transliterateGreek(word),
      segments: [{ text: word, lexemeId: grkLexeme(lemma, morph.pos), role: 'stem', morph }],
    })
  }
  if (!words.length) throw new Error(`versículo não encontrado no MorphGNT: ${bcv}`)
  return words
}

const pad = (n: number) => String(n).padStart(2, '0')

async function verseWords(languageId: string, book: string, chapter: number, verse: number) {
  if (languageId === 'hebrew') {
    const osis = `${book}.${chapter}.${verse}`
    return { osis, words: parseHebrewVerse(await source(SOURCES.oshb(book)), osis) }
  }
  const g = GNT_FILES[book]
  if (!g) throw new Error(`livro grego não mapeado: ${book}`)
  const osis = `${book}.${chapter}.${verse}`
  return { osis, words: parseGreekVerse(await source(SOURCES.gnt(g.file)), `${g.num}${pad(chapter)}${pad(verse)}`) }
}

// ---------- principal ----------

interface Config {
  texts: { id: string; languageId: 'hebrew' | 'greek'; book: string; chapter: number; from: number; to: number }[]
  extraLexemes: { hebrew: string[]; greek: string[] }
  contexts: { id: string; languageId: 'hebrew' | 'greek'; lexemeId: string; book: string; chapter: number; verse: number }[]
}

async function main(): Promise<void> {
  const config: Config = JSON.parse(readFileSync(join(ROOT, 'content/sources/passages.json'), 'utf8'))
  tbesh = loadStep(await source(SOURCES.tbesh))
  tbesg = loadStep(await source(SOURCES.tbesg))
  tbesgByLemma = new Map([...tbesg].map(([k, v]) => [v.lemma, k]))

  for (const t of config.texts) {
    const verses = []
    for (let v = t.from; v <= t.to; v++) {
      const { osis, words } = await verseWords(t.languageId, t.book, t.chapter, v)
      verses.push({ osis, ref: `${BOOK_PT[t.book]} ${t.chapter}:${v}`, words })
    }
    const ref = `${BOOK_PT[t.book]} ${t.chapter}:${t.from}${t.to > t.from ? `–${t.to}` : ''}`
    writeJson(`content/texts/generated/${t.id}.json`, { id: t.id, languageId: t.languageId, ref, verses })
    console.log(`✓ ${t.id}: ${verses.length} versículos, ${verses.reduce((n, v) => n + v.words.length, 0)} palavras`)
  }

  // Registro por idioma: o app importa só o do idioma em uso (code splitting).
  for (const lang of ['hebrew', 'greek'] as const) {
    const ids = config.texts.filter((t) => t.languageId === lang).map((t) => t.id)
    const withOverlay = ids.filter((id) => {
      const ok = existsSync(join(ROOT, `content/texts/overlays/${id}.json`))
      if (!ok) console.warn(`! ${id}: sem overlay em content/texts/overlays — texto fora do registro`)
      return ok
    })
    const lines = [
      '// GERADO por scripts/build-texts.ts — não editar à mão.',
      ...withOverlay.flatMap((id, i) => [
        `import g${i} from './generated/${id}.json'`,
        `import o${i} from './overlays/${id}.json'`,
      ]),
      '',
      `export const texts = [${withOverlay.map((_, i) => `{ generated: g${i}, overlay: o${i} }`).join(', ')}]`,
      '',
    ]
    writeFileSync(join(ROOT, `content/texts/registry.${lang}.ts`), lines.join('\n'))
  }

  const contexts: Record<string, unknown[]> = { hebrew: [], greek: [] }
  registering = false
  for (const c of config.contexts) {
    const { words } = await verseWords(c.languageId, c.book, c.chapter, c.verse)
    const hit = words.find((w) => w.segments.some((s) => s.lexemeId === c.lexemeId))
    if (!hit) throw new Error(`contexto ${c.id}: lexema ${c.lexemeId} não ocorre no versículo`)
    contexts[c.languageId].push({
      id: c.id,
      lexemeId: c.lexemeId,
      ref: `${BOOK_PT[c.book]} ${c.chapter}:${c.verse}`,
      verseText: words.map((w) => w.surface).join(' ').replace(/־ /g, '־'),
      surface: hit.plain,
    })
  }

  registering = true

  for (const key of config.extraLexemes.hebrew) {
    const entry = tbesh.get(key)
    if (!entry) throw new Error(`extraLexemes: ${key} não encontrado no TBESH`)
    const id = `he:lex:${key}`
    if (!hebLex.has(id))
      hebLex.set(id, { id, lemma: entry.lemma, translit: transliterateHebrew(entry.lemma), pos: stepPos(entry.pos), strong: key })
  }
  for (const lemma of config.extraLexemes.greek) {
    const strong = tbesgByLemma.get(lemma.normalize('NFC'))
    if (!strong) throw new Error(`extraLexemes: ${lemma} não encontrado no TBESG`)
    const id = `gr:lex:${lemma.normalize('NFC')}`
    if (!grkLex.has(id))
      grkLex.set(id, { id, lemma: lemma.normalize('NFC'), translit: transliterateGreek(lemma), pos: stepPos(tbesg.get(strong)!.pos), strong })
  }

  const sorted = (m: Map<string, GenLexeme>) => [...m.values()].sort((a, b) => a.id.localeCompare(b.id))
  writeJson('content/hebrew/lexemes.generated.json', sorted(hebLex))
  writeJson('content/greek/lexemes.generated.json', sorted(grkLex))
  writeJson('content/hebrew/contexts.generated.json', contexts.hebrew)
  writeJson('content/greek/contexts.generated.json', contexts.greek)
  console.log(`✓ lexemas: ${hebLex.size} hebraicos, ${grkLex.size} gregos`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
