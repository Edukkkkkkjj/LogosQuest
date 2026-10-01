/** Rótulos em português para a morfologia, em camadas (progressive disclosure). */
import type { Morphology } from '../../types/content'

export const POS_PT: Record<string, string> = {
  noun: 'substantivo', verb: 'verbo', adjective: 'adjetivo', pronoun: 'pronome',
  preposition: 'preposição', conjunction: 'conjunção', adverb: 'advérbio', particle: 'partícula',
  suffix: 'sufixo', article: 'artigo', interjection: 'interjeição', unknown: 'não classificado',
}

export const SUBTYPE_PT: Record<string, string> = {
  common: 'comum', proper: 'nome próprio', gentilic: 'gentílico', cardinal: 'numeral cardinal',
  ordinal: 'numeral ordinal', adjective: '', demonstrative: 'demonstrativo', indefinite: 'indefinido',
  interrogative: 'interrogativo', personal: 'pessoal', relative: 'relativo',
  'directional-he': 'he direcional', 'paragogic-he': 'he paragógico', 'paragogic-nun': 'nun paragógico',
  pronominal: 'pronominal', affirmation: 'de afirmação', article: '', exhortation: 'de exortação',
  negative: 'de negação', 'object-marker': 'marcador de objeto direto', 'with-article': 'com artigo embutido',
  interjection: 'interjeição',
}

export const PERSON_PT: Record<string, string> = { '1': '1ª pessoa', '2': '2ª pessoa', '3': '3ª pessoa' }
export const GENDER_PT: Record<string, string> = { m: 'masculino', f: 'feminino', n: 'neutro', c: 'comum (m./f.)' }
export const NUMBER_PT: Record<string, string> = { s: 'singular', d: 'dual', p: 'plural' }
export const STATE_PT: Record<string, string> = {
  absolute: 'estado absoluto', construct: 'estado construto', determined: 'determinado',
}
export const STEM_PT: Record<string, string> = {
  qal: 'Qal', nifal: 'Nifal', piel: 'Piel', pual: 'Pual', hifil: 'Hifil', hofal: 'Hofal', hitpael: 'Hitpael',
  polel: 'Polel', polal: 'Polal', hitpolel: 'Hitpolel', pilpel: 'Pilpel', hishtafel: 'Hishtafel',
}
export const TENSE_PT: Record<string, string> = {
  qatal: 'perfeito (qatal)', weqatal: 'perfeito consecutivo (weqatal)', yiqtol: 'imperfeito (yiqtol)',
  wayyiqtol: 'imperfeito consecutivo (wayyiqtol)', cohortative: 'coortativo', jussive: 'jussivo',
  imperative: 'imperativo', participle: 'particípio ativo', 'participle-passive': 'particípio passivo',
  'infinitive-absolute': 'infinitivo absoluto', 'infinitive-construct': 'infinitivo construto',
  present: 'presente', imperfect: 'imperfeito', future: 'futuro', aorist: 'aoristo',
  perfect: 'perfeito', pluperfect: 'mais-que-perfeito',
}
export const VOICE_PT: Record<string, string> = { active: 'voz ativa', middle: 'voz média', passive: 'voz passiva' }
export const MOOD_PT: Record<string, string> = {
  indicative: 'indicativo', imperative: 'imperativo', subjunctive: 'subjuntivo', optative: 'optativo',
  infinitive: 'infinitivo', participle: 'particípio',
}
export const CASE_PT: Record<string, string> = {
  nominative: 'nominativo', genitive: 'genitivo', dative: 'dativo', accusative: 'acusativo', vocative: 'vocativo',
}
export const CASE_ROLE_PT: Record<string, string> = {
  nominative: 'costuma marcar o sujeito', genitive: 'costuma indicar posse ou origem ("de…")',
  dative: 'costuma indicar o destinatário ou o meio ("a/para/em…")',
  accusative: 'costuma marcar o objeto direto', vocative: 'usado para chamar alguém',
}

export type MorphFeature = 'pos' | 'stem' | 'tense' | 'voice' | 'mood' | 'person' | 'gender' | 'number' | 'case' | 'state'

export const FEATURE_LABEL: Record<MorphFeature, string> = {
  pos: 'Classe', stem: 'Tronco (binyan)', tense: 'Conjugação / tempo', voice: 'Voz', mood: 'Modo',
  person: 'Pessoa', gender: 'Gênero', number: 'Número', case: 'Caso', state: 'Estado',
}

const TABLES: Record<MorphFeature, Record<string, string>> = {
  pos: POS_PT, stem: STEM_PT, tense: TENSE_PT, voice: VOICE_PT, mood: MOOD_PT,
  person: PERSON_PT, gender: GENDER_PT, number: NUMBER_PT, case: CASE_PT, state: STATE_PT,
}

export function featureValuePt(feature: MorphFeature, value: string): string {
  return TABLES[feature][value] ?? value
}

export function featureOptions(feature: MorphFeature): string[] {
  return Object.keys(TABLES[feature])
}

/** Camadas da análise, da mais geral para a mais específica. */
export function morphLayers(m: Morphology): { feature: MorphFeature; label: string; value: string }[] {
  const order: MorphFeature[] = ['pos', 'stem', 'tense', 'voice', 'mood', 'person', 'case', 'gender', 'number', 'state']
  const out: { feature: MorphFeature; label: string; value: string }[] = []
  for (const f of order) {
    const raw = m[f]
    if (!raw) continue
    let value = featureValuePt(f, raw)
    if (f === 'pos' && m.subtype && SUBTYPE_PT[m.subtype]) value += ` ${SUBTYPE_PT[m.subtype]}`
    out.push({ feature: f, label: FEATURE_LABEL[f], value })
  }
  return out
}

/** Resumo de uma linha: "verbo · Qal · perfeito (qatal) · 3ª pessoa · masculino · singular". */
export function summarizeMorph(m: Morphology): string {
  return morphLayers(m)
    .map((l) => l.value)
    .join(' · ')
}
