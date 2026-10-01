/**
 * Renderização dos cinco tipos de exercício. Nenhuma palavra ou pergunta é
 * definida aqui: tudo vem do objeto `Exercise` produzido pelos geradores.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioButton, AudioPlayer } from '../../components/AudioPlayer'
import { Script } from '../../components/Script'
import type { LanguageId } from '../../types/content'
import type {
  AnswerResult, AssembleExercise, ChoiceExercise, Display, Exercise, MemoryExercise, SelfRateExercise, TapWordExercise,
} from '../../types/exercise'

type Done = (r: Omit<AnswerResult, 'ms' | 'hintUsed'>) => void

function Shown({ d, language, big = false }: { d: Display; language: LanguageId; big?: boolean }) {
  return (
    <span className="min-w-0">
      {d.script ? (
        <Script language={language} className={big ? 'text-6xl sm:text-7xl' : 'text-3xl'}>{d.text}</Script>
      ) : (
        <span className={big ? 'font-display text-3xl sm:text-4xl' : 'text-lg'}>{d.text}</span>
      )}
      {d.sub && <span className="block text-sm text-muted" dir="auto">{d.sub}</span>}
    </span>
  )
}

function Prompt({ ex }: { ex: ChoiceExercise | AssembleExercise }) {
  if (!ex.prompt) return null
  if (ex.audioOnly && ex.prompt.audio)
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="label">ouvir sem ver</p>
        <AudioPlayer audio={ex.prompt.audio} hidden />
      </div>
    )
  return (
    <div className="flex items-center justify-center gap-4 text-center">
      <Shown d={ex.prompt} language={ex.languageId} big />
      {ex.prompt.audio && <AudioButton audio={ex.prompt.audio} />}
    </div>
  )
}

function Context({ ex }: { ex: Exercise }) {
  if (!ex.context) return null
  return (
    <blockquote className="rounded-lg border border-line bg-surface p-4 text-center">
      <Script language={ex.languageId} as="p" className="text-3xl">
        {ex.context.highlight && ex.context.text.includes(ex.context.highlight)
          ? ex.context.text.split(ex.context.highlight).flatMap((part, i) =>
              i === 0 ? [part] : [<mark key={i} className="rounded bg-section-soft px-1 text-fg underline decoration-section decoration-2 underline-offset-8">{ex.context!.highlight}</mark>, part])
          : ex.context.text}
      </Script>
      {ex.context.sub && <p className="mt-1 text-sm text-muted">{ex.context.sub}</p>}
    </blockquote>
  )
}

const MARK = { correct: '✓', wrong: '✗' } as const

function Choice({ ex, answered, onDone }: { ex: ChoiceExercise; answered: boolean; onDone: Done }) {
  const [picked, setPicked] = useState<string | null>(null)
  const byEar = ex.options.some((o) => !o.label.text && o.label.audio)
  const pick = (id: string) => {
    if (answered) return
    setPicked(id)
    onDone({ correct: ex.options.find((o) => o.id === id)!.correct, chosen: id })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= ex.options.length) pick(ex.options[n - 1].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <Context ex={ex} />
      <Prompt ex={ex} />
      <ul className={`grid gap-3 ${ex.options.every((o) => o.label.script && !o.label.sub) ? 'grid-cols-2' : ''}`}>
        {ex.options.map((o, i) => {
          const state = !answered ? undefined : o.correct ? 'correct' : o.id === picked ? 'wrong' : 'dim'
          return (
            <li key={o.id} className="flex items-center gap-2">
              {byEar && o.label.audio && <AudioButton audio={o.label.audio} label={`Ouvir som ${i + 1}`} />}
              <button type="button" className="opt" data-state={state} disabled={answered} onClick={() => pick(o.id)}>
                <span className="label w-4 shrink-0" aria-hidden="true">{state === 'correct' || state === 'wrong' ? MARK[state] : i + 1}</span>
                {byEar ? <span>Som {i + 1}{answered && o.label.audio ? ` — ${o.label.audio.text}` : ''}</span> : <Shown d={o.label} language={ex.languageId} />}
                {state && state !== 'dim' && <span className="sr-only">{state === 'correct' ? ' (resposta certa)' : ' (sua resposta)'}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Assemble({ ex, answered, onDone }: { ex: AssembleExercise; answered: boolean; onDone: Done }) {
  // cada peça guarda o índice de origem, para letras repetidas não se confundirem
  const [placed, setPlaced] = useState<number[]>([])
  const full = placed.length === ex.answer.length
  const built = placed.map((i) => ex.tiles[i])
  const check = () => onDone({ correct: built.join('\u0001') === ex.answer.join('\u0001'), chosen: built.join(ex.joiner) })
  const Piece = ({ text }: { text: string }) => (ex.script ? <Script language={ex.languageId} className="text-3xl">{text}</Script> : <>{text}</>)

  return (
    <>
      <Prompt ex={ex} />
      <div
        dir={ex.dir} aria-label="Sua resposta" aria-live="polite"
        className="flex min-h-20 flex-wrap items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line p-3"
      >
        {placed.length === 0 && <span className="text-sm text-muted" dir="ltr">Toque nas peças abaixo, na ordem.</span>}
        {placed.map((ti, pos) => (
          <button
            key={`${ti}-${pos}`} type="button" disabled={answered} className="btn min-h-12 px-3"
            onClick={() => setPlaced((p) => p.filter((_, i) => i !== pos))} aria-label={`Retirar ${ex.tiles[ti]}`}
          >
            <Piece text={ex.tiles[ti]} />
          </button>
        ))}
      </div>
      <div dir={ex.dir} className="flex flex-wrap justify-center gap-2">
        {ex.tiles.map((t, i) => (
          <button
            key={i} type="button" className="btn min-h-12 min-w-12 px-3" disabled={answered || placed.includes(i) || full}
            style={{ visibility: placed.includes(i) ? 'hidden' : 'visible' }} onClick={() => setPlaced((p) => [...p, i])}
          >
            <Piece text={t} />
          </button>
        ))}
      </div>
      {!answered && (
        <button type="button" className="btn btn-primary w-full" disabled={!full} onClick={check}>Conferir</button>
      )}
    </>
  )
}

function Memory({ ex, answered, onDone }: { ex: MemoryExercise; answered: boolean; onDone: Done }) {
  const cards = useMemo(() => {
    const all = ex.pairs.flatMap((p) => [{ key: `${p.id}:a`, pair: p.id, d: p.a }, { key: `${p.id}:b`, pair: p.id, d: p.b }])
    // embaralhamento estável por exercício (não muda a cada renderização)
    return all.map((c, i) => ({ c, k: (i * 7919 + ex.id.length * 31) % all.length + i / 100 })).sort((x, y) => x.k - y.k).map((x) => x.c)
  }, [ex])
  const [open, setOpen] = useState<string[]>([])
  const [matched, setMatched] = useState<Set<string>>(new Set())
  const missed = useRef<Set<string>>(new Set())

  const flip = (key: string) => {
    if (answered || open.includes(key) || open.length === 2) return
    const next = [...open, key]
    setOpen(next)
    if (next.length < 2) return
    const [a, b] = next.map((k) => cards.find((c) => c.key === k)!)
    if (a.pair === b.pair) {
      const m = new Set(matched).add(a.pair)
      setMatched(m)
      setOpen([])
      if (m.size === ex.pairs.length) {
        const perItem = Object.fromEntries(ex.pairs.map((p) => [p.itemId, !missed.current.has(p.id)]))
        onDone({ correct: missed.current.size <= 1, perItem })
      }
    } else {
      missed.current.add(a.pair).add(b.pair)
      setTimeout(() => setOpen([]), 900)
    }
  }

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => {
        const done = matched.has(c.pair)
        const shown = done || open.includes(c.key)
        return (
          <li key={c.key}>
            <button
              type="button" onClick={() => flip(c.key)} disabled={done} aria-label={shown ? c.d.text : 'Carta virada'}
              className="opt min-h-24 justify-center text-center" data-state={done ? 'correct' : shown ? 'selected' : undefined}
            >
              {shown ? <Shown d={c.d} language={ex.languageId} /> : <span className="font-display text-3xl text-muted" aria-hidden="true">·</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function TapWord({ ex, answered, onDone }: { ex: TapWordExercise; answered: boolean; onDone: Done }) {
  const [sel, setSel] = useState<number[]>([])
  const tap = (i: number) => {
    if (answered) return
    if (ex.mode === 'any') {
      setSel([i])
      onDone({ correct: ex.correctIndexes.includes(i), chosen: ex.words[i] })
    } else setSel((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
  }
  const confirm = () => {
    const ok = sel.length === ex.correctIndexes.length && sel.every((i) => ex.correctIndexes.includes(i))
    onDone({ correct: ok, chosen: sel.map((i) => ex.words[i]).join(' ') })
  }
  return (
    <>
      <p className="text-center font-display text-2xl">{ex.question}</p>
      <div dir={ex.dir} className="flex flex-wrap justify-center gap-2">
        {ex.words.map((w, i) => {
          const good = ex.correctIndexes.includes(i)
          const state = answered ? (good ? 'correct' : sel.includes(i) ? 'wrong' : 'dim') : sel.includes(i) ? 'selected' : undefined
          return (
            <button key={i} type="button" className="opt w-auto justify-center" data-state={state} disabled={answered} onClick={() => tap(i)} aria-pressed={sel.includes(i)}>
              <Script language={ex.languageId} className="text-3xl">{w}</Script>
              {answered && (good || sel.includes(i)) && <span aria-hidden="true">{good ? MARK.correct : MARK.wrong}</span>}
            </button>
          )
        })}
      </div>
      {ex.mode === 'all' && !answered && (
        <button type="button" className="btn btn-primary w-full" disabled={sel.length === 0} onClick={confirm}>Conferir</button>
      )}
    </>
  )
}

const RATINGS: { value: 1 | 2 | 3 | 4; label: string }[] = [
  { value: 1, label: 'Ainda não consegui' },
  { value: 2, label: 'Com esforço' },
  { value: 3, label: 'Li bem' },
  { value: 4, label: 'Foi fácil' },
]

function SelfRate({ ex, answered, onDone }: { ex: SelfRateExercise; answered: boolean; onDone: Done }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <>
      <p className="text-center"><Script language={ex.languageId} className="text-7xl">{ex.prompt.text}</Script></p>
      {!revealed ? (
        <button type="button" className="btn btn-primary w-full" onClick={() => setRevealed(true)}>Já li — conferir</button>
      ) : (
        <div className="rise space-y-4">
          <div className="rounded-lg border border-line bg-surface p-4 text-center">
            <p className="text-2xl">{ex.reveal.translit}</p>
            {ex.reveal.gloss && <p className="text-muted">{ex.reveal.gloss}</p>}
            <div className="mt-3 flex justify-center"><AudioPlayer audio={ex.reveal.audio} /></div>
          </div>
          {!answered && (
            <fieldset>
              <legend className="label mb-2">como foi a sua leitura?</legend>
              <div className="grid grid-cols-2 gap-2">
                {RATINGS.map((r) => (
                  <button key={r.value} type="button" className="btn" onClick={() => onDone({ correct: r.value > 1, perceived: r.value })}>{r.label}</button>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      )}
    </>
  )
}

export function ExerciseView({ exercise, answered, onAnswer }: { exercise: Exercise; answered: boolean; onAnswer: (r: AnswerResult) => void }) {
  const started = useRef(Date.now())
  const [hint, setHint] = useState(!!exercise.retry)
  const done: Done = (r) => onAnswer({ ...r, ms: Date.now() - started.current, hintUsed: hint })

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-2xl">{exercise.instruction}</h2>
        {exercise.hint && !hint && !answered && (
          <button type="button" className="label shrink-0 underline underline-offset-4" onClick={() => setHint(true)}>pista</button>
        )}
      </div>
      {exercise.retry && <p className="text-sm text-muted">Vamos tentar de novo, com menos opções.</p>}
      {hint && exercise.hint && !answered && (
        <p className="rise rounded-lg border border-dashed border-section px-3 py-2 text-sm" role="note">
          <span className="label mr-2">pista</span><span dir="auto">{exercise.hint}</span>
        </p>
      )}
      {exercise.kind === 'choice' && <Choice ex={exercise} answered={answered} onDone={done} />}
      {exercise.kind === 'assemble' && <Assemble ex={exercise} answered={answered} onDone={done} />}
      {exercise.kind === 'memory' && <Memory ex={exercise} answered={answered} onDone={done} />}
      {exercise.kind === 'tapWord' && <TapWord ex={exercise} answered={answered} onDone={done} />}
      {exercise.kind === 'selfRate' && <SelfRate ex={exercise} answered={answered} onDone={done} />}
    </div>
  )
}
