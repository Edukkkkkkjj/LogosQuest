/**
 * Validação de conteúdo. Pura (sem acesso a disco): o script
 * `npm run validate-content` acrescenta a checagem dos arquivos de áudio.
 */
import { buildLessonScreens } from '../features/game/session'
import { GENERATORS } from '../features/game/generators'
import { findUnicodeIssues } from '../lib/unicode'
import type { AudioManifest, ContentBundle, SourceEntry } from '../types/content'
import type { Exercise } from '../types/exercise'
import { indexOf } from './index'

export interface Problem {
  level: 'error' | 'warning'
  where: string
  message: string
}

export function checkExercise(ex: Exercise): string[] {
  const out: string[] = []
  if (!ex.instruction) out.push('sem instrução')
  switch (ex.kind) {
    case 'choice': {
      if (ex.options.length < 2) out.push(`só ${ex.options.length} opção(ões)`)
      if (ex.options.filter((o) => o.correct).length !== 1) out.push('precisa ter exatamente uma opção correta')
      const labels = ex.options.map((o) => o.label.text || o.label.audio?.text || '')
      if (new Set(labels).size !== labels.length) out.push(`opções repetidas: ${labels.join(' | ')}`)
      if (labels.some((l) => !l)) out.push('opção vazia')
      break
    }
    case 'assemble': {
      const tiles = [...ex.tiles]
      for (const a of ex.answer) {
        const i = tiles.indexOf(a)
        if (i < 0) out.push(`peça ausente: ${a}`)
        else tiles.splice(i, 1)
      }
      if (ex.answer.length < 2) out.push('resposta com menos de 2 peças')
      break
    }
    case 'memory':
      if (ex.pairs.length < 2) out.push('menos de 2 pares')
      if (ex.order.length !== ex.pairs.length * 2 || new Set(ex.order).size !== ex.order.length) out.push('ordem das cartas incompleta')
      if (ex.order.every((k, n) => n % 2 === 0 || k.slice(0, -2) === ex.order[n - 1].slice(0, -2))) out.push('pares não embaralhados')
      break
    case 'tapWord':
      if (!ex.correctIndexes.length) out.push('nenhuma palavra correta')
      if (ex.correctIndexes.some((i) => i < 0 || i >= ex.words.length)) out.push('índice fora do versículo')
      break
    case 'selfRate':
      if (!ex.reveal.translit) out.push('sem transliteração para conferir')
      break
  }
  return out
}

