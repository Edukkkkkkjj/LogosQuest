import { Link } from 'react-router-dom'
import { useCourse } from '../app/LanguageLayout'
import { useProgress } from '../app/providers'
import { ProgressBar } from '../components/Cards'
import { Cine } from '../components/Cine'
import { textCoverage } from '../features/progress/stats'
import { courseStatus, textUnlocked } from '../features/progress/unlock'

const GENRE: Record<string, string> = {
  narrative: 'narrativa', poetry: 'poesia', prayer: 'oração', law: 'instrução', discourse: 'discurso', blessing: 'bênção',
}

/** Trilha "Eu consigo ler": textos reais, cada vez maiores, abertos pelo domínio. */
export default function ReadListPage() {
  const { bundle } = useCourse()
  const progress = useProgress()
  const units = courseStatus(bundle, progress.mastery, progress.lessons)

  return (
    <>
      <Cine mediaId="reading" minHeight="min-h-[26rem]" imageHeight="70%">
        <div className="gridpanel mx-auto max-w-xl text-center">
          <p className="label">a trilha de leitura</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">Eu consigo ler</h1>
          <p className="mt-3 font-display text-xl italic text-[#e7dcc8]">Tolle, lege — “toma e lê”.</p>
          <p className="credit mt-1">Agostinho, Confissões VIII, 12</p>
        </div>
      </Cine>

      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-lg">
          Textos da própria Bíblia, do mais curto ao mais longo. Cada um abre quando você domina o que ele pede — e mostra
          quanto dele você já reconhece.
        </p>
        <ol className="mt-6 space-y-4">
          {bundle.texts.map((t) => {
            const open = textUnlocked(t, units)
            const cov = textCoverage(t, progress.mastery)
            const read = progress.texts.get(t.id)
            const gate = units.find((u) => u.unit.id === t.unlockAfterUnitId)
            const words = t.verses.reduce((n, v) => n + v.words.length, 0)
            const body = (
              <>
                <p className="label">
                  {t.ref} · {GENRE[t.genre]} · {words} palavras{t.isPrayer ? ' · oração inteira' : ''}
                </p>
                <h2 className="mt-1 text-2xl">{t.title}</h2>
                <p className="mt-1 text-sm text-muted">{t.intro}</p>
                {open ? (
                  <div className="mt-3">
                    <ProgressBar value={cov.ratio} label={`Palavras conhecidas em ${t.title}`} />
                    <p className="mt-1 text-sm">
                      Você já conhece <b>{Math.round(cov.ratio * 100)}%</b> das palavras desta passagem
                      {cov.newLexemeIds.length > 0 && ` — ${cov.newLexemeIds.length} ainda são novas`}.
                      {read && ` Lida ${read.reads}×.`}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm">Abre quando você atingir o domínio mínimo da unidade “{gate?.unit.title}”.</p>
                )}
              </>
            )
            return (
              <li key={t.id}>
                {open ? (
                  <Link to={t.id} className="block rounded-xl border border-line bg-surface p-4 transition-colors hover:border-section">{body}</Link>
                ) : (
                  <div className="rounded-xl border border-dashed border-line p-4 opacity-70" aria-disabled="true">{body}</div>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </>
  )
}
