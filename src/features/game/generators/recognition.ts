/** Reconhecimento visual, auditivo e de significado: letras, sinais e palavras isoladas. */
import { splitGraphemes } from '../../../lib/unicode'
import type { LearningItem, MasteryDimension, SkillTarget } from '../../../types/content'
import type { AssembleExercise, Exercise, MemoryExercise, SelfRateExercise } from '../../../types/exercise'
import {
  audioOf, choice, distractors, exId, glyphLabel, glyphs, hasOwnSound, isGlyph, lexemes, script, scriptDisplay, soundOf, take,
  type GenCtx, type GenParams, type Generator,
} from './core'

const pool = (ctx: GenCtx, p: GenParams) => p.itemIds.map((id) => ctx.index.items.get(id)).filter((i): i is LearningItem => !!i)
/** dimensão "visual" de um item: forma para letras, leitura para palavras */
const visualDim = (i: LearningItem): MasteryDimension => (isGlyph(i) ? 'form' : 'reading')

/** Vê a letra → escolhe o nome/som. */
export const nameChoose: Generator = (ctx, p) => {
  const all = glyphs(ctx, p.itemIds).filter((g) => p.variant !== 'upper' || g.upper)
  return take(ctx, all, p.count).map((g) =>
    choice(
      ctx,
      {
        generator: 'nameChoose', targets: [{ itemId: g.id, dimension: 'form' }],
        instruction: g.kind === 'letter' ? 'Que letra é esta?' : 'Que sinal é este?',
        prompt: { text: p.variant === 'upper' ? g.upper! : g.display, script: true, audio: audioOf(g) },
        hint: soundOf(g, ctx.modelId), explanation: `${g.name}: ${soundOf(g, ctx.modelId)}`,
      },
      { id: g.id, label: { text: glyphLabel(g) } },
      distractors(ctx, g, all, 3).map((d) => ({ id: d.id, label: { text: glyphLabel(d as typeof g) } })),
    ),
  )
}

/** Lê o nome → encontra a letra entre formas parecidas. */
export const findLetter: Generator = (ctx, p) => {
  const all = glyphs(ctx, p.itemIds).filter((g) => p.variant !== 'upper' || g.upper)
  const show = (g: (typeof all)[number]) => (p.variant === 'upper' ? g.upper! : g.display)
  return take(ctx, all, p.count).map((g) =>
    choice(
      ctx,
      {
        generator: 'findLetter', targets: [{ itemId: g.id, dimension: 'form' }],
        instruction: `Encontre: ${g.name}`, prompt: { text: g.name, sub: g.translit ? `som: ${g.translit}` : undefined },
        hint: soundOf(g, ctx.modelId), explanation: g.note ?? soundOf(g, ctx.modelId),
      },
      { id: g.id, label: { text: show(g), script: true } },
      distractors(ctx, g, all, 3).map((d) => ({ id: d.id, label: { text: show(d as typeof g), script: true } })),
    ),
  )
}

/** Vê a palavra → escolhe o significado (e o inverso, alternando). */
export const meaningChoose: Generator = (ctx, p) => {
  const all = lexemes(ctx, p.itemIds)
  if (all.length === 0) return nameChoose(ctx, p)
  return take(ctx, all, p.count).map((l, i) => {
    const wrong = distractors(ctx, l, all, 3).filter((d) => d.kind === 'lexeme')
    const base = {
      generator: 'meaningChoose' as const, targets: [{ itemId: l.id, dimension: 'meaning' as const }],
      hint: l.translit, explanation: `${l.lemma} — ${l.glosses.join(', ')}${l.usageNote ? `\n${l.usageNote}` : ''}`,
    }
    if (i % 2 === 0)
      return choice(
        ctx, { ...base, instruction: 'O que esta palavra quer dizer?', prompt: scriptDisplay(l) },
        { id: l.id, label: { text: l.glosses[0] } },
        wrong.map((d) => ({ id: d.id, label: { text: d.kind === 'lexeme' ? d.glosses[0] : '' } })),
      )
    return choice(
      ctx, { ...base, instruction: 'Qual destas palavras quer dizer:', prompt: { text: l.glosses[0] } },
      { id: l.id, label: scriptDisplay(l, false) },
      wrong.map((d) => ({ id: d.id, label: scriptDisplay(d, false) })),
    )
  })
}

/** Ouve → escolhe a escrita. Sem áudio disponível, mostra a transliteração. */
export const listenChoose: Generator = (ctx, p) => {
  const all = pool(ctx, p)
  return take(ctx, all, p.count).map((item) => {
    const wrong = distractors(ctx, item, all, 3, true)
    // só vira exercício de escuta se houver som e opções que soem diferente
    const byEar = ctx.audioAvailable && hasOwnSound(item) && wrong.length >= 2
    const targets: SkillTarget[] = byEar
      ? [{ itemId: item.id, dimension: 'audio' }, { itemId: item.id, dimension: visualDim(item) }]
      : [{ itemId: item.id, dimension: visualDim(item) }]
    const name = isGlyph(item) ? item.name : item.translit
    return choice(
      ctx,
      {
        generator: 'listenChoose', targets, audioOnly: byEar,
        instruction: byEar ? 'Ouça e escolha o que foi dito.' : 'Qual destas se lê assim?',
        prompt: byEar ? { text: script(item), script: true, audio: audioOf(item) } : { text: name },
        explanation: `${script(item)} — ${name}`,
      },
      { id: item.id, label: { text: script(item), script: true } },
      (byEar ? wrong : distractors(ctx, item, all, 3)).map((d) => ({ id: d.id, label: { text: script(d), script: true } })),
    )
  })
}

