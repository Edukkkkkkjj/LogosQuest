/**
 * Player de uma sessão (lição, revisão ou prática): percorre a fila de telas,
 * grava cada resposta na hora e aplica as regras de antifrustração.
 */
import { useEffect, useRef, useState } from 'react'
import { ItemCard, ProgressBar } from '../../components/Cards'
import { Script } from '../../components/Script'
import type { ContentIndex } from '../../data'
import { TextReader } from '../reading/TextReader'
import { repo } from '../progress/repo'
import type { AnswerResult, Exercise } from '../../types/exercise'
import { ExerciseView } from './ExerciseView'
import { easierRetry, type Screen } from './session'

interface Entry {
  screen: Screen
  /** falso para telas inseridas durante a sessão (segunda chance, reapresentação) */
  base: boolean
}

export interface SessionResult {
  correct: number
  total: number
  xp: number
}

const NOTE_LABEL = { observe: 'observe', rule: 'a regra', why: 'por que isso importa' } as const

/** Onde o exercício errado volta: algumas telas adiante, para dar tempo de esquecer um pouco. */
const RETRY_GAP = 3

export function SessionPlayer({
  screens, index, lessonId, startAt = 0, onStep, onFinish, onExit,
}: {
  screens: Screen[]
  index: ContentIndex
  lessonId?: string
  startAt?: number
  /** chamado a cada tela-base concluída (para salvar o ponto de retomada) */
  onStep?: (baseDone: number, result: SessionResult) => void
  onFinish: (result: SessionResult) => void
  onExit: () => void
}) {
  const language = index.bundle.language.id
  const [queue, setQueue] = useState<Entry[]>(() => screens.slice(startAt).map((screen) => ({ screen, base: true })))
  const [pos, setPos] = useState(0)
  const [answer, setAnswer] = useState<AnswerResult | null>(null)
  const result = useRef<SessionResult>({ correct: 0, total: 0, xp: 0 })
  const baseDone = useRef(startAt)
  const missed = useRef(new Map<string, number>())
  const continueRef = useRef<HTMLButtonElement>(null)
  const entry = queue[pos]

  // ver um cartão de apresentação conta como exposição ao item
  useEffect(() => {
    if (entry?.screen.type !== 'teach') return
    const item = index.items.get(entry.screen.itemId)
    if (item) void repo.recordExposure([item.id], language, item.kind === 'lexeme' ? 'meaning' : 'form')
  }, [entry, index, language])

  useEffect(() => {
    if (answer) continueRef.current?.focus()
  }, [answer])

  if (!entry) return null

  const advance = () => {
    if (entry.base) {
      baseDone.current++
      onStep?.(baseDone.current, result.current)
    }
    setAnswer(null)
    if (pos + 1 >= queue.length) onFinish(result.current)
    else setPos(pos + 1)
    window.scrollTo({ top: 0 })
  }

  const onAnswer = (ex: Exercise, r: AnswerResult) => {
    setAnswer(r)
    result.current.total++
    if (r.correct) result.current.correct++
    if (ex.kind === 'memory' && r.perItem) {
      // no jogo de pares cada item recebe o seu próprio resultado
      const share = Math.round(r.ms / ex.pairs.length)
      for (const t of ex.targets)
        void repo.recordTargets([t], ex, { correct: r.perItem[t.itemId] ?? true, ms: share, hintUsed: false }, lessonId).then((xp) => (result.current.xp += xp))
    } else void repo.recordAnswer(ex, r, lessonId).then((xp) => (result.current.xp += xp))

    if (r.correct || ex.retry) return
    // Antifrustração: o erro volta adiante, mais fácil. No segundo erro do mesmo
    // item, ele é reapresentado antes da nova tentativa.
    const itemId = ex.targets[0]?.itemId
    const times = itemId ? (missed.current.get(itemId) ?? 0) + 1 : 1
    if (itemId) missed.current.set(itemId, times)
    const extra: Entry[] = []
    if (times >= 2 && itemId && index.items.has(itemId)) extra.push({ screen: { type: 'teach', itemId }, base: false })
    extra.push({ screen: { type: 'exercise', exercise: easierRetry(ex, r.chosen) }, base: false })
    setQueue((q) => {
      const at = Math.min(q.length, pos + 1 + RETRY_GAP)
      return [...q.slice(0, at), ...extra, ...q.slice(at)]
    })
  }

  const { screen } = entry
  const total = queue.length

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4 pb-32">
      <div className="mb-6 flex items-center gap-3">
        <button type="button" className="label py-3" onClick={onExit} aria-label="Sair da sessão (o progresso fica salvo)">✕ sair</button>
        <ProgressBar value={pos / total} label="Andamento da sessão" />
        <span className="label tabular-nums">{pos + 1}/{total}</span>
      </div>

      <div key={pos} className="rise">
        {screen.type === 'note' && (
          <article className={screen.style === 'rule' ? 'rounded-xl border-2 border-section bg-surface p-6' : 'rounded-xl border border-line bg-surface p-6'}>
            <p className="label text-section">{NOTE_LABEL[screen.style]}</p>
            <h2 className="mt-1 text-3xl">{screen.title}</h2>
            {screen.example && (
              <p className="my-4 text-center"><Script language={language} className="text-5xl">{screen.example}</Script></p>
            )}
            {screen.body.split('\n\n').map((p, i) => <p key={i} className="mt-3 text-lg" dir="auto">{p}</p>)}
          </article>
        )}

        {screen.type === 'teach' && index.items.get(screen.itemId) && <ItemCard item={index.items.get(screen.itemId)!} />}

        {screen.type === 'exercise' && (
          <ExerciseView exercise={screen.exercise} answered={!!answer} onAnswer={(r) => onAnswer(screen.exercise, r)} />
        )}

        {screen.type === 'read' && (() => {
          const text = index.bundle.texts.find((t) => t.id === screen.textId)
          if (!text) return null
          return (
            <div>
              <p className="label text-section">agora, o texto inteiro</p>
              <h2 className="mt-1 mb-1 text-3xl">{text.title}</h2>
              <p className="mb-4 text-muted">{text.ref} — toque em qualquer palavra para ver a ficha dela.</p>
              <TextReader
                text={text} index={index}
                onFinish={(withoutTranslit) => {
                  void repo.recordTextRead(text.id, language, withoutTranslit)
                  advance()
                }}
              />
            </div>
          )
        })()}
      </div>

      {/* barra de retorno: forma + símbolo + texto, nunca só cor */}
      {screen.type === 'exercise' && answer && (
        <div role="status" className={`fixed inset-x-0 bottom-0 z-30 border-t-2 bg-surface px-4 py-4 shadow-[0_-8px_30px_rgb(0_0_0/0.18)] ${answer.correct ? 'border-ok' : 'border-bad'}`}>
          <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className={`font-display text-xl ${answer.correct ? 'text-ok' : 'text-bad'}`}>
                {answer.correct ? '✓ Isso mesmo' : '✗ Ainda não'}
              </p>
              {screen.exercise.explanation && (
                <p className="mt-1 max-h-32 overflow-y-auto text-sm whitespace-pre-line" dir="auto">{screen.exercise.explanation}</p>
              )}
              {!answer.correct && !screen.exercise.retry && <p className="mt-1 text-sm text-muted">Sem problema: isto volta daqui a pouco, com menos opções.</p>}
            </div>
            <button ref={continueRef} type="button" className="btn btn-primary shrink-0 px-8" onClick={advance}>Continuar</button>
          </div>
        </div>
      )}

      {screen.type !== 'exercise' && screen.type !== 'read' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 px-4 py-4 backdrop-blur">
          <div className="mx-auto max-w-2xl">
            <button type="button" className="btn btn-primary w-full" onClick={advance} autoFocus>Continuar</button>
          </div>
        </div>
      )}
    </div>
  )
}
