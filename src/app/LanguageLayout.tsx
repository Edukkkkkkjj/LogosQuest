import { useEffect } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useOutletContext, useParams } from 'react-router-dom'
import { isLanguageId } from '../data'
import { repo } from '../features/progress/repo'
import { dueTargets } from '../features/game/session'
import { useBundle, useOnline, useProgress, type Loaded } from './providers'

const TABS = [
  { to: '', label: 'Mapa', end: true },
  { to: 'ler', label: 'Ler' },
  { to: 'revisar', label: 'Revisar' },
  { to: 'segredos', label: 'Segredos' },
  { to: 'progresso', label: 'Progresso' },
]

/** Moldura de um curso: carrega o conteúdo do idioma e define a cor da seção. */
export function LanguageLayout() {
  const { lang } = useParams()
  const valid = isLanguageId(lang)
  const loaded = useBundle(valid ? lang : 'hebrew')
  const progress = useProgress()
  const online = useOnline()
  // durante uma sessão de estudo a navegação do curso some: menos distração
  const inSession = /\/(licao|praticar|revisar)(\/|$)/.test(useLocation().pathname)

  useEffect(() => {
    if (valid && progress.profile.settings.lastLanguage !== lang) void repo.updateSettings({ lastLanguage: lang })
  }, [valid, lang, progress.profile.settings.lastLanguage])

  if (!valid) return <Navigate to="/" replace />
  const due = dueTargets(progress.mastery, lang, Date.now(), 99).length

  return (
    <div data-section={lang} className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2">
          <Link to="/" className="label shrink-0 py-3" aria-label="Voltar à tela inicial">← início</Link>
          <span className="font-display text-lg text-section">{loaded?.bundle.language.name ?? '…'}</span>
          {!online && <span className="label rounded border border-line px-1.5">offline</span>}
          <Link to="/ajustes" className="label ml-auto py-3">ajustes</Link>
        </div>
        <nav aria-label="Seções do curso" hidden={inSession} className={`mx-auto max-w-5xl overflow-x-auto px-2 ${inSession ? '' : 'flex'}`}>
          {TABS.map((t) => (
            <NavLink
              key={t.to} to={t.to} end={t.end}
              className={({ isActive }) =>
                `label flex-1 whitespace-nowrap border-b-2 px-1.5 py-3 text-center tracking-[0.1em] sm:flex-none sm:px-3 sm:tracking-[0.18em] ${isActive ? 'border-section text-fg' : 'border-transparent'}`
              }
            >
              {t.label}
              {t.to === 'revisar' && due > 0 && <span className="ml-1 rounded-full bg-section px-1.5 text-bg">{due}</span>}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>
        {loaded ? <Outlet context={loaded} /> : <p className="p-8 text-center text-muted" role="status">Carregando o curso…</p>}
      </main>
    </div>
  )
}

export function useCourse(): Loaded {
  return useOutletContext<Loaded>()
}
