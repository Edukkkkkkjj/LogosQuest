/** Exercícios gerados a partir dos textos bíblicos anotados (lema + morfologia por palavra). */
import type { OccurrenceRef } from '../../../data'
import { featureOptions, featureValuePt, morphLayers, summarizeMorph, FEATURE_LABEL } from '../../../lib/morph/describe'
import { uniqueBy } from '../../../lib/rng'
import type { Lexeme, SkillTarget } from '../../../types/content'
import type { AssembleExercise, Exercise, TapWordExercise } from '../../../types/exercise'
import { choice, exId, isLexeme, occurrencesIn, stemOf, take, verseText, type GenCtx, type GenParams, type Generator } from './core'

const lexOf = (ctx: GenCtx, id: string | null | undefined): Lexeme | undefined => {
  const i = id ? ctx.index.items.get(id) : undefined
  return isLexeme(i) ? i : undefined
}

/** Ocorrências cujo segmento principal pertence aos itens pedidos (ou todas, se nenhum foi pedido). */
function candidates(ctx: GenCtx, p: GenParams, filter: (o: OccurrenceRef) => boolean = () => true): OccurrenceRef[] {
  const wanted = new Set(p.itemIds)
  return occurrencesIn(ctx, p.textId).filter((o) => {
    const stem = stemOf(o)
    if (!stem?.lexemeId || !lexOf(ctx, stem.lexemeId)) return false
    return (wanted.size === 0 || wanted.has(stem.lexemeId)) && filter(o)
  })
}

const contextOf = (o: OccurrenceRef) => ({ text: verseText(o), script: true, sub: o.text.verses[o.verseIndex].ref, highlight: o.word.surface })

/** Texto com lacuna: escolher a palavra que falta no versículo. */
export const cloze: Generator = (ctx, p) => {
  const all = occurrencesIn(ctx, p.textId)
  const picked = take(ctx, uniqueBy(candidates(ctx, p), (o) => stemOf(o)!.lexemeId!), p.count)
  return picked.map((o) => {
    const verse = o.text.verses[o.verseIndex]
    const gapped = verse.words.map((w, i) => (i === o.wordIndex ? '_____' : w.surface)).join(' ')
    const stemId = stemOf(o)!.lexemeId
    const wrong = ctx.rng
      .sample(uniqueBy(all.filter((x) => stemOf(x)?.lexemeId !== stemId && x.word.plain !== o.word.plain), (x) => x.word.plain), 3)
      .map((x) => ({ id: stemOf(x)?.lexemeId ?? x.word.id, label: { text: x.word.plain, script: true } }))
    return choice(
      ctx,
      {
        generator: 'cloze', targets: [{ itemId: stemId!, dimension: 'meaning' }],
        instruction: 'Que palavra completa o versículo?',
        context: { text: gapped, script: true, sub: `${verse.ref} — ${verse.translation}` },
        hint: o.word.gloss, explanation: `${o.word.plain} — ${o.word.gloss ?? ''}`,
      },
      { id: stemId!, label: { text: o.word.plain, script: true } },
      wrong,
    )
  })
}

/** Frase quebra-cabeça: montar um versículo (ou seu começo) na ordem certa. */
export const sentencePuzzle: Generator = (ctx, p) => {
  const texts = ctx.index.bundle.texts.filter((t) => !p.textId || t.id === p.textId)
  const verses = texts.flatMap((t) => t.verses.map((v) => ({ t, v })))
  return take(ctx, verses, p.count ?? 1).map(({ v }): AssembleExercise => {
    const words = v.words.slice(0, 7)
    const answer = words.map((w) => w.surface)
    const partial = words.length < v.words.length
    const targets: SkillTarget[] = uniqueBy(
      words.map((w) => w.segments.find((s) => s.role === 'stem')?.lexemeId).filter((x): x is string => !!x), (x) => x,
    ).slice(0, 3).map((itemId) => ({ itemId, dimension: 'reading' }))
    return {
      kind: 'assemble', id: exId('sentencePuzzle'), generator: 'sentencePuzzle', languageId: ctx.index.bundle.language.id, targets,
      instruction: partial ? 'Monte o começo do versículo.' : 'Monte o versículo.',
      prompt: { text: v.translation, sub: v.ref },
      tiles: ctx.rng.shuffle(answer), answer, script: true, dir: ctx.index.bundle.language.direction, joiner: ' ',
      hint: words.map((w) => w.gloss).join(' · '), explanation: answer.join(' '),
    }
  })
}

