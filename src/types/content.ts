/**
 * Modelo de conteúdo (imutável, versionado junto com o app).
 *
 * Distinções mantidas de propósito, porque são distinções linguísticas reais:
 *   LEXEMA (entrada de dicionário) ≠ FORMA (palavra flexionada) ≠ OCORRÊNCIA (forma num versículo)
 *   SIGNIFICADO (glosa do lexema) ≠ TRADUÇÃO CONTEXTUAL (glosa da ocorrência)
 *   RAIZ / ETIMOLOGIA ≠ SIGNIFICADO
 */

export type LanguageId = 'hebrew' | 'greek'
export type Direction = 'rtl' | 'ltr'

/** Grau de certeza de uma afirmação. Exibido ao usuário; nunca omitido em notas. */
export type Epistemic =
  | 'fact' // fato linguístico ou textual verificável
  | 'consensus' // reconstrução amplamente aceita
  | 'hypothesis' // hipótese plausível, não demonstrada
  | 'debated' // há divergência acadêmica relevante
  | 'tradition' // tradição interpretativa
  | 'inference' // inferência do contexto histórico

export interface Language {
  id: LanguageId
  name: string
  nativeName: string
  direction: Direction
  /** prefixo usado nos ids de item: he / gr */
  prefix: string
  pronunciationModels: PronunciationModel[]
  defaultPronunciationId: string
}

export interface PronunciationModel {
  id: string
  languageId: LanguageId
  name: string
  kind: 'reconstructed' | 'academic-convention' | 'traditional' | 'modern'
  description: string
  /** aviso exibido sempre que este modelo está em uso */
  caveat: string
  /** BCP-47 usado apenas pelo fallback de síntese do navegador */
  ttsLang: string
}

export interface Course {
  languageId: LanguageId
  title: string
  tagline: string
  levels: Level[]
}

export interface Level {
  id: string
  number: number
  title: string
  summary: string
  /** 'planned' = aparece no mapa como caminho futuro, sem telas vazias */
  status: 'available' | 'planned'
  units: Unit[]
}

export interface Unit {
  id: string
  title: string
  summary: string
  /** "Por que estou aprendendo isso?" */
  why: string
  skillIds: string[]
  lessonIds: string[]
  /** domínio mínimo (0–1) das habilidades para liberar a unidade seguinte */
  masteryThreshold: number
}

export type MasteryDimension = 'lexeme' | 'form' | 'meaning' | 'audio' | 'reading' | 'morphology'

export interface SkillTarget {
  itemId: string
  dimension: MasteryDimension
}

export interface Skill {
  id: string
  languageId: LanguageId
  title: string
  description: string
  targets: SkillTarget[]
}

export type GeneratorId =
  | 'meaningChoose'
  | 'nameChoose'
  | 'listenChoose'
  | 'listenAssemble'
  | 'orderLetters'
  | 'findLetter'
  | 'findSound'
  | 'correctForm'
  | 'whoAmI'
  | 'morphBoss'
  | 'rootDetective'
  | 'rootHunt'
  | 'contextDetective'
  | 'errorHunt'
  | 'guidedTranslation'
  | 'dictation'
  | 'readAloud'
  | 'listenIdentify'
  | 'memory'
  | 'sentencePuzzle'
  | 'cloze'
  | 'textQuest'
  | 'bossFight'

export type LessonStep =
  | { type: 'teach'; itemIds: string[] }
  | { type: 'note'; style: 'observe' | 'rule' | 'why'; title: string; body: string; example?: string }
  | {
      type: 'exercise'
      generator: GeneratorId
      /** itens-alvo; padrão = newItems da lição */
      itemIds?: string[]
      count?: number
      textId?: string
      /** variação do gerador (ex.: 'upper' = maiúsculas gregas) */
      variant?: string
    }
  | { type: 'read'; textId: string }

export interface Lesson {
  id: string
  languageId: LanguageId
  unitId: string
  title: string
  kind: 'lesson' | 'boss'
  /** frase curta: "Hoje você vai aprender 4 letras." */
  goal: string
  newItems: string[]
  /** itens antigos que voltam nesta lição (interleaving) */
  reviewItems: string[]
  steps: LessonStep[]
}

export interface OriginNote {
  text: string
  epistemic: Epistemic
}

/** Letra, sinal vocálico ou diacrítico. */
export interface Glyph {
  kind: 'letter' | 'vowel' | 'mark'
  id: string
  languageId: LanguageId
  /** o caractere (para sinais combinantes, sobre uma letra-suporte) */
  display: string
  /** caractere(s) cru(s), sem suporte */
  char: string
  name: string
  translit: string
  /** descrição do som para falantes de português, por modelo de pronúncia */
  sound: Record<string, string>
  /** texto enviado ao motor de áudio quando não há gravação */
  speak: string
  /** texto alternativo por modelo de pronúncia (ex.: nome clássico da letra) */
  speakBy?: Record<string, string>
  upper?: string
  finalForm?: string
  confusables: string[]
  origin?: OriginNote
  note?: string
}

export interface RootInfo {
  /** consoantes da raiz (hebraico) ou radical (grego) */
  letters: string
  note?: string
}

export interface Lexeme {
  kind: 'lexeme'
  id: string
  languageId: LanguageId
  lemma: string
  translit: string
  pos: string
  /** glosas em português; a primeira é a principal. São ponto de partida, não "o significado". */
  glosses: string[]
  strong?: string
  /** texto enviado ao áudio quando difere do lema (ex.: o Tetragrama é lido Adonai) */
  speak?: string
  root?: RootInfo
  usageNote?: string
  windowIds?: string[]
}

