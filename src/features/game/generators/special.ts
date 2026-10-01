/** Famílias de palavras, sentido em contexto e caça ao erro: a partir de dados curados. */
import { stripGreekDiacritics, stripNiqqud } from '../../../lib/unicode'
import type { SkillTarget } from '../../../types/content'
import type { TapWordExercise } from '../../../types/exercise'
import { choice, exId, lexemes, take, type Generator } from './core'

/** "Raiz detetive": ver a família e descobrir o que se repete. */
export const rootDetective: Generator = (ctx, p) => {
  const { rootFamilies, language } = ctx.index.bundle
  return take(ctx, rootFamilies, p.count ?? 1).map((fam) => {
    const members = lexemes(ctx, fam.memberIds)
    const fake = lexemes(ctx, fam.outsiderIds).map((l) =>
      language.id === 'hebrew' ? stripNiqqud(l.lemma).slice(0, 3) : `${stripGreekDiacritics(l.lemma).slice(0, 4)}-`,
    )
    const wrong = [...new Set([...rootFamilies.filter((f) => f.id !== fam.id).map((f) => f.root), ...fake])].filter((r) => r !== fam.root)
    return choice(
      ctx,
      {
        generator: 'rootDetective', targets: fam.memberIds.map((itemId): SkillTarget => ({ itemId, dimension: 'lexeme' })),
        instruction: 'O que se repete em todas estas palavras?',
        prompt: { text: members.map((m) => m.lemma).join('  ·  '), script: true, sub: members.map((m) => m.glosses[0]).join(' · ') },
        explanation: `${fam.root} (${fam.rootTranslit}) — campo: ${fam.field}.\n${fam.caution}`,
      },
      { id: fam.root, label: { text: fam.root, script: true } },
      ctx.rng.sample(wrong, 3).map((r) => ({ id: r, label: { text: r, script: true } })),
    )
  })
}

/** "Root hunt": entre várias palavras, tocar em todas as da família. */
export const rootHunt: Generator = (ctx, p) => {
  const { rootFamilies, language } = ctx.index.bundle
  return take(ctx, rootFamilies, p.count ?? 1).map((fam): TapWordExercise => {
    const members = lexemes(ctx, fam.memberIds)
    const all = ctx.rng.shuffle([...members, ...lexemes(ctx, fam.outsiderIds)])
    return {
      kind: 'tapWord', id: exId('rootHunt'), generator: 'rootHunt', languageId: language.id,
      targets: fam.memberIds.map((itemId) => ({ itemId, dimension: 'lexeme' })),
      instruction: `Família ${fam.root}`, question: `Toque em todas as palavras da família ${fam.root} e confirme.`,
      words: all.map((l) => l.lemma), correctIndexes: all.map((l, i) => (fam.memberIds.includes(l.id) ? i : -1)).filter((i) => i >= 0),
      mode: 'all', dir: language.direction,
      explanation: `${members.map((m) => `${m.lemma} (${m.glosses[0]})`).join(', ')}.\n${fam.caution}`,
    }
  })
}

/** "Detetive de contexto": a mesma palavra em frases diferentes. */
export const contextDetective: Generator = (ctx, p) => {
  const cases = ctx.index.bundle.contextCases
  return take(ctx, cases, p.count ?? 2).map((c) => {
    const lex = lexemes(ctx, [c.lexemeId])[0]
    const same = cases.filter((x) => x.lexemeId === c.lexemeId && x.sense !== c.sense)
    const other = ctx.rng.shuffle(cases.filter((x) => x.lexemeId !== c.lexemeId && x.sense !== c.sense))
    const wrong = [...new Map([...same, ...other].map((x) => [x.sense, x])).values()].slice(0, 3)
    return choice(
      ctx,
      {
        generator: 'contextDetective', targets: [{ itemId: c.lexemeId, dimension: 'meaning' }],
        instruction: `Nesta frase, ${c.surface} quer dizer:`,
        context: { text: c.verseText, script: true, sub: `${c.ref} — ${c.translation}` },
        prompt: { text: c.surface, script: true, sub: lex ? `forma de ${lex.lemma}` : undefined },
        explanation: `${c.ref}: ${c.sense}.\nA mesma palavra, outro contexto, outro sentido — é o contexto que decide.`,
      },
      { id: c.id, label: { text: c.sense } },
      wrong.map((x) => ({ id: x.id, label: { text: x.sense } })),
    )
  })
}

/** "Caça ao erro": uma das afirmações sobre a palavra está errada. */
export const errorHunt: Generator = (ctx, p) =>
  take(ctx, ctx.index.bundle.errorHunts, p.count ?? 1).map((c) => {
    const bad = c.claims.find((x) => x.wrong)!
    return {
      kind: 'choice' as const, id: exId('errorHunt'), generator: 'errorHunt' as const, languageId: ctx.index.bundle.language.id,
      targets: c.lexemeId ? [{ itemId: c.lexemeId, dimension: 'morphology' as const }] : [],
      instruction: 'Uma destas afirmações está errada. Qual?',
      prompt: { text: c.word, script: true, sub: c.ref },
      explanation: bad.why,
      options: ctx.rng.shuffle(c.claims.map((x, i) => ({ id: `${c.id}-${i}`, label: { text: x.text }, correct: x.wrong }))),
    }
  })