/** "Quem sou eu?": de uma forma flexionada, chegar ao lema e à análise. */
export const whoAmI: Generator = (ctx, p) => {
  const all = candidates(ctx, p)
  const picked = take(ctx, uniqueBy(all, (o) => o.word.plain), p.count ?? 3)
  const out: Exercise[] = []
  for (const o of picked) {
    const stem = stemOf(o)!
    const lex = lexOf(ctx, stem.lexemeId)!
    const different = ctx.index.bundle.lexemes.filter((l) => l.id !== lex.id && l.lemma !== lex.lemma)
    const samePos = different.filter((l) => l.pos === lex.pos)
    const others = ctx.rng.sample(samePos.length >= 3 ? samePos : different, 3)
    out.push(
      choice(
        ctx,
        {
          generator: 'whoAmI', targets: [{ itemId: lex.id, dimension: 'form' }],
          instruction: 'De que palavra do dicionário esta forma vem?',
          prompt: { text: stem.text, script: true }, context: contextOf(o), hint: o.word.gloss,
          explanation: `${stem.text} é uma forma de ${lex.lemma} (${lex.glosses[0]}).`,
        },
        { id: lex.id, label: { text: lex.lemma, script: true, sub: lex.glosses[0] } },
        others.map((l) => ({ id: l.id, label: { text: l.lemma, script: true, sub: l.glosses[0] } })),
      ),
    )
    const summary = summarizeMorph(stem.morph)
    const wrong = uniqueBy(
      ctx.rng.shuffle(all.filter((x) => stemOf(x)!.morph.pos === stem.morph.pos)).map((x) => summarizeMorph(stemOf(x)!.morph)).filter((s) => s !== summary),
      (s) => s,
    ).slice(0, 3)
    if (wrong.length >= 2)
      out.push(
        choice(
          ctx,
          {
            generator: 'whoAmI', targets: [{ itemId: lex.id, dimension: 'morphology' }],
            instruction: 'Qual é a análise desta forma?',
            prompt: { text: stem.text, script: true, sub: `${lex.lemma} — ${lex.glosses[0]}` }, context: contextOf(o),
            explanation: `${stem.text}: ${summary}.`,
          },
          { id: summary, label: { text: summary } },
          wrong.map((s) => ({ id: s, label: { text: s } })),
        ),
      )
  }
  return out
}

/** "Morph boss": desmontar uma forma, uma característica de cada vez. */
export const morphBoss: Generator = (ctx, p) => {
  const rich = (o: OccurrenceRef) => morphLayers(stemOf(o)!.morph).length >= 4
  const picked = take(ctx, uniqueBy(candidates(ctx, p, rich), (o) => o.word.plain), p.count ?? 1)
  const out: Exercise[] = []
  for (const o of picked) {
    const stem = stemOf(o)!
    const lex = lexOf(ctx, stem.lexemeId)!
    for (const layer of morphLayers(stem.morph)) {
      if (layer.feature === 'pos') continue
      const raw = stem.morph[layer.feature]!
      const wrong = ctx.rng.sample(featureOptions(layer.feature).filter((v) => v !== raw), 3)
      out.push(
        choice(
          ctx,
          {
            generator: 'morphBoss', targets: [{ itemId: lex.id, dimension: 'morphology' }],
            instruction: `${FEATURE_LABEL[layer.feature]}?`,
            prompt: { text: stem.text, script: true, sub: `${lex.lemma} — ${lex.glosses[0]}` }, context: contextOf(o),
            explanation: `${stem.text}: ${summarizeMorph(stem.morph)}.`,
          },
          { id: raw, label: { text: featureValuePt(layer.feature, raw) } },
          wrong.map((v) => ({ id: v, label: { text: featureValuePt(layer.feature, v) } })),
        ),
      )
    }
  }
  return out
}

