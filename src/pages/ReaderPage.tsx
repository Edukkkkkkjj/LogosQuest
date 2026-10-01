import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCourse } from '../app/LanguageLayout'
import { useProgress } from '../app/providers'
import { WindowCard } from '../components/Cards'
import { SOURCES } from '../data'
import { checkAchievements } from '../features/game/Completion'
import { repo } from '../features/progress/repo'
import { textCoverage } from '../features/progress/stats'
import { courseStatus, textUnlocked } from '../features/progress/unlock'
import { TextReader } from '../features/reading/TextReader'
import type { AchievementDef } from '../types/content'
import { SecretCard } from './SecretsPage'

export default function ReaderPage() {
  const { textId } = useParams()
  const { bundle, index } = useCourse()
  const progress = useProgress()
  const lang = bundle.language.id
  const text = bundle.texts.find((t) => t.id === textId)
  const [finished, setFinished] = useState<{ noTranslit: boolean; earned: AchievementDef[] } | null>(null)

  if (!text) return <Navigate to={`/${lang}/ler`} replace />
  if (!textUnlocked(text, courseStatus(bundle, progress.mastery, progress.lessons))) return <Navigate to={`/${lang}/ler`} replace />

  const cov = textCoverage(text, progress.mastery)
  const secrets = bundle.secrets.filter((s) => text.secretIds.includes(s.id))
  const windows = bundle.windows.filter((w) => text.windowIds.includes(w.id))
  const sources = SOURCES.filter((s) => text.sourceIds.includes(s.id))

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <Link to={`/${lang}/ler`} className="label py-3">← todos os textos</Link>
      <p className="label mt-4 text-section">{text.ref}</p>
      <h1 className="mt-1 text-4xl">{text.title}</h1>
      <p className="mt-2 text-lg text-muted">{text.intro}</p>
      <p className="mt-3 rounded-lg bg-section-soft px-3 py-2 text-sm">
        Você já conhece <b>{Math.round(cov.ratio * 100)}%</b> das palavras desta passagem. Toque em qualquer palavra para abrir a ficha dela.
      </p>

      <div className="mt-6">
        <TextReader
          text={text} index={index}
          onFinish={(noTranslit) => {
            void (async () => {
              await repo.recordTextRead(text.id, lang, noTranslit)
              setFinished({ noTranslit, earned: await checkAchievements() })
            })()
          }}
        />
      </div>

      {finished && (
        <div className="rise mt-8 rounded-xl border-2 border-section bg-surface p-6 text-center" role="status">
          <p className="stamp">leitura registrada</p>
          <p className="mt-4 font-display text-2xl">
            {finished.noTranslit ? 'Você leu esta passagem sem transliteração.' : `Você leu ${text.ref} no idioma original.`}
          </p>
          {finished.earned.map((a) => <p key={a.id} className="mt-2 text-muted">{a.icon} {a.title}: {a.message}</p>)}
        </div>
      )}

      {secrets.length > 0 && (
        <section className="mt-12">
          <h2 className="text-3xl">Segredos do texto</h2>
          <p className="mt-1 text-muted">O que este trecho tem no original e que uma tradução dificilmente mostra.</p>
          <div className="mt-4 space-y-6">{secrets.map((s) => <SecretCard key={s.id} secret={s} language={lang} />)}</div>
        </section>
      )}

      {windows.length > 0 && (
        <section className="mt-12">
          <h2 className="text-3xl">Abra a janela</h2>
          <p className="mt-1 text-muted">O mundo em que estas palavras foram escritas.</p>
          <div className="mt-4 space-y-4">{windows.map((w) => <WindowCard key={w.id} w={w} />)}</div>
        </section>
      )}

      <footer className="mt-12 border-t border-line pt-4 text-xs text-muted">
        <p className="label mb-1">fontes deste texto</p>
        {sources.map((s) => <p key={s.id}>{s.attribution ?? s.name}</p>)}
        <p>Tradução de trabalho e glosas: escritas para este aplicativo.</p>
      </footer>
    </article>
  )
}
