/**
 * Transliteração automática APROXIMADA, apenas como apoio de leitura.
 * Não é uma análise fonológica: o shewa, o qamats ḥatuf e o dagesh forte
 * são tratados por regras simples. O app avisa disso onde a exibe.
 */
import { stripCantillation, stripGreekDiacritics } from './unicode'

const HEB_CONS: Record<string, string> = {
  א: 'ʾ', ב: 'v', ג: 'g', ד: 'd', ה: 'h', ו: 'v', ז: 'z', ח: 'ḥ', ט: 'ṭ', י: 'y',
  כ: 'kh', ך: 'kh', ל: 'l', מ: 'm', ם: 'm', נ: 'n', ן: 'n', ס: 's', ע: 'ʿ',
  פ: 'f', ף: 'f', צ: 'ts', ץ: 'ts', ק: 'q', ר: 'r', ש: 'sh', ת: 't',
}
const HEB_DAGESH: Record<string, string> = { ב: 'b', כ: 'k', ך: 'k', פ: 'p', ף: 'p' }
const HEB_VOWEL: Record<string, string> = {
  'ֱ': 'e', 'ֲ': 'a', 'ֳ': 'o', 'ִ': 'i', 'ֵ': 'e', 'ֶ': 'e',
  'ַ': 'a', 'ָ': 'a', 'ֹ': 'o', 'ֺ': 'o', 'ֻ': 'u', 'ׇ': 'o',
}
const SHEWA = 'ְ'
const DAGESH = 'ּ'
const SIN_DOT = 'ׂ'
const HOLAM = 'ֹ'
const QAMATS = 'ָ'

interface Cluster {
  base: string
  marks: string
}

function clusters(word: string): Cluster[] {
  const out: Cluster[] = []
  for (const ch of stripCantillation(word).normalize('NFD')) {
    if (/[א-ת]/.test(ch)) out.push({ base: ch, marks: '' })
    else if (/[ְ-ׇ]/.test(ch) && out.length) out[out.length - 1].marks += ch
  }
  return out
}

function vowelOf(c: Cluster): string | undefined {
  for (const m of c.marks) if (HEB_VOWEL[m]) return m
  return undefined
}

export function transliterateHebrew(word: string): string {
  const cs = clusters(word)
  if (cs.length === 0) return ''
  // O Tetragrama não é vocalizado: a pontuação massorética é um qere perpétuo.
  const cons = cs.map((c) => c.base).join('')
  if (cons.endsWith('יהוה')) {
    const prefix = cs.slice(0, cs.length - 4)
    const head = prefix.length ? transliterateClusters(prefix, false) : ''
    return head + (head ? '-' : '') + 'YHWH'
  }
  return transliterateClusters(cs, true)
}

function transliterateClusters(cs: Cluster[], wordFinal: boolean): string {
  let out = ''
  for (let i = 0; i < cs.length; i++) {
    const c = cs[i]
    const prev = cs[i - 1]
    const last = wordFinal && i === cs.length - 1
    const hasDagesh = c.marks.includes(DAGESH)
    const v = vowelOf(c)
    const hasShewa = c.marks.includes(SHEWA)
    const prevOpen = prev !== undefined && vowelOf(prev) === undefined && !prev.marks.includes(SHEWA)

    // Vav como vogal: shureq (וּ) ou ḥolam male (וֹ)
    if (c.base === 'ו' && !v && hasDagesh && (i === 0 || prevOpen)) {
      out += 'u'
      continue
    }
    if (c.base === 'ו' && c.marks.includes(HOLAM) && i > 0 && prevOpen) {
      out += 'o'
      continue
    }
    // Yod mater lectionis depois de i/e
    if (c.base === 'י' && !v && !hasShewa && !hasDagesh && prev) {
      const pv = vowelOf(prev)
      if (pv && 'ie'.includes(HEB_VOWEL[pv])) continue
    }
    // Terminação ־ָיו: o yod não soa (panav, não panayv)
    const next = cs[i + 1]
    if (c.base === 'י' && !v && prev && vowelOf(prev) === QAMATS && next?.base === 'ו' && !next.marks && i + 1 === cs.length - 1)
      continue
    // He final muda (sem mappiq) e alef quiescente
    if (c.base === 'ה' && last && !v && !hasDagesh) continue
    if (c.base === 'א' && !v && !hasShewa) continue

    let consonant = hasDagesh && HEB_DAGESH[c.base] ? HEB_DAGESH[c.base] : HEB_CONS[c.base]
    if (c.base === 'ש' && c.marks.includes(SIN_DOT)) consonant = 's'

    // Pataḥ furtivo: a vogal soa antes da gutural final
    const furtive = last && v === 'ַ' && (c.base === 'ח' || c.base === 'ע' || (c.base === 'ה' && hasDagesh))
    if (furtive) {
      out += 'a' + consonant
      continue
    }
    out += consonant
    // כָּל: qamats ḥatuf (kol), a exceção mais frequente do texto
    const kol = c.base === 'כ' && v === QAMATS && next?.base === 'ל' && !next.marks && i + 1 === cs.length - 1
    if (v) out += kol ? 'o' : HEB_VOWEL[v]
    else if (hasShewa) {
      const prevShewa = prev?.marks.includes(SHEWA) && !vowelOf(prev)
      if (i === 0 || (!last && (prevShewa || hasDagesh))) out += 'ə'
    }
  }
  return out
}

const GREEK: Record<string, string> = {
  α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i', κ: 'k', λ: 'l',
  μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's', ς: 's', τ: 't', υ: 'y', φ: 'ph',
  χ: 'ch', ψ: 'ps', ω: 'ō',
}
const ROUGH = '̔'

export function transliterateGreek(word: string): string {
  const nfd = word.normalize('NFD')
  const rough = nfd.includes(ROUGH)
  const plain = stripGreekDiacritics(word).toLowerCase()
  let out = ''
  for (let i = 0; i < plain.length; i++) {
    const ch = plain[i]
    const next = plain[i + 1]
    if (ch === 'γ' && next && 'γκξχ'.includes(next)) {
      out += 'n'
      continue
    }
    // υ em ditongo (αυ, ευ, ου, ηυ) soa/transcreve como u
    if (ch === 'υ' && i > 0 && 'αεοη'.includes(plain[i - 1])) {
      out += 'u'
      continue
    }
    out += GREEK[ch] ?? ''
  }
  if (rough) out = out.startsWith('r') ? 'rh' + out.slice(1) : 'h' + out
  return out
}

export function transliterate(languageId: 'hebrew' | 'greek', word: string): string {
  return languageId === 'hebrew' ? transliterateHebrew(word) : transliterateGreek(word)
}