/** "Forma correta": dada a análise, escolher a forma entre as do mesmo lexema. */
export const correctForm: Generator = (ctx, p) => {
  const out: Exercise[] = []
  for (const id of p.itemIds) {
    const lex = lexOf(ctx, id)
    if (!lex) continue
    // forma → conjunto de análises (uma mesma grafia pode ter mais de uma análise)
    const forms = new Map<string, Set<string>>()
    for (const o of ctx.index.byLexeme.get(id) ?? []) {
      const stem = stemOf(o)
      if (stem?.lexemeId !== id) continue
      const key = stem.text.toLowerCase()
      forms.set(key, (forms.get(key) ?? new Set()).add(summarizeMorph(stem.morph)))
    }
    const unambiguous = [...forms].filter(([, s]) => s.size === 1)
    for (const [form, set] of take(ctx, unambiguous, p.count ?? 3)) {
      const summary = [...set][0]
      const wrong = ctx.rng.sample([...forms].filter(([f, s]) => f !== form && !s.has(summary)), 3)
      if (wrong.length < 2) continue
      out.push(
        choice(
          ctx,
          {
            generator: 'correctForm', targets: [{ itemId: id, dimension: 'morphology' }],
            instruction: `Qual forma de ${lex.lemma} corresponde a esta análise?`,
            prompt: { text: summary.replace(/^[^·]+· /, '') }, explanation: `${form}: ${summary}.`,
          },
          { id: form, label: { text: form, script: true } },
          wrong.map(([f]) => ({ id: f, label: { text: f, script: true } })),
        ),
      )
    }
  }
  return out
}

/** Tradução guiada: primeiro achar o verbo e as marcas, só depois o sentido. */
export const guidedTranslation: Generator = (ctx, p) => {
  const lang = ctx.index.bundle.language
  const texts = ctx.index.bundle.texts.filter((t) => !p.textId || t.id === p.textId)
  const verses = texts.flatMap((t) => t.verses.filter((v) => v.words.length <= 14).map((v) => ({ t, v })))
  const allVerses = ctx.index.bundle.texts.flatMap((t) => t.verses)
  const out: Exercise[] = []
  for (const { v } of take(ctx, verses, p.count ?? 1)) {
    const words = v.words.map((w) => w.surface)
    const where = (test: (w: (typeof v.words)[number]) => boolean) => v.words.map((w, i) => (test(w) ? i : -1)).filter((i) => i >= 0)
    const tap = (question: string, correctIndexes: number[], targets: SkillTarget[], explanation: string): TapWordExercise => ({
      kind: 'tapWord', id: exId('guidedTranslation'), generator: 'guidedTranslation', languageId: lang.id, targets,
      instruction: v.ref, question, words, correctIndexes, mode: 'any', dir: lang.direction, explanation,
    })
    const verbs = where((w) => w.segments.some((s) => s.morph.pos === 'verb'))
    const verbTargets = uniqueBy(
      verbs.map((i) => v.words[i].segments.find((s) => s.morph.pos === 'verb')!.lexemeId!).filter(Boolean), (x) => x,
    ).map((itemId): SkillTarget => ({ itemId, dimension: 'morphology' }))
    if (verbs.length && verbs.length < words.length)
      out.push(tap('Toque em um verbo.', verbs, verbTargets, `Verbo(s): ${verbs.map((i) => v.words[i].plain).join(', ')}.`))

    if (lang.id === 'greek') {
      const nom = where((w) => w.segments[0].morph.case === 'nominative' && ['noun', 'pronoun'].includes(w.segments[0].morph.pos))
      if (nom.length && nom.length < words.length)
        out.push(tap('Toque em uma palavra no nominativo (o caso do sujeito).', nom, [], `Nominativo: ${nom.map((i) => v.words[i].plain).join(', ')}.`))
    } else {
      const pre = where((w) => w.segments.some((s) => s.role === 'prefix'))
      if (pre.length && pre.length < words.length)
        out.push(tap('Toque em uma palavra que tem um prefixo colado (e, o/a, em, para).', pre, [], `Com prefixo: ${pre.map((i) => v.words[i].plain).join(', ')}.`))
    }

    const wrong = ctx.rng.sample(allVerses.filter((x) => x.translation !== v.translation), 2)
    out.push(
      choice(
        ctx,
        {
          generator: 'guidedTranslation',
          targets: uniqueBy(v.words.map((w) => w.segments.find((s) => s.role === 'stem')?.lexemeId).filter((x): x is string => !!x), (x) => x)
            .slice(0, 3).map((itemId) => ({ itemId, dimension: 'meaning' })),
          instruction: 'Agora monte o sentido: qual tradução corresponde?',
          context: { text: words.join(' ').replace(/־ /g, '־'), script: true, sub: v.ref },
          hint: v.words.map((w) => w.gloss).join(' · '), explanation: v.translation,
        },
        { id: v.osis, label: { text: v.translation } },
        wrong.map((x) => ({ id: x.osis, label: { text: x.translation } })),
      ),
    )
  }
  return out
}
