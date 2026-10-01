import { Link } from 'react-router-dom'
import { ProgressBar } from '../../components/Cards'
import { LANGUAGES, loadBundle } from '../../data'
import { repo } from '../progress/repo'
import { dayKey } from '../progress/stats'
import type { UnitStatus } from '../progress/unlock'
import type { AchievementDef } from '../../types/content'
import type { DailyStats } from '../../types/progress'
import type { SessionResult } from './SessionPlayer'

/** Confere conquistas considerando os textos dos dois idiomas. */
export async function checkAchievements(): Promise<AchievementDef[]> {
  const bundles = await Promise.all(LANGUAGES.map((l) => loadBundle(l.id)))
  const prayerTextIds = new Set(bundles.flatMap((b) => b.texts.filter((t) => t.isPrayer).map((t) => t.id)))
  const kindOf = (id: string) => (id.includes(':letter:') ? 'letter' : id.includes(':lex:') ? 'lexeme' : 'other')
  return repo.checkAchievements({ prayerTextIds, kindOf })
}

/**
 * Fim de sessão. A recompensa é sóbria — um carimbo de catálogo — e as mensagens
 * falam de competência adquirida, não só de pontos.
 */
export function Completion({
  title, stamp, result, unit, daily, achievements, backTo,
}: {
  title: string
  stamp: string
  result: SessionResult
  unit?: UnitStatus
  daily: DailyStats[]
  achievements: AchievementDef[]
  backTo: string
}) {
  const today = daily.find((d) => d.day === dayKey(Date.now()))
  const accuracy = result.total ? Math.round((result.correct / result.total) * 100) : 100
  return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <p className="stamp">{stamp}</p>
      <h1 className="mt-6 text-4xl">{title}</h1>

      <dl className="mt-6 grid grid-cols-3 divide-x divide-line rounded-xl border border-line bg-surface py-4">
        <div><dt className="label">acertos</dt><dd className="font-display text-3xl">{accuracy}%</dd></div>
        <div><dt className="label">exercícios</dt><dd className="font-display text-3xl">{result.total}</dd></div>
        <div><dt className="label">xp</dt><dd className="font-display text-3xl">+{result.xp}</dd></div>
      </dl>

      <ul className="mt-6 space-y-2 text-lg">
        {today && today.newItems > 0 && (
          <li>Você praticou {today.newItems} {today.newItems === 1 ? 'item novo' : 'itens novos'} hoje.</li>
        )}
        {unit && <li>Você já demonstra {Math.round(unit.mastery * 100)}% de domínio das habilidades desta unidade.</li>}
        {result.total > 0 && result.correct < result.total && (
          <li className="text-base text-muted">Os erros de hoje já entraram na sua fila de revisão.</li>
        )}
      </ul>

      {unit && (
        <div className="mt-5 text-start">
          <ProgressBar value={unit.mastery} label="Domínio da unidade" />
          <p className="mt-2 text-sm text-muted">
            {unit.passed
              ? 'Domínio mínimo atingido: a próxima unidade está aberta.'
              : `A próxima unidade abre com ${Math.round(unit.unit.masteryThreshold * 100)}% de domínio. Praticar os pontos fracos é o caminho mais curto.`}
          </p>
        </div>
      )}

      {achievements.length > 0 && (
        <ul className="mt-8 space-y-3">
          {achievements.map((a) => (
            <li key={a.id} className="rise rounded-xl border-2 border-section bg-surface p-4">
              <p className="label text-section">conquista</p>
              <p className="font-display text-2xl"><span aria-hidden="true">{a.icon}</span> {a.title}</p>
              <p className="text-muted">{a.message}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 grid gap-3">
        <Link to={backTo} className="btn btn-primary">Voltar ao mapa</Link>
        {unit && !unit.passed && unit.lessonsDone && <Link to={`${backTo}/praticar/${unit.unit.id}`} className="btn">Praticar os pontos fracos</Link>}
      </div>
    </div>
  )
}
