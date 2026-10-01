import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import manifestJson from '../../content/audio/manifest.json'
import { getLanguage, indexOf, loadBundle, type ContentIndex } from '../data'
import { AudioEngine } from '../features/audio/engine'
import { DEFAULT_SETTINGS, repo, type ProgressSnapshot } from '../features/progress/repo'
import type { AudioManifest, ContentBundle, LanguageId, PronunciationModel } from '../types/content'
import type { Settings } from '../types/progress'

// ---------- progresso ----------

const ProgressContext = createContext<ProgressSnapshot | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<ProgressSnapshot | null>(null)
  useEffect(() => {
    let alive = true
    const load = () => void repo.snapshot().then((s) => alive && setSnapshot(s))
    load()
    const off = repo.subscribe(load)
    return () => {
      alive = false
      off()
    }
  }, [])

  const settings = snapshot?.profile.settings ?? DEFAULT_SETTINGS
  useEffect(() => {
    const root = document.documentElement
    const dark = settings.theme === 'dark' || (settings.theme === 'auto' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
    root.dataset.theme = dark ? 'dark' : 'light'
    root.dataset.reducedMotion = String(settings.reducedMotion)
    root.style.setProperty('--script-scale', String(settings.textScale))
  }, [settings.theme, settings.reducedMotion, settings.textScale])

  if (!snapshot) return <p className="p-8 text-center text-muted" role="status">Abrindo seu progresso…</p>
  return <ProgressContext.Provider value={snapshot}>{children}</ProgressContext.Provider>
}

export function useProgress(): ProgressSnapshot {
  const s = useContext(ProgressContext)
  if (!s) throw new Error('useProgress fora do ProgressProvider')
  return s
}

export function useSettings(): Settings {
  return useProgress().profile.settings
}

// ---------- áudio ----------

const engine = new AudioEngine(manifestJson as AudioManifest)
const AudioContext = createContext(engine)

export function AudioProvider({ children }: { children: ReactNode }) {
  return <AudioContext.Provider value={engine}>{children}</AudioContext.Provider>
}

/** Motor de áudio + re-renderização a cada mudança de estado (tocando, vozes carregadas…). */
export function useAudio() {
  const e = useContext(AudioContext)
  const [version, setVersion] = useState(0)
  useEffect(() => e.subscribe(() => setVersion((v) => v + 1)), [e])
  return { engine: e, version }
}

export function usePronunciation(languageId: LanguageId): PronunciationModel {
  const settings = useSettings()
  const language = getLanguage(languageId)
  return (
    language.pronunciationModels.find((m) => m.id === settings.pronunciation[languageId]) ??
    language.pronunciationModels.find((m) => m.id === language.defaultPronunciationId)!
  )
}

// ---------- conteúdo ----------

export interface Loaded {
  bundle: ContentBundle
  index: ContentIndex
}

/** Carrega (sob demanda) o conteúdo do idioma. `null` enquanto carrega. */
export function useBundle(languageId: LanguageId): Loaded | null {
  const [bundle, setBundle] = useState<ContentBundle | null>(null)
  useEffect(() => {
    let alive = true
    setBundle(null)
    void loadBundle(languageId).then((b) => alive && setBundle(b))
    return () => {
      alive = false
    }
  }, [languageId])
  // ao trocar de idioma, o pacote antigo ainda está no estado por uma renderização:
  // nunca o entregue como se fosse o do idioma pedido
  return useMemo(() => (bundle && bundle.language.id === languageId ? { bundle, index: indexOf(bundle) } : null), [bundle, languageId])
}

/** true quando o navegador está sem conexão (o app continua funcionando). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('online', cb)
      window.addEventListener('offline', cb)
      return () => {
        window.removeEventListener('online', cb)
        window.removeEventListener('offline', cb)
      }
    },
    () => navigator.onLine,
    () => true,
  )
}