/** Vê a letra → escolhe o som certo entre várias gravações. */
export const findSound: Generator = (ctx, p) => {
  if (!ctx.audioAvailable) return nameChoose(ctx, p)
  const all = glyphs(ctx, p.itemIds)
  return take(ctx, all, p.count).flatMap((g) => {
    const wrong = distractors(ctx, g, all, 2, true)
    if (!hasOwnSound(g) || wrong.length < 2) return nameChoose(ctx, { ...p, itemIds: [g.id], count: 1 })
    return [
      choice(
        ctx,
        {
          generator: 'findSound', targets: [{ itemId: g.id, dimension: 'audio' }],
          instruction: g.kind === 'letter' ? 'Ouça as opções. Qual é o nome desta letra?' : 'Ouça as opções. Qual é o som deste sinal?',
          prompt: { text: g.display, script: true }, explanation: `${g.name}: ${soundOf(g, ctx.modelId)}`,
        },
        { id: g.id, label: { text: '', audio: audioOf(g) } },
        wrong.map((d) => ({ id: d.id, label: { text: '', audio: audioOf(d) } })),
      ),
    ]
  })
}

/** Ouve uma entre várias palavras exibidas e identifica qual foi. */
export const listenIdentify: Generator = (ctx, p) =>
  listenChoose(ctx, p).map((e) => ({ ...e, generator: 'listenIdentify' as const, id: exId('listenIdentify'), instruction: ctx.audioAvailable ? 'Qual destas foi pronunciada?' : e.instruction }))

function assemble(
  ctx: GenCtx, p: GenParams, generator: 'orderLetters' | 'listenAssemble' | 'dictation', opts: { audioOnly: boolean; extra: number },
): AssembleExercise[] {
  const all = lexemes(ctx, p.itemIds).filter((l) => splitGraphemes(l.lemma).length >= 2)
  const alphabet = [...new Set(all.flatMap((l) => splitGraphemes(l.lemma)))]
  return take(ctx, all, p.count).map((l) => {
    const answer = splitGraphemes(l.lemma)
    const extra = ctx.rng.sample(alphabet.filter((g) => !answer.includes(g)), opts.extra)
    const audioOnly = opts.audioOnly && ctx.audioAvailable
    return {
      kind: 'assemble', id: exId(generator), generator, languageId: l.languageId,
      targets: [{ itemId: l.id, dimension: audioOnly ? 'audio' : 'reading' }],
      instruction: audioOnly ? 'Ouça e monte a palavra.' : 'Monte a palavra, letra por letra.',
      prompt: audioOnly ? { text: l.lemma, script: true, audio: audioOf(l) } : { text: l.glosses[0], sub: l.translit, audio: audioOf(l) },
      audioOnly, tiles: ctx.rng.shuffle([...answer, ...extra]), answer, script: true,
      dir: ctx.index.bundle.language.direction, joiner: '', hint: l.translit,
      explanation: `${l.lemma} — ${l.translit} — ${l.glosses[0]}`,
    }
  })
}

export const orderLetters: Generator = (ctx, p) => assemble(ctx, p, 'orderLetters', { audioOnly: false, extra: 0 })
export const listenAssemble: Generator = (ctx, p) => assemble(ctx, p, 'listenAssemble', { audioOnly: true, extra: 0 })
/** Ditado: ouvir e escrever, com letras a mais no teclado. */
export const dictation: Generator = (ctx, p) => assemble(ctx, p, 'dictation', { audioOnly: true, extra: 3 })

/** Leitura em voz alta, com autoavaliação depois de ouvir o modelo. */
export const readAloud: Generator = (ctx, p) =>
  take(ctx, lexemes(ctx, p.itemIds), p.count).map(
    (l): SelfRateExercise => ({
      kind: 'selfRate', id: exId('readAloud'), generator: 'readAloud', languageId: l.languageId,
      targets: [{ itemId: l.id, dimension: 'reading' }],
      instruction: 'Leia em voz alta. Depois confira.',
      prompt: { text: l.lemma, script: true },
      reveal: { translit: l.translit, gloss: l.glosses[0], audio: audioOf(l) },
    }),
  )

/** Jogo de pares. */
export const memory: Generator = (ctx, p): Exercise[] => {
  const all = take(ctx, pool(ctx, p).filter((i) => p.variant !== 'upper' || (isGlyph(i) && i.upper)), 4)
  if (all.length < 2) return []
  // embaralha as cartas até que nenhum par fique lado a lado
  const keys = all.flatMap((i) => [`${i.id}:a`, `${i.id}:b`])
  const pairOf = (k: string) => k.slice(0, -2)
  let order = ctx.rng.shuffle(keys)
  for (let tries = 0; tries < 50 && order.some((k, n) => n > 0 && pairOf(k) === pairOf(order[n - 1])); tries++) order = ctx.rng.shuffle(keys)
  const ex: MemoryExercise = {
    kind: 'memory', id: exId('memory'), generator: 'memory', languageId: ctx.index.bundle.language.id,
    targets: all.map((i) => ({ itemId: i.id, dimension: isGlyph(i) ? 'form' : 'meaning' })),
    instruction: 'Encontre os pares.', order,
    pairs: all.map((i) => ({
      id: i.id, itemId: i.id,
      a: { text: script(i), script: true, audio: audioOf(i) },
      b: isGlyph(i) ? (p.variant === 'upper' ? { text: i.upper!, script: true } : { text: i.name }) : { text: i.glosses[0] },
    })),
  }
  return [ex]
}
