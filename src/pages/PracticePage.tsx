import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCourse } from '../app/LanguageLayout'
import { useAudio, useProgress, usePronunciation } from '../app/providers'
import { checkAchievements, Completion } from '../features/game/Completion'
import { SessionPlayer, type SessionResult } from '../features/game/SessionPlayer'
import { buildPracticeScreens, dueTargets, weakestTargets } from '../features/game/session'
import { courseStatus } from '../features/progress/unlock'
import type { AchievementDef } from '../types/content'

const SESSION_SIZE = 12

/** Revisão espaçada (itens vencidos no FSRS) ou prática dos pontos fracos de uma unidade. */
export default function PracticePage({ mode }: { mode: 'review' | 'unit' }) {
  const { unitId } = useParams()
  const { bundle, index } = useCourse()
  const progress = useProgress()
  const navigate = useNavigate()
  const { engine } = useAudio()
  const lang = bundle.language.id
  const model = usePronunciation(lang)
  const [result, setResult] = useState<SessionResult | null>(null)
  const [earned, setEarned] = useState<AchievementDef[]>([])
  const [round, setRound] = useState(0)

  const units = courseStatus(bundle, progress.mastery, progress.lessons)
  const unit = units.find((u) => u.unit.id === unitId)

  // A fila é montada uma vez por rodada, com o estado de memória daquele momento.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const screens = useMemo(() => {
    const targets =
      mode === 'review'
        ? dueTargets(progress.mastery, lang, Date.now(), SESSION_SIZE)
        : weakestTargets(bundle.skills.filter((s) => unit?.unit.skillIds.includes(s.id)).flatMap((s) => s.targets), progress.mastery, SESSION_SIZE)
    return buildPracticeScreens(targets, index, { seed: Date.now() % 1e9, modelId: model.id, audioAvailable: engine.available(model) })
  }, [round, mode, unitId, index])

  if (result)
    return (
      <Completion
        title={mode === 'review' ? 'Revisão feita' : `Prática: ${unit?.unit.title ?? ''}`} stamp={mode === 'review' ? 'memória em dia' : 'prática concluída'}
        result={result} unit={unit} daily={progress.daily} achievements={earned} backTo={`/${lang}`}
      />
    )

  if (screens.length === 0)
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-3xl">{mode === 'review' ? 'Nada para revisar agora' : 'Nada para praticar aqui ainda'}</h1>
        <p className="mt-3 text-muted">
          {mode === 'review'
            ? 'A revisão espaçada traz de volta cada item pouco antes de você esquecê-lo. Quando houver itens vencidos, eles aparecem aqui.'
            : 'Conclua ao menos uma lição desta unidade para liberar a prática.'}
        </p>
        <Link to={`/${lang}`} className="btn btn-primary mt-6">Voltar ao mapa</Link>
      </div>
    )

  return (
    <SessionPlayer
      key={round} screens={screens} index={index}
      onExit={() => navigate(`/${lang}`)}
      onFinish={(r) => {
        setResult(r)
        setRound((n) => n + 1)
        void checkAchievements().then(setEarned)
      }}
    />
  )
}
