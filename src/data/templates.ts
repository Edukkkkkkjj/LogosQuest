/**
 * Modelos de lição. Uma lição declara só o que ensina (itens novos, itens de
 * revisão, texto de apoio); o modelo define a sequência pedagógica:
 *   mostrar → ouvir → reconhecer → associar → ver em contexto → produzir → rever.
 */
import type { LessonStep } from '../types/content'

export type LessonTemplate = 'glyphs' | 'vocab' | 'reading' | 'boss'

export interface NoteSpec {
  title: string
  body: string
  example?: string
}

interface TemplateInput {
  newItems: string[]
  reviewItems: string[]
  textId?: string
  observe?: NoteSpec
  rule?: NoteSpec
}

const note = (style: 'observe' | 'rule' | 'why', n: NoteSpec): LessonStep => ({ type: 'note', style, ...n })

export function expandTemplate(template: LessonTemplate, l: TemplateInput): LessonStep[] {
  const fresh = l.newItems
  const all = [...l.newItems, ...l.reviewItems]
  const steps: LessonStep[] = []
  const observe = () => l.observe && steps.push(note('observe', l.observe))
  const rule = () => l.rule && steps.push(note('rule', l.rule))

  switch (template) {
    case 'glyphs':
      observe()
      steps.push(
        { type: 'teach', itemIds: fresh },
        { type: 'exercise', generator: 'nameChoose', itemIds: fresh },
        { type: 'exercise', generator: 'findLetter', itemIds: fresh },
      )
      rule()
      steps.push(
        { type: 'exercise', generator: 'listenChoose', itemIds: fresh },
        { type: 'exercise', generator: 'memory', itemIds: fresh },
        { type: 'exercise', generator: 'findSound', itemIds: fresh, count: 3 },
      )
      // interleaving: o material antigo volta misturado ao novo
      if (l.reviewItems.length)
        steps.push(
          { type: 'exercise', generator: 'nameChoose', itemIds: all, count: 5 },
          { type: 'exercise', generator: 'findLetter', itemIds: all, count: 4 },
        )
      break

    case 'vocab':
      observe()
      steps.push(
        { type: 'teach', itemIds: fresh },
        { type: 'exercise', generator: 'meaningChoose', itemIds: fresh },
        { type: 'exercise', generator: 'listenChoose', itemIds: fresh, count: 4 },
      )
      rule()
      steps.push(
        { type: 'exercise', generator: 'memory', itemIds: fresh },
        { type: 'exercise', generator: 'orderLetters', itemIds: fresh, count: 3 },
      )
      if (l.textId) steps.push({ type: 'exercise', generator: 'cloze', itemIds: fresh, textId: l.textId, count: 3 })
      steps.push(
        { type: 'exercise', generator: 'meaningChoose', itemIds: all, count: 5 },
        { type: 'exercise', generator: 'listenAssemble', itemIds: fresh, count: 2 },
        { type: 'exercise', generator: 'readAloud', itemIds: fresh, count: 2 },
      )
      break

    case 'reading':
      observe()
      steps.push(
        { type: 'teach', itemIds: fresh },
        { type: 'exercise', generator: 'readAloud', itemIds: fresh },
        { type: 'exercise', generator: 'listenChoose', itemIds: fresh, count: 4 },
        { type: 'exercise', generator: 'orderLetters', itemIds: fresh, count: 4 },
      )
      rule()
      steps.push(
        { type: 'exercise', generator: 'meaningChoose', itemIds: fresh, count: 4 },
        { type: 'exercise', generator: 'dictation', itemIds: fresh, count: 3 },
        { type: 'exercise', generator: 'listenIdentify', itemIds: all, count: 3 },
      )
      if (l.reviewItems.length) steps.push({ type: 'exercise', generator: 'readAloud', itemIds: l.reviewItems, count: 3 })
      break

    case 'boss':
      steps.push({ type: 'exercise', generator: 'bossFight', itemIds: all, textId: l.textId })
      if (l.textId) steps.push({ type: 'read', textId: l.textId })
      break
  }
  return steps
}
