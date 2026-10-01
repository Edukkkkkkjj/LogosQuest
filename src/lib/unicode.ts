/** Utilitários Unicode para hebraico pontuado e grego politônico. */

const CANTILLATION = /[֑-ֽ֯׀׃׆]/g
const NIQQUD = /[ְ-ׇּׁׂׅׄ]/g
const MAQQEF = /־/g
const COMBINING = /\p{M}/u

/** Remove acentos de cantilação (te'amim), meteg, paseq e sof pasuq; mantém o niqqud. */
export function stripCantillation(s: string): string {
  return s.replace(CANTILLATION, '').normalize('NFC')
}

/** Remove vogais e pontos, deixando só as consoantes. */
export function stripNiqqud(s: string): string {
  return s.normalize('NFD').replace(CANTILLATION, '').replace(NIQQUD, '').normalize('NFC')
}

export function stripMaqqef(s: string): string {
  return s.replace(MAQQEF, '')
}

/** Remove todos os diacríticos gregos (acentos, espíritos, iota subscrito, trema). */
export function stripGreekDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
}

/**
 * Divide em grafemas: cada letra-base com seus sinais combinantes.
 * Em hebraico, `בְּ` é um bloco (bet + dagesh + shewa), não três.
 */
export function splitGraphemes(s: string): string[] {
  const out: string[] = []
  for (const ch of s.normalize('NFD')) {
    if (COMBINING.test(ch) && out.length > 0) out[out.length - 1] += ch
    else out.push(ch)
  }
  return out.map((g) => g.normalize('NFC'))
}

export function isHebrew(s: string): boolean {
  return /[֐-׿]/.test(s)
}

export function isGreek(s: string): boolean {
  return /[Ͱ-Ͽἀ-῿]/.test(s)
}

export interface UnicodeIssue {
  code: 'not-nfc' | 'replacement-char' | 'bidi-control' | 'mixed-script' | 'stray-combining' | 'latin-lookalike'
  detail: string
}

/** Problemas comuns em conteúdo copiado: usado pelo validador de conteúdo. */
export function findUnicodeIssues(s: string, expect: 'hebrew' | 'greek'): UnicodeIssue[] {
  const issues: UnicodeIssue[] = []
  if (s !== s.normalize('NFC')) issues.push({ code: 'not-nfc', detail: 'texto não está em NFC' })
  if (s.includes('�')) issues.push({ code: 'replacement-char', detail: 'contém U+FFFD' })
  if (/[‎‏‪-‮⁦-⁩]/.test(s))
    issues.push({ code: 'bidi-control', detail: 'contém caractere de controle bidi' })
  if (/^\p{M}/u.test(s)) issues.push({ code: 'stray-combining', detail: 'começa com sinal combinante' })
  if (expect === 'hebrew' && isGreek(s)) issues.push({ code: 'mixed-script', detail: 'grego em campo hebraico' })
  if (expect === 'greek' && isHebrew(s)) issues.push({ code: 'mixed-script', detail: 'hebraico em campo grego' })
  if (/[A-Za-z]/.test(s)) issues.push({ code: 'latin-lookalike', detail: 'letra latina em campo de escrita original' })
  return issues
}
