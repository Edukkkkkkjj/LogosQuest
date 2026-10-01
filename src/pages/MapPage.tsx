import { useId } from 'react'
import { Link } from 'react-router-dom'
import { useCourse } from '../app/LanguageLayout'
import { useProgress } from '../app/providers'
import { ProgressBar } from '../components/Cards'
import { Cine } from '../components/Cine'
import { courseStatus, nextLesson, unitNeedingPractice, type UnitStatus } from '../features/progress/unlock'
import type { LanguageId } from '../types/content'

/**
 * Marco do caminho. Grego: uma coluna dórica; hebraico: um bloco de pedra talhada.
 * Bloqueado = só o contorno tracejado (desenho de projeto); aberto = preenchido de
 * baixo para cima conforme o domínio.
 */
function Marker({ language, status }: { language: LanguageId; status: UnitStatus }) {
  const id = useId()
  const fill = status.unlocked ? Math.max(0.06, Math.min(1, status.mastery / status.unit.masteryThreshold)) : 0
  const shape =
    language === 'greek' ? (
      <>
        <rect x="6" y="4" width="36" height="6" rx="1" />
        <path d="M10 10h28l-3 4H13z" />
        <rect x="13" y="14" width="22" height="52" />
        <rect x="8" y="66" width="32" height="6" rx="1" />
      </>
    ) : (
      <path d="M5 16 12 7l25-2 7 9 1 46-6 9-28 2-6-8z" />
    )
  const detail =
    language === 'greek' ? (
      <path d="M18 16v48M24 16v48M30 16v48" strokeWidth="0.8" opacity="0.5" />
    ) : (
      <path d="M11 26h14M28 38h11M12 50h9M26 58h12" strokeWidth="0.9" opacity="0.5" />
    )
  return (
    <svg viewBox="0 0 48 76" className="h-20 w-12 shrink-0 text-section" aria-hidden="true">
      <defs>
        <clipPath id={id}><rect x="0" y={76 - 76 * fill} width="48" height={76 * fill} /></clipPath>
      </defs>
      <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray={status.unlocked ? undefined : '3 3'} opacity={status.unlocked ? 1 : 0.55}>
        {shape}
      </g>
      <g fill="currentColor" opacity="0.85" clipPath={`url(#${id})`}>{shape}</g>
      <g fill="none" stroke="var(--bg)" clipPath={`url(#${id})`}>{detail}</g>
    </svg>
  )
}

function UnitCard({ status, language }: { status: UnitStatus; language: LanguageId }) {
  const { unit } = status
  const pct = Math.round(status.mastery * 100)
  const need = Math.round(unit.masteryThreshold * 100)
  return (
    <li className="flex gap-4">
      <div className="flex flex-col items-center">
        <Marker language={language} status={status} />
        <span className="w-px flex-1 bg-line" aria-hidden="true" />
      </div>
      <section className={`mb-8 min-w-0 flex-1 rounded-xl border border-line bg-surface p-4 ${status.unlocked ? '' : 'opacity-70'}`} aria-label={unit.title}>
        <p className="label">nível {status.level.number} · {status.level.title}</p>
        <h3 className="mt-1 text-2xl">{unit.title}</h3>
        <p className="mt-1 text-sm text-muted">{unit.summary}</p>

        {status.unlocked ? (
          <>
            <div className="mt-3 flex items-center gap-3">
              <ProgressBar value={status.mastery} label={`Domínio da unidade ${unit.title}`} />
              <span className="shrink-0 text-sm tabular-nums">{pct}%</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {status.passed
                ? `Domínio atingido (mínimo de ${need}%). A próxima unidade está aberta.`
                : `A próxima unidade abre quando você demonstrar ${need}% de domínio destas habilidades.`}
            </p>
            <ol className="mt-3 space-y-2">
              {status.lessons.map((l) => (
                <li key={l.lesson.id}>
                  {l.unlocked ? (
                    <Link to={`licao/${l.lesson.id}`} className="opt">
                      <span className="w-5 shrink-0 text-center text-section" aria-hidden="true">{l.completed ? '✓' : l.lesson.kind === 'boss' ? '◆' : '○'}</span>
                      <span className="min-w-0">
                        <span className="block font-semibold">{l.lesson.title}</span>
                        <span className="block text-sm text-muted">{l.completed ? 'Concluída — rever quando quiser' : l.lesson.goal}</span>
                      </span>
                    </Link>
                  ) : (
                    <div className="opt cursor-not-allowed opacity-60" aria-disabled="true">
                      <span className="w-5 shrink-0 text-center" aria-hidden="true">·</span>
                      <span>
                        <span className="block font-semibold">{l.lesson.title}</span>
                        <span className="block text-sm text-muted">Abre depois da lição anterior</span>
                      </span>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            {status.lessons.some((l) => l.completed) && (
              <Link to={`praticar/${unit.id}`} className="btn mt-3 w-full">Praticar os pontos fracos desta unidade</Link>
            )}
          </>
        ) : (
          <p className="mt-3 text-sm">Abre quando a unidade anterior atingir o domínio mínimo.</p>
        )}
      </section>
    </li>
  )
}

export default function MapPage() {
  const { bundle } = useCourse()
  const progress = useProgress()
  const lang = bundle.language.id
  const units = courseStatus(bundle, progress.mastery, progress.lessons)
  const next = nextLesson(units)
  const practice = unitNeedingPractice(units)
  const planned = bundle.course.levels.filter((l) => l.status === 'planned')
  const started = units.some((u) => u.lessons.some((l) => l.completed))

  return (
    <>
      <Cine mediaId={lang === 'hebrew' ? 'he-world' : 'gr-world'} minHeight="min-h-[26rem]" imageHeight="70%">
        <div className="gridpanel mx-auto max-w-xl text-center">
          <p className="label">{bundle.course.tagline}</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">{bundle.course.title}</h1>
          {next ? (
            <>
              <Link to={`licao/${next.lesson.id}`} className="btn btn-primary mt-5 px-8">{started ? 'Continuar' : 'Começar agora'}</Link>
              <p className="mt-2 text-sm text-[#e7dcc8]">{next.lesson.title} — {next.lesson.goal}</p>
            </>
          ) : practice ? (
            <>
              <Link to={`praticar/${practice.unit.id}`} className="btn btn-primary mt-5 px-8">Praticar para avançar</Link>
              <p className="mt-2 text-sm text-[#e7dcc8]">Falta pouco para abrir a próxima unidade.</p>
            </>
          ) : (
            <Link to="ler" className="btn btn-primary mt-5 px-8">Ler os textos</Link>
          )}
        </div>
      </Cine>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <h2 className="mb-5 text-3xl">O caminho</h2>
        <ol>{units.map((u) => <UnitCard key={u.unit.id} status={u} language={lang} />)}</ol>

        <details className="blueprint rounded-xl border border-dashed border-line p-4">
          <summary className="label cursor-pointer">o caminho adiante · {planned.length} níveis em preparação</summary>
          <p className="mt-3 text-sm">
            Estes níveis fazem parte do plano do curso e ainda não têm lições. Eles aparecem aqui para você enxergar
            aonde o caminho leva.
          </p>
          <ol className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {planned.map((l) => (
              <li key={l.id} className="border-t border-line pt-2">
                <span className="label">nível {l.number}</span>
                <span className="block font-semibold">{l.title}</span>
                <span className="block text-muted">{l.summary}</span>
              </li>
            ))}
          </ol>
        </details>
      </div>
    </>
  )
}
