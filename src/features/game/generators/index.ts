/**
 * Registro dos geradores. Os exercícios nascem dos dados linguísticos:
 * nenhum componente de interface contém palavras ou perguntas fixas.
 */
import type { GeneratorId } from '../../../types/content'
import type { Exercise } from '../../../types/exercise'
import { isGlyph, type GenCtx, type GenParams, type Generator } from './core'
import {
  dictation, findLetter, findSound, listenAssemble, listenChoose, listenIdentify, meaningChoose, memory, nameChoose,
  orderLetters, readAloud,
} from './recognition'
import { contextDetective, errorHunt, rootDetective, rootHunt } from './special'
import { cloze, correctForm, guidedTranslation, morphBoss, sentencePuzzle, whoAmI } from './text'

/** "Text quest": pequenos desafios linguísticos sobre uma passagem. */
const textQuest: Generator = (ctx, p) => [
  ...cloze(ctx, { ...p, itemIds: [], count: 2 }),
  ...whoAmI(ctx, { ...p, itemIds: [], count: 1 }),
  ...guidedTranslation(ctx, { ...p, count: 1 }),
  ...sentencePuzzle(ctx, { ...p, count: 1 }),
]

/** "Boss fight": combina as habilidades da unidade, de preferência sobre um texto real. */
const bossFight: Generator = (ctx, p) => {
  const items = p.itemIds.map((id) => ctx.index.items.get(id))
  if (items.every(isGlyph))
    return ctx.rng.shuffle([
      ...nameChoose(ctx, { ...p, count: 6 }),
      ...findLetter(ctx, { ...p, count: 6 }),
      ...listenChoose(ctx, { ...p, count: 4 }),
      ...findSound(ctx, { ...p, count: 2 }),
      ...memory(ctx, p),
    ])
  if (!p.textId)
    return ctx.rng.shuffle([
      ...readAloud(ctx, { ...p, count: 3 }),
      ...listenChoose(ctx, { ...p, count: 4 }),
      ...orderLetters(ctx, { ...p, count: 3 }),
      ...meaningChoose(ctx, { ...p, count: 4 }),
      ...dictation(ctx, { ...p, count: 2 }),
      ...memory(ctx, p),
    ])
  return [
    ...ctx.rng.shuffle([...meaningChoose(ctx, { ...p, count: 6 }), ...cloze(ctx, { ...p, count: 3 }), ...listenIdentify(ctx, { ...p, count: 2 })]),
    ...whoAmI(ctx, { ...p, count: 2 }),
    ...morphBoss(ctx, { ...p, count: 1 }),
    ...guidedTranslation(ctx, { ...p, count: 2 }),
    ...sentencePuzzle(ctx, { ...p, count: 2 }),
  ]
}

export const GENERATORS: Record<GeneratorId, Generator> = {
  meaningChoose, nameChoose, listenChoose, listenAssemble, orderLetters, findLetter, findSound, correctForm, whoAmI,
  morphBoss, rootDetective, rootHunt, contextDetective, errorHunt, guidedTranslation, dictation, readAloud,
  listenIdentify, memory, sentencePuzzle, cloze, textQuest, bossFight,
}

export function generate(ctx: GenCtx, generator: GeneratorId, params: GenParams): Exercise[] {
  return GENERATORS[generator](ctx, params)
}

export type { GenCtx, GenParams }
