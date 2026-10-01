/**
 * Converte os códigos morfológicos das fontes (OSHB e MorphGNT)
 * para o modelo `Morphology` do app. O código original é preservado.
 */
import type { Morphology } from '../../types/content'

const GENDER: Record<string, Morphology['gender']> = { m: 'm', f: 'f', b: 'c', c: 'c', n: 'n' }
const NUMBER: Record<string, Morphology['number']> = { s: 's', d: 'd', p: 'p' }
const STATE: Record<string, Morphology['state']> = { a: 'absolute', c: 'construct', d: 'determined' }
const PERSON = new Set(['1', '2', '3'])

export const HEBREW_STEMS: Record<string, string> = {
  q: 'qal', N: 'nifal', p: 'piel', P: 'pual', h: 'hifil', H: 'hofal', t: 'hitpael',
  o: 'polel', O: 'polal', r: 'hitpolel', m: 'poel', M: 'poal', k: 'palel', K: 'pulal',
  Q: 'qal-passive', l: 'pilpel', L: 'polpal', f: 'hitpalpel', D: 'nitpael', j: 'pealal',
  i: 'pilel', u: 'hotpaal', c: 'tifil', v: 'hishtafel', w: 'nitpalel', y: 'nitpoel', z: 'hitpoel',
}

const HEBREW_CONJ: Record<string, string> = {
  p: 'qatal', q: 'weqatal', i: 'yiqtol', w: 'wayyiqtol', h: 'cohortative', j: 'jussive',
  v: 'imperative', r: 'participle', s: 'participle-passive', a: 'infinitive-absolute',
  c: 'infinitive-construct',
}

const SUBTYPE: Record<string, Record<string, string>> = {
  A: { a: 'adjective', c: 'cardinal', g: 'gentilic', o: 'ordinal' },
  N: { c: 'common', g: 'gentilic', p: 'proper' },
  P: { d: 'demonstrative', f: 'indefinite', i: 'interrogative', p: 'personal', r: 'relative' },
  S: { d: 'directional-he', h: 'paragogic-he', n: 'paragogic-nun', p: 'pronominal' },
  T: {
    a: 'affirmation', d: 'article', e: 'exhortation', i: 'interrogative', j: 'interjection',
    m: 'demonstrative', n: 'negative', o: 'object-marker', r: 'relative',
  },
}

function pgn(m: Morphology, s: string): void {
  if (PERSON.has(s[0])) m.person = s[0] as Morphology['person']
  if (GENDER[s[1]]) m.gender = GENDER[s[1]]
  if (NUMBER[s[2]]) m.number = NUMBER[s[2]]
}

function gns(m: Morphology, s: string): void {
  if (GENDER[s[0]]) m.gender = GENDER[s[0]]
  if (NUMBER[s[1]]) m.number = NUMBER[s[1]]
  if (STATE[s[2]]) m.state = STATE[s[2]]
}

/** Uma parte de um código OSHB (sem o prefixo de idioma), ex.: `Ncfsa`, `Vqp3ms`. */
export function parseOshbPart(part: string): Morphology {
  const m: Morphology = { code: part, source: 'oshb', pos: 'unknown' }
  const sub = SUBTYPE[part[0]]?.[part[1]]
  switch (part[0]) {
    case 'A':
      m.pos = 'adjective'
      m.subtype = sub
      gns(m, part.slice(2))
      break
    case 'C':
      m.pos = 'conjunction'
      break
    case 'D':
      m.pos = 'adverb'
      break
    case 'N':
      m.pos = 'noun'
      m.subtype = sub
      gns(m, part.slice(2))
      break
    case 'P':
      m.pos = 'pronoun'
      m.subtype = sub
      pgn(m, part.slice(2))
      break
    case 'R':
      m.pos = 'preposition'
      if (part[1] === 'd') m.subtype = 'with-article'
      break
    case 'S':
      m.pos = 'suffix'
      m.subtype = sub
      pgn(m, part.slice(2))
      break
    case 'T':
      m.pos = part[1] === 'd' ? 'article' : 'particle'
      m.subtype = sub
      break
    case 'V': {
      m.pos = 'verb'
      m.stem = HEBREW_STEMS[part[1]] ?? part[1]
      const conj = part[2]
      m.tense = HEBREW_CONJ[conj] ?? conj
      if (conj === 'r' || conj === 's') gns(m, part.slice(3))
      else if (conj !== 'a' && conj !== 'c') pgn(m, part.slice(3))
      break
    }
  }
  return m
}

/** Código OSHB completo de uma palavra, ex.: `HC/Td/Ncbsa` → uma morfologia por segmento. */
export function parseOshb(code: string): Morphology[] {
  return code
    .slice(1)
    .split('/')
    .map(parseOshbPart)
}

const GNT_POS: Record<string, [string, string?]> = {
  'A-': ['adjective'], 'C-': ['conjunction'], 'D-': ['adverb'], 'I-': ['interjection'],
  'N-': ['noun'], 'P-': ['preposition'], RA: ['article'], RD: ['pronoun', 'demonstrative'],
  RI: ['pronoun', 'interrogative'], RP: ['pronoun', 'personal'], RR: ['pronoun', 'relative'],
  'V-': ['verb'], 'X-': ['particle'],
}
const GNT_TENSE: Record<string, string> = {
  P: 'present', I: 'imperfect', F: 'future', A: 'aorist', X: 'perfect', Y: 'pluperfect',
}
const GNT_VOICE: Record<string, string> = { A: 'active', M: 'middle', P: 'passive' }
const GNT_MOOD: Record<string, string> = {
  I: 'indicative', D: 'imperative', S: 'subjunctive', O: 'optative', N: 'infinitive', P: 'participle',
}
const GNT_CASE: Record<string, string> = {
  N: 'nominative', G: 'genitive', D: 'dative', A: 'accusative', V: 'vocative',
}
const GNT_DEGREE: Record<string, string> = { C: 'comparative', S: 'superlative' }

/** MorphGNT: classe (2 caracteres) + análise (8 caracteres). */
export function parseMorphGnt(pos: string, parse: string): Morphology {
  const [p, subtype] = GNT_POS[pos] ?? ['unknown']
  const m: Morphology = { code: `${pos} ${parse}`, source: 'morphgnt', pos: p }
  if (subtype) m.subtype = subtype
  if (PERSON.has(parse[0])) m.person = parse[0] as Morphology['person']
  if (GNT_TENSE[parse[1]]) m.tense = GNT_TENSE[parse[1]]
  if (GNT_VOICE[parse[2]]) m.voice = GNT_VOICE[parse[2]]
  if (GNT_MOOD[parse[3]]) m.mood = GNT_MOOD[parse[3]]
  if (GNT_CASE[parse[4]]) m.case = GNT_CASE[parse[4]]
  if (NUMBER[parse[5]?.toLowerCase()]) m.number = NUMBER[parse[5].toLowerCase()]
  if (GENDER[parse[6]?.toLowerCase()]) m.gender = GENDER[parse[6].toLowerCase()]
  if (GNT_DEGREE[parse[7]]) m.degree = GNT_DEGREE[parse[7]]
  return m
}
