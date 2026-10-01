import type { Direction, GeneratorId, LanguageId, SkillTarget } from './content'

/** Referência a um som: um item do conteúdo ou um texto livre (frase/versículo). */
export interface AudioRef {
  languageId: LanguageId
  /** id do item (letra, lexema) quando houver */
  itemId?: string
  /** texto na escrita original, usado como chave e como entrada do fallback */
  text: string
  level: 'phoneme' | 'word' | 'phrase'
}

/** Algo exibível: texto comum ou escrita original, com som opcional. */
export interface Display {
  text: string
  /** true = renderizar com fonte e direção do idioma */
  script?: boolean
  sub?: string
  audio?: AudioRef
  /** palavra a destacar dentro de `text` (a forma em análise, no versículo) */
  highlight?: string
}

export interface ExerciseBase {
  id: string
  generator: GeneratorId
  languageId: LanguageId
  /** o que este exercício mede; o primeiro é o alvo principal */
  targets: SkillTarget[]
  instruction: string
  /** cabeçalho de contexto (ex.: versículo de onde a forma foi tirada) */
  context?: Display
  hint?: string
  /** explicação mostrada depois da resposta */
  explanation?: string
  /** segunda chance facilitada depois de um erro (antifrustração) */
  retry?: boolean
}

export interface ChoiceOption {
  id: string
  label: Display
  correct: boolean
  /** por que esta opção errada é errada (diagnóstico) */
  why?: string
}

export interface ChoiceExercise extends ExerciseBase {
  kind: 'choice'
  prompt?: Display
  /** "ouvir sem ver": esconde a escrita do enunciado */
  audioOnly?: boolean
  options: ChoiceOption[]
}

export interface AssembleExercise extends ExerciseBase {
  kind: 'assemble'
  prompt?: Display
  audioOnly?: boolean
  tiles: string[]
  answer: string[]
  script: boolean
  dir: Direction
  joiner: '' | ' '
}

export interface MemoryExercise extends ExerciseBase {
  kind: 'memory'
  pairs: { id: string; itemId: string; a: Display; b: Display }[]
  /** ordem das cartas na mesa: chaves `${id}:a` / `${id}:b`, já embaralhadas */
  order: string[]
}

export interface TapWordExercise extends ExerciseBase {
  kind: 'tapWord'
  question: string
  words: string[]
  correctIndexes: number[]
  /** 'any' = basta tocar em uma correta; 'all' = marcar todas e confirmar */
  mode: 'any' | 'all'
  dir: Direction
}

export interface SelfRateExercise extends ExerciseBase {
  kind: 'selfRate'
  prompt: Display
  reveal: { translit: string; gloss?: string; audio: AudioRef }
}

export type Exercise =
  | ChoiceExercise
  | AssembleExercise
  | MemoryExercise
  | TapWordExercise
  | SelfRateExercise

export interface AnswerResult {
  correct: boolean
  ms: number
  hintUsed: boolean
  chosen?: string
  /** autoavaliação 1–4 (de novo, difícil, bom, fácil), quando o usuário informa */
  perceived?: 1 | 2 | 3 | 4
  /** resultado por item, em exercícios com vários itens (jogo de pares) */
  perItem?: Record<string, boolean>
}