export type LearningItem = Glyph | Lexeme

export interface Morphology {
  /** código original da fonte, preservado para auditoria */
  code: string
  source: 'oshb' | 'morphgnt'
  pos: string
  subtype?: string
  person?: '1' | '2' | '3'
  gender?: 'm' | 'f' | 'n' | 'c'
  number?: 's' | 'd' | 'p'
  state?: 'absolute' | 'construct' | 'determined'
  /** binyan (hebraico) */
  stem?: string
  /** conjugação hebraica (perfeito, wayyiqtol…) ou tempo grego */
  tense?: string
  voice?: string
  mood?: string
  case?: string
  degree?: string
}

export interface Segment {
  text: string
  /** null para sufixos pronominais (descritos só pela morfologia) */
  lexemeId: string | null
  role: 'prefix' | 'stem' | 'suffix'
  morph: Morphology
}

export interface WordOccurrence {
  id: string
  /** como aparece no texto (com pontuação/maqqef) */
  surface: string
  /** sem pontuação */
  plain: string
  translit: string
  segments: Segment[]
  /** glosa contextual desta ocorrência (curadoria) */
  gloss?: string
}

export interface Verse {
  osis: string
  ref: string
  words: WordOccurrence[]
  translation: string
}

export interface TextNote {
  verse: string
  title: string
  body: string
  epistemic: Epistemic
}

export interface Text {
  id: string
  languageId: LanguageId
  title: string
  ref: string
  genre: 'narrative' | 'poetry' | 'prayer' | 'law' | 'discourse' | 'blessing'
  /** ordem na trilha "Eu consigo ler" */
  tier: number
  isPrayer: boolean
  intro: string
  verses: Verse[]
  notes: TextNote[]
  secretIds: string[]
  windowIds: string[]
  sourceIds: string[]
  /** unidade cujo domínio libera este texto (revisão livre depois) */
  unlockAfterUnitId?: string
}

/** "Segredos do texto": fenômenos que se perdem na tradução. */
export interface Secret {
  id: string
  languageId: LanguageId
  textId?: string
  ref: string
  category:
    | 'repetition'
    | 'root-repetition'
    | 'paronomasia'
    | 'alliteration'
    | 'assonance'
    | 'parallelism'
    | 'contrast'
    | 'ambiguity'
    | 'polysemy'
    | 'idiom'
    | 'not-wordplay'
  title: string
  observe: string
  wordA: { text: string; translit: string; gloss: string }
  wordB?: { text: string; translit: string; gloss: string }
  question: string
  verdict: 'yes' | 'possibly' | 'no'
  explanation: string
  epistemic: Epistemic
  references: string[]
}

/** "Abra a janela": mundo antigo. */
export interface CultureWindow {
  id: string
  languageId: LanguageId
  topic: string
  title: string
  /** o que o texto bíblico diz */
  text: string
  /** o que sabemos do contexto histórico */
  context: string
  /** o que é inferência / reconstrução */
  inference?: string
  epistemic: Epistemic
  references: string[]
}

export interface RootFamily {
  id: string
  languageId: LanguageId
  root: string
  rootTranslit: string
  /** descrição do campo, não "o significado da raiz" */
  field: string
  memberIds: string[]
  outsiderIds: string[]
  caution: string
}

export interface ContextCase {
  id: string
  languageId: LanguageId
  lexemeId: string
  ref: string
  verseText: string
  /** forma do lexema neste versículo */
  surface: string
  translation: string
  sense: string
}

export interface ErrorHuntCase {
  id: string
  languageId: LanguageId
  word: string
  ref: string
  lexemeId?: string
  /** afirmações sobre a palavra; exatamente uma é falsa */
  claims: { text: string; wrong: boolean; why?: string }[]
}

export interface AudioSource {
  id: string
  name: string
  kind: 'recording' | 'generated' | 'browser-tts'
  license: string
  url?: string
  note?: string
}

export interface AudioAsset {
  /** chave: id do item ou `text:<hash>` */
  key: string
  languageId: LanguageId
  modelId: string
  level: 'phoneme' | 'word' | 'phrase'
  path: string
  sourceId: string
}

export interface AudioManifest {
  version: number
  sources: AudioSource[]
  assets: AudioAsset[]
}

export interface AchievementDef {
  id: string
  title: string
  description: string
  /** mensagem de competência mostrada ao conquistar */
  message: string
  icon: string
  rule:
    | { type: 'lessons'; count: number }
    | { type: 'itemsFamiliar'; kind: 'letter' | 'lexeme'; languageId?: LanguageId; count: number }
    | { type: 'textsRead'; count: number; prayer?: boolean }
    | { type: 'streak'; days: number }
    | { type: 'reviews'; count: number }
    | { type: 'noTranslitRead' }
    | { type: 'bothLanguages' }
}

export interface SourceEntry {
  id: string
  name: string
  url: string
  purpose: string
  license: string
  usage: 'incorporated' | 'reference-only'
  category: 'text' | 'morphology' | 'lexicon' | 'grammar' | 'pedagogy' | 'audio' | 'font' | 'context' | 'software'
  attribution?: string
}

/** Pacote de conteúdo de um idioma, carregado sob demanda. */
export interface ContentBundle {
  language: Language
  course: Course
  skills: Skill[]
  lessons: Lesson[]
  glyphs: Glyph[]
  lexemes: Lexeme[]
  texts: Text[]
  secrets: Secret[]
  windows: CultureWindow[]
  rootFamilies: RootFamily[]
  contextCases: ContextCase[]
  errorHunts: ErrorHuntCase[]
}
