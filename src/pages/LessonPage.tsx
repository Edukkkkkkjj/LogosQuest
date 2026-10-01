import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useCourse } from '../app/LanguageLayout'
import { useAudio, useProgress, usePronunciation } from '../app/providers'
import { Cine } from '../components/Cine'
import { checkAchievements, Completion } from '../features/game/Completion'
import { SessionPlayer, type SessionResult } from '../features/game/SessionPlayer'
import { buildLessonScreens } from '../features/game/session'
import { repo } from '../features/progress/repo'
import { courseStatus } from '../features/progress/unlock'
import type { AchievementDef } from '../types/content'
import type { SessionState } from '../types/progress'

type Phase = 'loading' | 'intro' | 'playing' | 'done'

export default function LessonPage() {
  const { lessonId } = useParams()
  const { bundle, index } = useCourse()
  const progress = useProgress()
  const navigate = useNavigate()
  const { engine } = useAudio()
  const lang = bundle.language.id
  const model = usePronunciation(lang)
  const lesson = bundle.lessons.find((l) => l.id === lessonId)
  const sessionId = `${lang}:${lessonId}`

  const [phase, setPhase] = useState<Phase>('loading')
  const [session, setSession] = useState<SessionState | null>(null)
  const [result, setResult] = useState<SessionResult>({ correct: 0, total: 0, xp: 0 })
  const [earned, setEarned] = useState<AchievementDef[]>([])
  // decidido uma vez por sessão: mudar no meio trocaria os exercícios de lugar
  const [audioAvailable] = useState(() => engine.available(model))

  useEffect(() => {
    let alive = true
    void repo.loadSession(sessionId).then((s) => {
      if (!alive) return
      const fresh: SessionState = {
        id: sessionId, languageId: lang, lessonId: lessonId ?? '', seed: Math.floor(Math.random() * 1e9),
        stepIndex: 0, results: { correct: 0, total: 0 }, startedAt: Date.now(), updatedAt: Date.now(),
      }
      // retomada: continua exatamente da tela em que parou
      setSession(s ?? fresh)
      if (s && s.stepIndex > 0) {
        setResult({ ...s.results, xp: 0 })
        setPhase('playing')
      } else setPhase('intro')
    })
    return () => {
      alive = false
    }
  }, [sessionId, lang, lessonId])

  const screens = useMemo(
    () => (lesson && session ? buildLessonScreens(lesson, index, { seed: session.seed, modelId: model.id, audioAvailable }) : []),
    [lesson, session, index, model.id, audioAvailable],
  )

  const units = courseStatus(bundle, progress.mastery, progress.lessons)
  const unit = units.find((u) => u.unit.id === lesson?.unitId)
  const status = unit?.lessons.find((l) => l.lesson.id === lessonId)

  if (!lesson || !unit) return <Navigate to={`/${lang}`} replace />
  if (phase === 'loading' || !session) return <p className="p-8 text-center text-muted" role="status">Preparando a lição…</p>
  if (!status?.unlocked && phase === 'intro')
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl">Esta lição ainda está fechada</h1>
        <p className="mt-3 text-muted">Ela abre quando as lições anteriores forem concluídas e a unidade anterior atingir o domínio mínimo.</p>
        <Link to={`/${lang}`} className="btn btn-primary mt-6">Voltar ao mapa</Link>
      </div>
    )

  if (phase === 'intro') {
    const body = (
      <>
        <p className="label">{unit.unit.title}</p>
        <h1 className="mt-1 text-4xl">{lesson.title}</h1>
        <p className="mt-3 text-xl">{lesson.goal}</p>
      </>
    )
    return (
      <>
        {lesson.kind === 'boss' ? (
          // Sistema I: a passagem-chefe se apresenta como uma inscrição a decifrar
          <Cine mediaId={lang === 'hebrew' ? 'he-boss' : 'gr-boss'} minHeight="min-h-[32rem]" imageHeight="72%">
            <div className="gridpanel mx-auto max-w-xl text-center">{body}</div>
          </Cine>
        ) : (
          <div className="mx-auto max-w-xl px-4 pt-12 text-center">{body}</div>
        )}
        <div className="mx-auto max-w-xl px-4 py-6 text-center">
          <p className="text-muted"><span className="label mr-2">por que isso importa</span>{unit.unit.why}</p>
          {!audioAvailable && (
            <p className="mt-4 rounded-lg border border-dashed border-line p-3 text-sm">
              Este aparelho não tem voz disponível para {bundle.language.name} no modelo “{model.name}”. Os exercícios de
              escuta serão trocados por equivalentes visuais. Veja as opções em Ajustes.
            </p>
          )}
          <button type="button" className="btn btn-primary mt-6 w-full" autoFocus onClick={() => setPhase('playing')}>Começar</button>
          <Link to={`/${lang}`} className="label mt-4 inline-block py-3">voltar ao mapa</Link>
        </div>
      </>
    )
  }

  if (phase === 'done')
    return (
      <Completion
        title={lesson.title} stamp={lesson.kind === 'boss' ? 'passagem lida' : 'lição concluída'}
        result={result} unit={unit} daily={progress.daily} achievements={earned} backTo={`/${lang}`}
      />
    )

  return (
    <SessionPlayer
      screens={screens} index={index} lessonId={lesson.id} startAt={Math.min(session.stepIndex, Math.max(0, screens.length - 1))}
      onStep={(stepIndex, r) => void repo.saveSession({ ...session, stepIndex, results: { correct: r.correct, total: r.total } })}
      onExit={() => navigate(`/${lang}`)}
      onFinish={(r) => {
        setResult((prev) => ({ correct: r.correct, total: r.total, xp: r.xp + prev.xp }))
        setPhase('done')
        void (async () => {
          await repo.completeLesson(lesson.id, lang, r.total ? r.correct / r.total : 1)
          await repo.clearSession(sessionId)
          setEarned(await checkAchievements())
        })()
      }}
    />
  )
}
