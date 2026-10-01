import { Link } from 'react-router-dom'
import { useCourse } from '../app/LanguageLayout'
import { useProgress } from '../app/providers'
import { ProgressBar } from '../components/Cards'
import { ACHIEVEMENTS } from '../data'
import { diagnose, STATE_LABEL } from '../features/progress/mastery'
import { dayKey, playerLevel, streak, summarize } from '../features/progress/stats'
import { courseStatus, skillMastery } from '../features/progress/unlock'

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <dt className="label">{label}</dt>
      <dd className="mt-1 font-display text-3xl tabular-nums">{value}</dd>
      {note && <dd className="text-xs text-muted">{note}</dd>}
    </div>
  )
}

/** Barras dos últimos 14 dias. A tabela equivalente fica disponível para leitores de tela. */
function DaysChart({ days }: { days: { day: string; exercises: number }[] }) {
  const max = Math.max(1, ...days.map((d) => d.exercises))
  return (
    <figure>
      <svg viewBox="0 0 280 90" className="w-full" role="img" aria-label="Exercícios por dia nos últimos 14 dias">
        {days.map((d, i) => {
          const h = (d.exercises / max) * 64
          return (
            <g key={d.day}>
              <rect x={i * 20 + 3} y={70 - h} width="14" height={Math.max(h, 1.5)} rx="2" fill="var(--section)" opacity={d.exercises ? 0.9 : 0.25} />
              {d.exercises > 0 && <text x={i * 20 + 10} y={66 - h} textAnchor="middle" fontSize="8" fill="var(--muted)">{d.exercises}</text>}
              <text x={i * 20 + 10} y="84" textAnchor="middle" fontSize="8" fill="var(--muted)">{d.day.slice(8)}</text>
            </g>
          )
        })}
      </svg>
      <figcaption className="sr-only">
        {days.map((d) => `${d.day}: ${d.exercises} exercícios`).join('; ')}
      </figcaption>
    </figure>
  )
}

export default function ProfilePage() {
  const { bundle, index } = useCourse()
  const p = useProgress()
  const now = Date.now()
  const lang = bundle.language.id
  const sum = summarize(bundle, p.mastery, now)
  const units = courseStatus(bundle, p.mastery, p.lessons)
  const current = units.filter((u) => u.unlocked).at(-1)
  const lvl = playerLevel(p.profile.xp)
  const totals = p.daily.reduce((a, d) => ({ ex: a.ex + d.exercises, listen: a.listen + d.listeningMs }), { ex: 0, listen: 0 })
  const textsRead = [...p.texts.values()].filter((t) => t.languageId === lang && t.reads > 0).length
  const days = Array.from({ length: 14 }, (_, i) => {
    const day = dayKey(now - (13 - i) * 86_400_000)
    return { day, exercises: p.daily.find((d) => d.day === day)?.exercises ?? 0 }
  })

  const label = (id: string) => {
    const it = index.items.get(id)
    return it ? (it.kind === 'lexeme' ? `${it.lemma} (${it.glosses[0]})` : `${it.display} ${it.name}`) : id
  }
  const troubled = [...new Set([...p.mastery.values()].filter((r) => r.languageId === lang && r.incorrect > 0).sort((a, b) => b.incorrect - a.incorrect).map((r) => r.itemId))]
  const difficulties = troubled.map((id) => diagnose(p.mastery, id, label)).filter((d) => d !== null).slice(0, 5)
  const states = (['learning', 'familiar', 'review', 'mastered'] as const).map((s) => ({ s, n: sum.byState[s] }))
  const stateTotal = Math.max(1, states.reduce((n, x) => n + x.n, 0))
  const earned = new Set(p.achievements.map((a) => a.id))

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <p className="label text-section">seu progresso pessoal</p>
      <h1 className="mt-1 text-4xl">{bundle.language.name}</h1>
      <p className="mt-2 text-muted">
        Nível atual do curso: {current ? `${current.level.number} — ${current.level.title}` : '—'}. Aqui não há ranking: a comparação é só com você mesmo.
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="domínio geral" value={`${Math.round(sum.overall * 100)}%`} note="das habilidades do curso" />
        <Stat label="letras dominadas" value={`${sum.lettersFamiliar}/${sum.lettersTotal}`} />
        <Stat label="palavras aprendidas" value={sum.wordsFamiliar} />
        <Stat label="formas reconhecidas" value={sum.formsRecognized} note="análise morfológica" />
        <Stat label="sequência" value={`${streak(p.daily, now)} d`} note="dias seguidos de estudo" />
        <Stat label="textos lidos" value={textsRead} />
        <Stat label="exercícios" value={totals.ex} note="nos dois idiomas" />
        <Stat label="escuta" value={`${Math.round(totals.listen / 60_000)} min`} note="nos dois idiomas" />
      </dl>

      <section className="mt-8 rounded-xl border border-line bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl">Nível {lvl.level}</h2>
          <span className="text-sm text-muted tabular-nums">{p.profile.xp} XP · faltam {lvl.span - lvl.into}</span>
        </div>
        <div className="mt-2"><ProgressBar value={lvl.into / lvl.span} label="Progresso até o próximo nível" /></div>
      </section>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl">Revisão pendente</h2>
          {sum.dueCount > 0 && <Link to={`/${lang}/revisar`} className="btn btn-primary min-h-11">Revisar {sum.dueCount}</Link>}
        </div>
        <p className="mt-1 text-muted">{sum.dueCount === 0 ? 'Nada vencido. A memória está em dia.' : `${sum.dueCount} itens chegaram à data de revisão.`}</p>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">Últimos 14 dias</h2>
        <div className="mt-3 rounded-xl border border-line bg-surface p-4"><DaysChart days={days} /></div>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">Estado da memória</h2>
        <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-line" role="img" aria-label={states.map((x) => `${STATE_LABEL[x.s]}: ${x.n}`).join(', ')}>
          {states.map((x, i) => (
            <div key={x.s} style={{ width: `${(x.n / stateTotal) * 100}%`, opacity: 0.35 + i * 0.2 }} className="bg-section" />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          {states.map((x) => <li key={x.s}><b className="tabular-nums">{x.n}</b> {STATE_LABEL[x.s]}</li>)}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">Habilidades</h2>
        <ul className="mt-3 space-y-3">
          {bundle.skills.map((s) => {
            const m = skillMastery(s, p.mastery)
            return (
              <li key={s.id}>
                <div className="flex justify-between text-sm"><span>{s.title}</span><span className="tabular-nums">{Math.round(m * 100)}%</span></div>
                <ProgressBar value={m} label={s.title} />
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">Maiores dificuldades</h2>
        {difficulties.length === 0 ? (
          <p className="mt-1 text-muted">Ainda sem erros registrados. Quando houver, eles aparecem aqui como orientação de revisão.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {difficulties.map((d) => <li key={d.itemId} className="rounded-lg border border-line bg-surface p-3" dir="auto">{d.message}</li>)}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-2xl">Conquistas</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => (
            <li key={a.id} className={`rounded-xl border p-3 ${earned.has(a.id) ? 'border-section bg-surface' : 'border-dashed border-line opacity-60'}`}>
              <p className="font-display text-xl"><span aria-hidden="true">{a.icon}</span> {a.title}</p>
              <p className="text-sm text-muted">{a.description}</p>
              <p className="label mt-1">{earned.has(a.id) ? 'conquistada' : 'ainda não'}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