export function validateBundle(bundle: ContentBundle, sources: SourceEntry[], manifest: AudioManifest): Problem[] {
  const problems: Problem[] = []
  const err = (where: string, message: string) => problems.push({ level: 'error', where, message })
  const warn = (where: string, message: string) => problems.push({ level: 'warning', where, message })
  const lang = bundle.language.id
  const index = indexOf(bundle)
  const has = (id: string) => index.items.has(id)
  const unicode = (where: string, s: string) => {
    for (const i of findUnicodeIssues(s, lang)) err(where, `Unicode: ${i.detail} («${s}»)`)
  }
  const models = new Set(bundle.language.pronunciationModels.map((m) => m.id))
  const sourceIds = new Set(sources.map((s) => s.id))
  const secretIds = new Set(bundle.secrets.map((s) => s.id))
  const windowIds = new Set(bundle.windows.map((w) => w.id))
  const unitIds = new Set(bundle.course.levels.flatMap((l) => l.units.map((u) => u.id)))

  if (!models.has(bundle.language.defaultPronunciationId)) err(lang, 'modelo de pronúncia padrão não cadastrado')

  for (const g of bundle.glyphs) {
    for (const f of ['display', 'char', 'name', 'speak'] as const) if (!g[f]) err(g.id, `campo obrigatório ausente: ${f}`)
    unicode(g.id, g.display)
    if (!g.sound[bundle.language.defaultPronunciationId]) err(g.id, 'sem descrição de som para o modelo padrão')
    for (const m of Object.keys(g.sound)) if (!models.has(m)) err(g.id, `modelo de pronúncia desconhecido: ${m}`)
    for (const c of g.confusables) if (!has(c)) err(g.id, `confundível inexistente: ${c}`)
  }

  for (const l of bundle.lexemes) {
    if (!l.lemma) err(l.id, 'palavra sem lema')
    else unicode(l.id, l.lemma)
    if (!l.glosses.length) err(l.id, 'lexema sem glosa')
    if (!l.translit) err(l.id, 'lexema sem transliteração')
    for (const w of l.windowIds ?? []) if (!windowIds.has(w)) err(l.id, `janela cultural inexistente: ${w}`)
  }

  for (const t of bundle.texts) {
    if (!t.ref) err(t.id, 'texto sem referência')
    if (!t.title) err(t.id, 'texto sem título')
    if (!t.verses.length) err(t.id, 'texto sem versículos')
    for (const s of t.sourceIds) if (!sourceIds.has(s)) err(t.id, `fonte não cadastrada: ${s}`)
    for (const s of t.secretIds) if (!secretIds.has(s)) err(t.id, `segredo inexistente: ${s}`)
    for (const w of t.windowIds) if (!windowIds.has(w)) err(t.id, `janela cultural inexistente: ${w}`)
    if (t.unlockAfterUnitId && !unitIds.has(t.unlockAfterUnitId)) err(t.id, `unidade inexistente: ${t.unlockAfterUnitId}`)
    for (const n of t.notes) if (!t.verses.some((v) => v.osis === n.verse)) err(t.id, `nota aponta para versículo fora do texto: ${n.verse}`)
    for (const v of t.verses) {
      if (!v.ref) err(`${t.id} ${v.osis}`, 'versículo sem referência')
      if (!v.translation) err(`${t.id} ${v.osis}`, 'versículo sem tradução')
      for (const w of v.words) {
        const where = `${t.id} ${v.osis} «${w.surface}»`
        unicode(where, w.plain)
        if (!w.gloss) err(where, 'ocorrência sem glosa contextual')
        if (!w.segments.length) err(where, 'ocorrência sem morfologia')
        if (!w.segments.some((s) => s.role === 'stem')) err(where, 'ocorrência sem segmento principal')
        for (const s of w.segments) {
          if (s.morph.pos === 'unknown') err(where, `morfologia não reconhecida: ${s.morph.code}`)
          if (s.role !== 'suffix' && !s.lexemeId) err(where, 'palavra sem lema')
          if (s.lexemeId && !has(s.lexemeId)) err(where, `lema inexistente: ${s.lexemeId}`)
        }
      }
    }
  }

  for (const s of bundle.secrets) {
    if (s.textId && !bundle.texts.some((t) => t.id === s.textId)) err(s.id, `texto inexistente: ${s.textId}`)
    if (!s.explanation || !s.question) err(s.id, 'segredo sem pergunta ou explicação')
  }
  for (const f of bundle.rootFamilies) {
    for (const id of [...f.memberIds, ...f.outsiderIds]) if (!has(id)) err(f.id, `lexema inexistente: ${id}`)
    if (f.memberIds.length < 2) err(f.id, 'família com menos de 2 membros')
  }
  for (const c of bundle.contextCases) {
    if (!has(c.lexemeId)) err(c.id, `lexema inexistente: ${c.lexemeId}`)
    if (!c.translation || !c.sense) err(c.id, 'contexto sem tradução ou sentido')
  }
  for (const e of bundle.errorHunts) {
    if (e.claims.filter((c) => c.wrong).length !== 1) err(e.id, 'precisa ter exatamente uma afirmação errada')
    if (e.claims.some((c) => c.wrong && !c.why)) err(e.id, 'afirmação errada sem explicação')
    if (e.lexemeId && !has(e.lexemeId)) err(e.id, `lexema inexistente: ${e.lexemeId}`)
  }

  const skillIds = new Set(bundle.skills.map((s) => s.id))
  for (const s of bundle.skills) for (const t of s.targets) if (!has(t.itemId)) err(s.id, `habilidade aponta para item inexistente: ${t.itemId}`)

  for (const level of bundle.course.levels)
    for (const unit of level.units) {
      for (const id of unit.skillIds) if (!skillIds.has(id)) err(unit.id, `habilidade não cadastrada: ${id}`)
      const taught = new Set(
        bundle.lessons.filter((l) => l.unitId === unit.id).flatMap((l) => [...l.newItems, ...l.reviewItems]),
      )
      for (const s of bundle.skills.filter((x) => unit.skillIds.includes(x.id)))
        for (const t of s.targets) if (!taught.has(t.itemId)) warn(unit.id, `item da habilidade ${s.id} não aparece em nenhuma lição da unidade: ${t.itemId}`)
    }

  for (const lesson of bundle.lessons) {
    for (const id of [...lesson.newItems, ...lesson.reviewItems]) if (!has(id)) err(lesson.id, `lição aponta para item inexistente: ${id}`)
    for (const step of lesson.steps) {
      if (step.type === 'teach') for (const id of step.itemIds) if (!has(id)) err(lesson.id, `apresentação de item inexistente: ${id}`)
      if (step.type === 'read' && !bundle.texts.some((t) => t.id === step.textId)) err(lesson.id, `texto inexistente: ${step.textId}`)
      if (step.type === 'exercise') {
        if (!(step.generator in GENERATORS)) err(lesson.id, `gerador desconhecido: ${step.generator}`)
        for (const id of step.itemIds ?? []) if (!has(id)) err(lesson.id, `exercício apontando para item inexistente: ${id}`)
        if (step.textId && !bundle.texts.some((t) => t.id === step.textId)) err(lesson.id, `texto inexistente: ${step.textId}`)
      }
    }
    // ensaio: a lição precisa gerar exercícios válidos com e sem áudio
    for (const audioAvailable of [true, false])
      for (const seed of [1, 2, 3]) {
        const screens = buildLessonScreens(lesson, index, { seed, audioAvailable, modelId: bundle.language.defaultPronunciationId })
        const exercises = screens.flatMap((s) => (s.type === 'exercise' ? [s.exercise] : []))
        if (exercises.length < 3) err(lesson.id, `gera só ${exercises.length} exercício(s) (áudio=${audioAvailable})`)
        for (const ex of exercises) {
          for (const m of checkExercise(ex)) err(lesson.id, `${ex.generator}: ${m}`)
          for (const t of ex.targets) if (!has(t.itemId)) err(lesson.id, `${ex.generator}: alvo inexistente ${t.itemId}`)
        }
      }
  }

  for (const a of manifest.assets.filter((x) => x.languageId === lang)) {
    if (!models.has(a.modelId)) err(`audio ${a.key}`, `modelo de pronúncia desconhecido: ${a.modelId}`)
    if (!manifest.sources.some((s) => s.id === a.sourceId)) err(`audio ${a.key}`, `fonte de áudio não cadastrada: ${a.sourceId}`)
    if (!a.key.startsWith('text:') && !has(a.key)) err(`audio ${a.key}`, 'áudio para item inexistente')
  }

  return problems
}
